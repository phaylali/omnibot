/**
 * =============================================================================
 * /help COMMAND
 * Lists all available commands with their descriptions.
 * Reads directly from the client's command collection, so it stays
 * in sync automatically when new commands are added.
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show all available commands")
  .setIntegrationTypes(0, 1)
  .setContexts(0, 1, 2);

export async function execute(interaction: ChatInputCommandInteraction) {
  const commands = interaction.client.commands;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📋 Commands")
    .setDescription(
      commands
        .map((cmd) => `**/${cmd.data.name}** — ${cmd.data.description}`)
        .join("\n"),
    )
    .setFooter({
      text: `${commands.size} command${commands.size !== 1 ? "s" : ""} total`,
    });

  await interaction.reply({ embeds: [embed] });
}
