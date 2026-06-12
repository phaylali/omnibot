/**
 * =============================================================================
 * /flip COMMAND
 * Guess heads or tails! The bot flips a coin and tells you if you won.
 *
 * Flow:
 *   1. Bot shows Heads / Tails buttons
 *   2. User clicks one → bot reveals result + win/loss + play-again buttons
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("flip")
  .setDescription("Guess heads or tails and see if you win!")
  .setIntegrationTypes(0, 1)
  .setContexts(0, 1, 2);

export async function execute(interaction: ChatInputCommandInteraction) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("flip_heads")
      .setLabel("Heads")
      .setEmoji("🪙")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("flip_tails")
      .setLabel("Tails")
      .setEmoji("🪙")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: "**🪙 Flip a coin!**\nPick **Heads** or **Tails**:",
    components: [row],
  });
}
