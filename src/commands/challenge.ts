/**
 * =============================================================================
 * /challenge COMMAND
 * Start a Rock-Paper-Scissors game! The user picks an object, then anyone
 * in the channel can click "Accept" to play against them.
 *
 * Game flow:
 *   1. User runs /challenge rock  →  challenge message with buttons
 *   2. Someone clicks "Accept"    →  ephemeral select menu to pick their object
 *   3. They pick → results calculated → original message updated with winner
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { rpsGame } from "../games/rps.ts";

/** Command definition with a required string option for the game object */
export const data = new SlashCommandBuilder()
  .setName("challenge")
  .setDescription("Challenge someone to Rock, Paper, Scissors!")
  .setIntegrationTypes(0, 1)
  .setContexts(0, 2) // guild + bot DM only (group DMs would be confusing)
  .addStringOption((option) =>
    option
      .setName("object")
      .setDescription("Pick your object")
      .setRequired(true)
      .addChoices(
        { name: "Rock", value: "rock" },
        { name: "Paper", value: "paper" },
        { name: "Scissors", value: "scissors" },
        { name: "Cowboy", value: "cowboy" },
        { name: "Virus", value: "virus" },
        { name: "Computer", value: "computer" },
        { name: "Wumpus", value: "wumpus" },
      ),
  );

/** Handler — starts a new game and posts the challenge message */
export async function execute(interaction: ChatInputCommandInteraction) {
  const chosenObject = interaction.options.getString("object", true);

  // Register the game in the shared game state
  rpsGame.createGame(interaction.channelId, {
    id: interaction.user.id,
    objectName: chosenObject,
    interaction,
  });

  // Build the challenge message with Accept / Cancel buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("rps_accept")
      .setLabel("Accept Challenge")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("rps_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.reply({
    content:
      `**${interaction.user.globalName || interaction.user.username}** challenges you to a game!\n` +
      `They already picked their object — click **Accept** to choose yours.`,
    components: [row],
  });
}
