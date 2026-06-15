import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getXp, getLevelProgress, xpForLevel } from "../lib/xpStore.ts";

export const data = new SlashCommandBuilder()
  .setName("xp")
  .setDescription("Check your XP or another user's XP")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to check (leave empty for yourself)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "XP is only tracked in servers." });
    return;
  }

  if (target.bot) {
    await interaction.reply({ content: "Bots don't earn XP." });
    return;
  }

  const data = await getXp(guildId, target.id);
  const xp = data?.xp ?? 0;
  const progress = getLevelProgress(xp);

  const barLength = 12;
  const filled = Math.round(progress.progress * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

  const embed = new EmbedBuilder()
    .setColor(target.accentColor ?? 0x5865f2)
    .setAuthor({
      name: target.globalName || target.username,
      iconURL: target.displayAvatarURL(),
    })
    .setDescription(`**Level ${progress.level}**`)
    .addFields(
      {
        name: "XP",
        value: `${xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()}`,
        inline: false,
      },
      { name: "Progress", value: `\`${bar}\` ${Math.round(progress.progress * 100)}%`, inline: false },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
