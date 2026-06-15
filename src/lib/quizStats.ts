import { guildRead, guildWrite } from "./store.ts";

interface QuizUserStats {
  username: string;
  correct: number;
  total: number;
}

type StatsMap = Record<string, QuizUserStats>;

const STATS_FILE = "quizStats.json";
const EMPTY: StatsMap = {};

export async function recordQuiz(
  guildId: string,
  userId: string,
  username: string,
  correct: boolean,
): Promise<void> {
  const stats = await guildRead<StatsMap>(guildId, STATS_FILE, EMPTY);

  if (!stats[userId]) {
    stats[userId] = { username, correct: 0, total: 0 };
  }

  stats[userId].username = username;
  stats[userId].total++;
  if (correct) stats[userId].correct++;

  await guildWrite(guildId, STATS_FILE, stats);
}

export async function getQuizLeaderboard(
  guildId: string,
): Promise<(QuizUserStats & { userId: string; winRate: number })[]> {
  const stats = await guildRead<StatsMap>(guildId, STATS_FILE, EMPTY);

  return Object.entries(stats)
    .map(([userId, s]) => ({
      userId,
      ...s,
      winRate: s.total > 0 ? (s.correct / s.total) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

export async function getQuizTopN(
  guildId: string,
  n: number,
): Promise<Awaited<ReturnType<typeof getQuizLeaderboard>>> {
  const board = await getQuizLeaderboard(guildId);
  return board.slice(0, n);
}
