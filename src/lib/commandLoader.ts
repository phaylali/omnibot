/**
 * =============================================================================
 * COMMAND LOADER
 * Iterates through the command index and registers each command's
 * SlashCommandBuilder data into the Client's command Collection.
 *
 * This separates "what commands exist" (commands/_index.ts) from
 * "how commands are loaded" (this file).
 * =============================================================================
 */

import { Client, Collection } from "discord.js";
import type { Command } from "../types.ts";
import { commandList } from "../commands/_index.ts";
import { logger } from "./logger.ts";

/**
 * Loads all command modules into the client.
 * Must be called before client.login().
 *
 * @param client - The Discord.js client instance
 */
export function loadCommands(client: Client): void {
  const commands = new Collection<string, Command>();

  for (const command of commandList) {
    commands.set(command.data.name, command);
    logger.debug(`Loaded command: /${command.data.name}`);
  }

  client.commands = commands;
  logger.info(`Loaded ${commands.size} commands`);
}
