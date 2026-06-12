/**
 * =============================================================================
 * FLIP STATS STORE
 * Tracks wins/losses per user for the /flip guessing game.
 * Persists to data/flipStats.json.
 * =============================================================================
 */

import { logger } from "./logger.ts";

interface UserStats {
  username: string;
  wins: number;
  losses: number;
}

const STATS_PATH = "data/flipStats.json";

let cache: Record<string, UserStats> = {};
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const file = Bun.file(STATS_PATH);
    cache = (await file.exists()) ? await file.json() : {};
  } catch {
    cache = {};
  }
  loaded = true;
}

async function persist(): Promise<void> {
  try {
    await Bun.write(STATS_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    logger.error(`Failed to save flip stats: ${err}`);
  }
}

/**
 * Record one flip result for a user.
 * Creates the entry if it doesn't exist yet.
 */
export async function recordFlip(
  userId: string,
  username: string,
  won: boolean,
): Promise<void> {
  await ensureLoaded();

  if (!cache[userId]) {
    cache[userId] = { username, wins: 0, losses: 0 };
  }

  cache[userId].username = username; // keep display name current
  if (won) cache[userId].wins++;
  else cache[userId].losses++;

  await persist();
}

/**
 * Returns all users sorted by win rate descending.
 * Only includes users with at least one flip.
 */
export async function getLeaderboard(): Promise<
  (UserStats & { userId: string; total: number; winRate: number })[]
> {
  await ensureLoaded();

  return Object.entries(cache)
    .map(([userId, s]) => ({
      userId,
      ...s,
      total: s.wins + s.losses,
      winRate: s.total > 0 ? s.wins / s.total : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

/**
 * Returns the top N entries from the leaderboard.
 */
export async function getTopN(
  n: number,
): Promise<ReturnType<typeof getLeaderboard> extends Promise<infer T> ? T : never> {
  const board = await getLeaderboard();
  return board.slice(0, n) as any;
}
