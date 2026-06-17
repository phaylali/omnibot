import { guildRead, guildWrite } from "./store.ts";

interface RelayData {
  [sourceChannelId: string]: string[];
}

export async function getCopiedIds(guildId: string, sourceChannelId: string): Promise<Set<string>> {
  const data = await guildRead<RelayData>(guildId, "relay-stats.json", {});
  return new Set(data[sourceChannelId] ?? []);
}

export async function markCopied(guildId: string, sourceChannelId: string, messageId: string): Promise<void> {
  const data = await guildRead<RelayData>(guildId, "relay-stats.json", {});
  if (!data[sourceChannelId]) data[sourceChannelId] = [];
  if (!data[sourceChannelId].includes(messageId)) {
    data[sourceChannelId].push(messageId);
  }
  await guildWrite(guildId, "relay-stats.json", data);
}
