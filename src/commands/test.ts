/**
 * =============================================================================
 * /test COMMAND
 * A simple sanity check — replies with "hello world" and a random emoji.
 * Useful for verifying the bot is online and responding to interactions.
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { getRandomEmoji } from "../utils/helpers.ts";

/** Command definition: name, description, and contexts where it can run */
export const data = new SlashCommandBuilder()
  .setName("test")
  .setDescription("Check if the bot is working")
  .setIntegrationTypes(0, 1)  // 0 = Guild install, 1 = User install
  .setContexts(0, 1, 2);      // 0 = Guild, 1 = Bot DM, 2 = Group DM

/** Handler — runs when a user executes /test */
export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    content: `hello world ${getRandomEmoji()}`,
  });
}
