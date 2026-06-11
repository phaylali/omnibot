/**
 * =============================================================================
 * COMMAND DEPLOYMENT SCRIPT
 * Standalone script to register or update slash commands with Discord.
 *
 * Run:  bun run deploy
 *
 * This sends a PUT to Discord's bulk overwrite endpoint, replacing ALL
 * registered commands with whatever is in commands/_index.ts.
 *
 * Notes:
 *   • If GUILD_ID is set in .env, commands are scoped to that guild (instant).
 *   • Without GUILD_ID, commands are global (up to 1 hour to propagate).
 *   • Existing commands NOT in the new list will be DELETED.
 * =============================================================================
 */

import { REST, Routes } from "discord.js";
import { APP_ID, GUILD_ID, DISCORD_TOKEN } from "./config.ts";
import { logger } from "./lib/logger.ts";
import { commandList } from "./commands/_index.ts";

async function deployCommands(): Promise<void> {
  if (!APP_ID) {
    logger.error("APP_ID is not set. Add it to your .env file.");
    process.exit(1);
  }

  if (!DISCORD_TOKEN) {
    logger.error("DISCORD_TOKEN is not set. Add it to your .env file.");
    process.exit(1);
  }

  // Convert command data objects to JSON for the REST API
  const commandsJson = commandList.map((cmd) => cmd.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  // Guild-scoped commands update instantly — ideal for development.
  // Global commands can take up to 1 hour to cache across Discord.
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(APP_ID, GUILD_ID)
    : Routes.applicationCommands(APP_ID);

  const scope = GUILD_ID ? `guild ${GUILD_ID}` : "globally";

  logger.info(`Registering ${commandsJson.length} commands ${scope}...`);

  try {
    // PUT replaces all existing commands with the new set
    const result = (await rest.put(route, {
      body: commandsJson,
    })) as unknown[];

    logger.info(`✅ Successfully registered ${result.length} commands ${scope}`);
  } catch (error) {
    logger.error(`Failed to register commands: ${error}`);
    process.exit(1);
  }
}

await deployCommands();
