import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { formatDate } from "../utils/helpers.ts";

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Get info about a Discord user")
  .setIntegrationTypes(0, 1)
  .setContexts(0, 1, 2)
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to look up (leave empty for yourself)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user") ?? interaction.user;

  const member = interaction.guild
    ? await interaction.guild.members.fetch(target.id).catch(() => null)
    : null;

  const embed = new EmbedBuilder()
    .setColor(target.accentColor ?? 0x5865f2)
    .setAuthor({
      name: target.globalName || target.username,
      iconURL: target.displayAvatarURL(),
    })
    .setThumbnail(target.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: "Username", value: target.username, inline: true },
      { name: "ID", value: target.id, inline: true },
      { name: "Bot", value: target.bot ? "Yes 🤖" : "No", inline: true },
      { name: "Account Created", value: formatDate(target.createdAt), inline: true },
      { name: "Joined Server", value: member?.joinedAt ? formatDate(member.joinedAt) : "N/A", inline: true },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp();

  const banner = target.bannerURL({ size: 1024 });
  if (banner) embed.setImage(banner);

  await interaction.reply({ embeds: [embed] });
}
