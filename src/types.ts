/**
 * =============================================================================
 * SHARED TYPES
 * TypeScript interfaces and types used across the bot.
 * =============================================================================
 */

import type {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  Collection,
} from "discord.js";

/**
 * A command module.
 * Every command file in src/commands/ must export data + execute.
 */
export interface Command {
  /** The command definition (name, description, options, etc.) */
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  /** Function that runs when a user invokes this command */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Augment the discord.js Client with custom properties.
 * This lets us do `client.commands.get("name")` with full type safety.
 */
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}
