/**
 * =============================================================================
 * GUILD CONFIG STORE
 * Per-guild bot settings stored in data/<guildId>/config.json.
 *
 * Currently stores:
 *   - defaultChannelId: channel where the bot posts online notifications
 *
 * Add new fields here as the bot gains more per-guild configuration options.
 * =============================================================================
 */

import { guildRead, guildWrite, listGuilds } from "./store.ts";

/** Shape of each guild's config file */
export interface GuildConfig {
  /** Channel ID where the bot posts online/status messages */
  defaultChannelId: string | null;
}

const CONFIG_FILE = "config.json";
const DEFAULT_CONFIG: GuildConfig = { defaultChannelId: null };

/**
 * Gets the config for a specific guild.
 * Returns defaults if nothing is configured.
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return guildRead(guildId, CONFIG_FILE, DEFAULT_CONFIG);
}

/**
 * Sets the default notification channel for a guild.
 * Pass null to clear the setting.
 */
export async function setDefaultChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.defaultChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

/**
 * Returns all guilds that have a default channel configured,
 * along with their channel ID. Used by the ready event.
 */
export async function getAllConfiguredGuilds(): Promise<
  { guildId: string; channelId: string }[]
> {
  const guildIds = await listGuilds();
  const result: { guildId: string; channelId: string }[] = [];

  for (const guildId of guildIds) {
    const config = await getGuildConfig(guildId);
    if (config.defaultChannelId) {
      result.push({ guildId, channelId: config.defaultChannelId });
    }
  }

  return result;
}
