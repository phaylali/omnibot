/**
 * =============================================================================
 * GUILD-SCOPED DATA STORE
 * Generic helper for reading/writing JSON files per guild.
 *
 * Structure: data/<guildId>/<filename>
 *
 * Example:
 *   data/123456789/config.json   → { defaultChannelId: "..." }
 *   data/123456789/flips.json    → { userId: { wins, losses } }
 *
 * Each guild gets its own subdirectory so data is cleanly separated
 * across servers — easy to back up, reset, or migrate per guild.
 * =============================================================================
 */

import { mkdir } from "node:fs/promises";
import { logger } from "./logger.ts";

const DATA_ROOT = "data";

/**
 * Returns the directory path for a guild.
 */
function guildDir(guildId: string): string {
  return `${DATA_ROOT}/${guildId}`;
}

/**
 * Reads a JSON file from a guild's data directory.
 * Returns the default value if the file doesn't exist yet.
 *
 * @param guildId - Discord guild (server) ID
 * @param filename - File name within the guild's directory (e.g., "config.json")
 * @param fallback - Default value if file doesn't exist
 */
export async function guildRead<T>(
  guildId: string,
  filename: string,
  fallback: T,
): Promise<T> {
  try {
    const file = Bun.file(`${guildDir(guildId)}/${filename}`);
    if (await file.exists()) {
      return (await file.json()) as T;
    }
  } catch (err) {
    logger.warn(`Failed to read data/${guildId}/${filename}: ${err}`);
  }
  return fallback;
}

/**
 * Writes a JSON file to a guild's data directory.
 * Creates the directory if it doesn't exist.
 *
 * @param guildId - Discord guild (server) ID
 * @param filename - File name within the guild's directory
 * @param data - The data to serialize and write
 */
export async function guildWrite<T>(
  guildId: string,
  filename: string,
  data: T,
): Promise<void> {
  try {
    const dir = guildDir(guildId);
    // Ensure the guild's data directory exists
    await mkdir(dir, { recursive: true });
    await Bun.write(`${dir}/${filename}`, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error(`Failed to write data/${guildId}/${filename}: ${err}`);
  }
}

/**
 * Scans the data directory and returns all guild IDs that have a subdirectory.
 * Used by the ready event to find which guilds have config stored.
 */
export async function listGuilds(): Promise<string[]> {
  try {
    const dir = Bun.file(DATA_ROOT);
    if (!(await dir.exists())) return [];

    const entries: string[] = [];
    for await (const entry of dir.readable()) {
      entries.push(entry);
    }

    return entries;
  } catch {
    return [];
  }
}
