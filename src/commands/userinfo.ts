/**
 * =============================================================================
 * /userinfo COMMAND
 * Shows Discord account information for a user.
 * If no user is specified, shows info about the command author.
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { formatDate } from "../utils/helpers.ts";

/** Command definition with an optional user option */
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

/** Handler — fetches and displays user info */
export async function execute(interaction: ChatInputCommandInteraction) {
  // If no user was passed, default to the command author
  const target = interaction.options.getUser("user") ?? interaction.user;

  // Try to fetch guild member data (only works in guilds)
  const member = interaction.guild
    ? await interaction.guild.members.fetch(target.id).catch(() => null)
    : null;

  const joinedServer = member?.joinedAt ? formatDate(member.joinedAt) : "N/A";
  const accountCreated = formatDate(target.createdAt);

  await interaction.reply({
    content:
      `**${target.globalName || target.username}**\`${target.id}\`\n` +
      `┌ **Username:** ${target.username}\n` +
      `├ **Account Created:** ${accountCreated}\n` +
      `├ **Joined Server:** ${joinedServer}\n` +
      `└ **Bot:** ${target.bot ? "Yes 🤖" : "No"}`,
  });
}
