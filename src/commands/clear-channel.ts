import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { logger } from "../lib/logger.ts";

export const data = new SlashCommandBuilder()
  .setName("clear-channel")
  .setDescription("Delete all messages in the current channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: "❌ This command can only be used in a text channel.", flags: "Ephemeral" });
    return;
  }

  await interaction.deferReply({ flags: "Ephemeral" });

  let deleted = 0;

  try {
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100 });
      if (messages.size === 0) break;

      const result = await channel.bulkDelete(messages, true);
      deleted += result.size;

      if (result.size < messages.size) break;
    }
  } catch (err) {
    logger.error(`/clear-channel error in guild ${interaction.guildId}: ${err}`);
    await interaction.editReply({ content: `❌ Failed to clear the channel. Deleted **${deleted}** messages before hitting an error.` });
    return;
  }

  logger.info(`/clear-channel deleted ${deleted} messages in guild ${interaction.guildId} (#${(channel as any).name})`);
  await interaction.editReply({ content: `✅ Deleted **${deleted}** messages from this channel.` });
}
