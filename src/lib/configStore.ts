/**
 * =============================================================================
 * GUILD CONFIG STORE
 * Reads and writes per-guild configuration to a JSON file.
 *
 * This is a simple file-based store (no database dependency).
 * Data is saved to data/guildConfigs.json and cached in memory.
 * =============================================================================
 */

import { logger } from "./logger.ts";

/** Shape of each guild's config */
interface GuildConfig {
  /** Channel ID where the bot posts online/status messages */
  defaultChannelId: string | null;
}

/** Path to the config file (relative to project root) */
const CONFIG_PATH = "data/guildConfigs.json";

/** In-memory cache of all guild configs */
let cache: Record<string, GuildConfig> = {};
let loaded = false;

/**
 * Ensures the config file is read into memory.
 * Called lazily on first access.
 */
async function ensureLoaded(): Promise<void> {
  if (loaded) return;

  try {
    const file = Bun.file(CONFIG_PATH);
    const exists = await file.exists();
    if (exists) {
      cache = await file.json();
    } else {
      cache = {};
    }
  } catch (err) {
    logger.warn(`Could not load guild configs: ${err}`);
    cache = {};
  }

  loaded = true;
}

/**
 * Writes the in-memory cache to disk.
 * Called after every mutation.
 */
async function persist(): Promise<void> {
  try {
    await Bun.write(CONFIG_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    logger.error(`Failed to save guild configs: ${err}`);
  }
}

/**
 * Gets the config for a specific guild.
 * Returns default values if nothing is configured yet.
 *
 * @param guildId - The Discord guild (server) ID
 * @returns The guild's config object
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  await ensureLoaded();
  return cache[guildId] ?? { defaultChannelId: null };
}

/**
 * Sets the default channel for a guild.
 * The bot will post online notifications to this channel.
 *
 * @param guildId - The Discord guild ID
 * @param channelId - The channel ID to set (or null to clear)
 */
export async function setDefaultChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  await ensureLoaded();

  if (!cache[guildId]) {
    cache[guildId] = { defaultChannelId: null };
  }

  cache[guildId].defaultChannelId = channelId;
  await persist();
}

/**
 * Returns all guild IDs that have a default channel configured.
 * Used by the ready event to send online notifications.
 */
export async function getAllConfiguredGuilds(): Promise<
  { guildId: string; channelId: string }[]
> {
  await ensureLoaded();

  return Object.entries(cache)
    .filter(([, config]) => config.defaultChannelId !== null)
    .map(([guildId, config]) => ({
      guildId,
      channelId: config.defaultChannelId!,
    }));
}
