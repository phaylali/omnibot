import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getLeaderboard } from "../lib/xpStore.ts";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the server XP leaderboard");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Leaderboard is only available in servers." });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "Could not resolve guild." });
    return;
  }

  await guild.members.fetch();
  let board = await getLeaderboard(guildId, 20);

  board = board.filter((u) => {
    const member = guild.members.cache.get(u.userId);
    return member && !member.user.bot;
  }).slice(0, 10);

  if (board.length === 0) {
    await interaction.reply({ content: "No XP earned yet. Start chatting!" });
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = board.map((u, i) =>
    `${medals[i] ?? `#${i + 1}`} <@${u.userId}> — Level ${u.level} (${u.xp.toLocaleString()} XP)`,
  );

  const embed = new EmbedBuilder()
    .setColor(0xf5c542)
    .setTitle("🏆 XP Leaderboard")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${board.length} players ranked` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
