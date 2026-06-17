import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  Message,
} from "discord.js";
import { logger } from "../lib/logger.ts";
import { getCopiedIds, markCopied } from "../lib/relayStore.ts";

export const data = new SlashCommandBuilder()
  .setName("relay")
  .setDescription("Copy all messages from one channel to another (one-time, deduplicated)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setDMPermission(false)
  .addChannelOption((o) =>
    o.setName("source").setDescription("Channel to copy messages from").setRequired(true),
  )
  .addChannelOption((o) =>
    o.setName("target").setDescription("Channel to copy messages into").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const guildId = interaction.guildId!;

  const source = interaction.options.getChannel("source", true);
  const target = interaction.options.getChannel("target", true);

  if (source.id === target.id) {
    await interaction.reply({ content: "❌ Source and target must be different channels.", flags: "Ephemeral" });
    return;
  }

  if (!source.isTextBased() || source.type === ChannelType.GuildVoice) {
    await interaction.reply({ content: "❌ Source channel must be a text channel.", flags: "Ephemeral" });
    return;
  }
  if (!target.isTextBased() || target.type === ChannelType.GuildVoice) {
    await interaction.reply({ content: "❌ Target channel must be a text channel.", flags: "Ephemeral" });
    return;
  }

  await interaction.deferReply();

  // Fetch all messages from source (newest-first batches of 100)
  const allMessages: Message[] = [];
  let lastId: string | undefined;

  await interaction.editReply({ content: "🔍 Fetching messages..." });

  try {
    while (true) {
      const opts: { limit: number; before?: string } = { limit: 100 };
      if (lastId) opts.before = lastId;
      const batch = await source.messages.fetch(opts);
      if (batch.size === 0) break;
      allMessages.push(...batch.values());
      lastId = batch.last()!.id;
    }
  } catch (err) {
    logger.error(`Relay fetch error in guild ${guildId}: ${err}`);
    await interaction.editReply({ content: "❌ Failed to fetch messages. Check bot permissions on the source channel." });
    return;
  }

  if (allMessages.length === 0) {
    await interaction.editReply({ content: "📭 No messages to copy." });
    return;
  }

  // Oldest-first for chronological order
  allMessages.reverse();

  // Load dedup set
  const copiedIds = await getCopiedIds(guildId, source.id);
  const toCopy = allMessages.filter((m) => !copiedIds.has(m.id));

  if (toCopy.length === 0) {
    await interaction.editReply({ content: `✅ All ${allMessages.length} messages have already been copied.` });
    return;
  }

  let copied = 0;
  const total = toCopy.length;
  let lastProgressUpdate = 0;
  let replied = false;

  await interaction.editReply({ content: `📨 Copying ${total} new messages to ${target}...` });

  for (const msg of toCopy) {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: msg.author.displayName,
        iconURL: msg.author.displayAvatarURL(),
      })
      .setDescription(msg.content ? truncate(msg.content, 4096) : "*no text content*")
      .setTimestamp(msg.createdAt)
      .setFooter({ text: `From #${source.name}` })
      .setColor(msg.member?.displayColor ?? 0x2b2d31);

    if (msg.attachments.size > 0) {
      const links = msg.attachments.map((a) => `[${a.name}](${a.url})`).join("\n");
      embed.addFields({ name: "Attachments", value: truncate(links, 1024) });
    }

    try {
      await target.send({ embeds: [embed] });
    } catch {
      // skip messages that can't be sent
    }

    await markCopied(guildId, source.id, msg.id);
    copied++;

    // Update progress every 10 messages
    if (copied - lastProgressUpdate >= 10 || copied === total) {
      lastProgressUpdate = copied;
      const pct = Math.round((copied / total) * 100);
      try {
        await interaction.editReply({ content: `📨 Copying ${copied}/${total} (${pct}%) to ${target}...` });
      } catch {
        if (!replied) {
          await interaction.followUp({ content: `📨 Copying ${copied}/${total} (${pct}%) to ${target}...` });
          replied = true;
        }
      }
    }
  }

  logger.info(`/relay copied ${copied}/${total} messages from #${source.name} to #${target.name} in guild ${guildId}`);

  try {
    await interaction.editReply({ content: `✅ Done. Copied **${copied}** message${copied > 1 ? "s" : ""} from ${source} to ${target}.` });
  } catch {
    await interaction.followUp({ content: `✅ Done. Copied **${copied}** message${copied > 1 ? "s" : ""} from ${source} to ${target}.` });
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
