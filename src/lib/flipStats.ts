/**
 * =============================================================================
 * FLIP STATS STORE
 * Per-guild leaderboard data stored in data/<guildId>/flips.json.
 *
 * Each guild has its own leaderboard so scores don't mix across servers.
 * =============================================================================
 */

import { guildRead, guildWrite } from "./store.ts";

interface UserStats {
  username: string;
  wins: number;
  losses: number;
}

type StatsMap = Record<string, UserStats>;

const STATS_FILE = "flips.json";
const EMPTY: StatsMap = {};

/**
 * Record one flip result for a user in a specific guild.
 */
export async function recordFlip(
  guildId: string,
  userId: string,
  username: string,
  won: boolean,
): Promise<void> {
  const stats = await guildRead<StatsMap>(guildId, STATS_FILE, EMPTY);

  if (!stats[userId]) {
    stats[userId] = { username, wins: 0, losses: 0 };
  }

  stats[userId].username = username;
  if (won) stats[userId].wins++;
  else stats[userId].losses++;

  await guildWrite(guildId, STATS_FILE, stats);
}

/**
 * Returns the leaderboard for a guild, sorted by win rate descending.
 */
export async function getLeaderboard(
  guildId: string,
): Promise<(UserStats & { userId: string; total: number; winRate: number })[]> {
  const stats = await guildRead<StatsMap>(guildId, STATS_FILE, EMPTY);

  return Object.entries(stats)
    .map(([userId, s]) => {
      const total = s.wins + s.losses;
      return {
        userId,
        ...s,
        total,
        winRate: total > 0 ? (s.wins / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

/**
 * Returns the top N entries from a guild's leaderboard.
 */
export async function getTopN(
  guildId: string,
  n: number,
): Promise<ReturnType<typeof getLeaderboard> extends Promise<infer T> ? T : never> {
  const board = await getLeaderboard(guildId);
  return board.slice(0, n) as any;
}
