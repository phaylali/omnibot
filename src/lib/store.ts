/**
 * =============================================================================
 * DATA STORE
 * Generic helpers for reading/writing JSON files, both per-guild and global.
 *
 * Guild-scoped:  data/<guildId>/<filename>
 * Global:        data/global/<filename>
 *
 * Guild data is separated per server. Global data is shared across all servers.
 * =============================================================================
 */

import { mkdir, readdir } from "node:fs/promises";
import { logger } from "./logger.ts";

const DATA_ROOT = "data";

// ───── Path helpers ─────

function guildDir(guildId: string): string {
  return `${DATA_ROOT}/${guildId}`;
}

function globalDir(): string {
  return `${DATA_ROOT}/global`;
}

/** Ensures a directory exists */
async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Reads JSON from a file, returns fallback on any error */
async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return (await file.json()) as T;
    }
  } catch (err) {
    logger.warn(`Failed to read ${filePath}: ${err}`);
  }
  return fallback;
}

/** Writes JSON to a file, creating the directory first */
async function writeJson<T>(filePath: string, data: T): Promise<void> {
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    await ensureDir(dir);
    await Bun.write(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error(`Failed to write ${filePath}: ${err}`);
  }
}

// ───── Guild-scoped helpers ─────

/**
 * Reads a JSON file from a guild's data directory.
 * Returns the fallback value if the file doesn't exist.
 */
export async function guildRead<T>(
  guildId: string,
  filename: string,
  fallback: T,
): Promise<T> {
  return readJson(`${guildDir(guildId)}/${filename}`, fallback);
}

/**
 * Writes a JSON file to a guild's data directory.
 * Creates the directory if it doesn't exist.
 */
export async function guildWrite<T>(
  guildId: string,
  filename: string,
  data: T,
): Promise<void> {
  await writeJson(`${guildDir(guildId)}/${filename}`, data);
}

/**
 * Lists all guild subdirectories in the data folder.
 * Skips "global" and any files (only returns directories).
 */
export async function listGuilds(): Promise<string[]> {
  try {
    await ensureDir(DATA_ROOT);
    const entries = await readdir(DATA_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== "global")
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// ───── Global helpers ─────

/**
 * Reads a JSON file from the global data directory.
 * Useful for cross-server data like ban lists, bot-wide stats, etc.
 */
export async function globalRead<T>(
  filename: string,
  fallback: T,
): Promise<T> {
  return readJson(`${globalDir()}/${filename}`, fallback);
}

/**
 * Writes a JSON file to the global data directory.
 */
export async function globalWrite<T>(
  filename: string,
  data: T,
): Promise<void> {
  await writeJson(`${globalDir()}/${filename}`, data);
}
