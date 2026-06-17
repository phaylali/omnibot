import { guildRead, guildWrite } from "./store.ts";

interface FreeGamesData {
  sentIds: number[];
}

export async function getSentGiveawayIds(guildId: string): Promise<Set<number>> {
  const data = await guildRead<FreeGamesData>(guildId, "freeGamesSent.json", { sentIds: [] });
  return new Set(data.sentIds);
}

export async function markGiveawaySent(guildId: string, id: number): Promise<void> {
  const data = await guildRead<FreeGamesData>(guildId, "freeGamesSent.json", { sentIds: [] });
  if (!data.sentIds.includes(id)) {
    data.sentIds.push(id);
  }
  await guildWrite(guildId, "freeGamesSent.json", data);
}
