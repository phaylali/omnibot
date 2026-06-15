import { guildRead, guildWrite } from "./store.ts";

interface XpUser {
  username: string;
  xp: number;
  lastMsgCooldown: number;
}

type XpMap = Record<string, XpUser>;

const XP_FILE = "xp.json";
const EMPTY: XpMap = {};
const COOLDOWN_MS = 30_000;
const XP_MIN = 15;
const XP_MAX = 25;
const BONUS_LENGTH = 100;
const BONUS_XP = 10;

export function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

export function levelFromXp(xp: number): number {
  return Math.floor((-1 + Math.sqrt(1 + 0.08 * xp)) / 2);
}

export function getLevelProgress(xp: number): { level: number; currentXp: number; neededXp: number; progress: number } {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    currentXp: xp - current,
    neededXp: next - current,
    progress: next > current ? (xp - current) / (next - current) : 1,
  };
}

export async function addMessageXp(
  guildId: string,
  userId: string,
  username: string,
  content: string,
): Promise<{ xpGained: number; oldLevel: number; newLevel: number } | null> {
  const stats = await guildRead<XpMap>(guildId, XP_FILE, EMPTY);

  const now = Date.now();
  const user = stats[userId];

  if (user && now - user.lastMsgCooldown < COOLDOWN_MS) {
    return null;
  }

  let gained = XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
  if (content.length > BONUS_LENGTH) gained += BONUS_XP;

  const oldXp = user?.xp ?? 0;
  const oldLevel = levelFromXp(oldXp);

  stats[userId] = {
    username,
    xp: oldXp + gained,
    lastMsgCooldown: now,
  };

  await guildWrite(guildId, XP_FILE, stats);

  const newLevel = levelFromXp(stats[userId].xp);

  return { xpGained: gained, oldLevel, newLevel };
}

export async function getXp(
  guildId: string,
  userId: string,
): Promise<XpUser | null> {
  const stats = await guildRead<XpMap>(guildId, XP_FILE, EMPTY);
  return stats[userId] ?? null;
}

export async function getLeaderboard(
  guildId: string,
  limit = 10,
): Promise<(XpUser & { userId: string; level: number })[]> {
  const stats = await guildRead<XpMap>(guildId, XP_FILE, EMPTY);
  return Object.entries(stats)
    .map(([userId, u]) => ({ userId, ...u, level: levelFromXp(u.xp) }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}
