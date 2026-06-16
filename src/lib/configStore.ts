import { guildRead, guildWrite, listGuilds } from "./store.ts";

export interface RssFeedEntry {
  url: string;
  channelId: string;
  lastCheck: number | null;
  signature: string;
}

export interface GuildConfig {
  onlineChannelId: string | null;
  welcomeChannelId: string | null;
  wordChannelId: string | null;
  freegamesChannelId: string | null;
  rankChannelId: string | null;
  roleChannelId: string | null;
  rssFeeds: RssFeedEntry[];
  rssIntervalMinutes: number;
  wordIntervalHours: number;
  lastWordTimestamp: number | null;
}

const CONFIG_FILE = "config.json";
const DEFAULT_CONFIG: GuildConfig = {
  onlineChannelId: null,
  welcomeChannelId: null,
  wordChannelId: null,
  freegamesChannelId: null,
  rankChannelId: null,
  roleChannelId: null,
  rssFeeds: [],
  rssIntervalMinutes: 60,
  wordIntervalHours: 3,
  lastWordTimestamp: null,
};

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const raw = await guildRead<Record<string, unknown>>(guildId, CONFIG_FILE, {});
  const config: GuildConfig = { ...DEFAULT_CONFIG };

  // Migrate old field names
  if ("defaultChannelId" in raw) {
    config.onlineChannelId = raw.defaultChannelId as string;
    delete raw.defaultChannelId;
  }
  if ("onlineChannelId" in raw) config.onlineChannelId = raw.onlineChannelId as string;
  if ("welcomeChannelId" in raw) config.welcomeChannelId = raw.welcomeChannelId as string;
  if ("wordChannelId" in raw) config.wordChannelId = raw.wordChannelId as string;
  if ("freegamesChannelId" in raw) config.freegamesChannelId = raw.freegamesChannelId as string;
  if ("rankChannelId" in raw) config.rankChannelId = raw.rankChannelId as string;
  if ("roleChannelId" in raw) config.roleChannelId = raw.roleChannelId as string;
  if ("rssFeeds" in raw) config.rssFeeds = raw.rssFeeds as RssFeedEntry[];
  if ("rssIntervalMinutes" in raw) config.rssIntervalMinutes = raw.rssIntervalMinutes as number;
  if ("wordIntervalHours" in raw) config.wordIntervalHours = raw.wordIntervalHours as number;
  if ("lastWordTimestamp" in raw) config.lastWordTimestamp = raw.lastWordTimestamp as number | null;

  return config;
}

// ───── Online Channel ─────

export async function setOnlineChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.onlineChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function getAllConfiguredOnlineGuilds(): Promise<
  { guildId: string; channelId: string }[]
> {
  const guildIds = await listGuilds();
  const result: { guildId: string; channelId: string }[] = [];

  for (const guildId of guildIds) {
    const config = await getGuildConfig(guildId);
    if (config.onlineChannelId) {
      result.push({ guildId, channelId: config.onlineChannelId });
    }
  }

  return result;
}

// ───── Welcome Channel ─────

export async function setWelcomeChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.welcomeChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function getAllConfiguredWelcomeGuilds(): Promise<
  { guildId: string; channelId: string }[]
> {
  const guildIds = await listGuilds();
  const result: { guildId: string; channelId: string }[] = [];

  for (const guildId of guildIds) {
    const config = await getGuildConfig(guildId);
    const channelId = config.welcomeChannelId || config.onlineChannelId;
    if (channelId) {
      result.push({ guildId, channelId });
    }
  }

  return result;
}

// ───── Word Channel ─────

export async function setWordChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.wordChannelId = channelId;
  if (channelId) config.lastWordTimestamp = null;
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function setWordInterval(
  guildId: string,
  hours: number,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.wordIntervalHours = hours;
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function updateLastWordTimestamp(
  guildId: string,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.lastWordTimestamp = Date.now();
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function getAllConfiguredWordGuilds(): Promise<
  { guildId: string; channelId: string; intervalHours: number; lastTimestamp: number | null }[]
> {
  const guildIds = await listGuilds();
  const result: { guildId: string; channelId: string; intervalHours: number; lastTimestamp: number | null }[] = [];

  for (const guildId of guildIds) {
    const config = await getGuildConfig(guildId);
    if (config.wordChannelId) {
      result.push({ guildId, channelId: config.wordChannelId, intervalHours: config.wordIntervalHours, lastTimestamp: config.lastWordTimestamp });
    }
  }

  return result;
}

// ───── Freegames Channel ─────

export async function setFreegamesChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.freegamesChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

// ───── Role Channel ─────

export async function setRoleChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.roleChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

// ───── Rank Channel ─────

export async function setRankChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.rankChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

// ───── RSS ─────

export async function addRssFeed(
  guildId: string,
  url: string,
  channelId: string,
): Promise<boolean> {
  const config = await getGuildConfig(guildId);
  if (config.rssFeeds.some((f) => f.url === url)) return false;

  config.rssFeeds.push({
    url,
    channelId,
    lastCheck: null,
    signature: "",
  });
  await guildWrite(guildId, CONFIG_FILE, config);
  return true;
}

export async function removeRssFeed(
  guildId: string,
  url: string,
): Promise<boolean> {
  const config = await getGuildConfig(guildId);
  const before = config.rssFeeds.length;
  config.rssFeeds = config.rssFeeds.filter((f) => f.url !== url);
  if (config.rssFeeds.length === before) return false;

  await guildWrite(guildId, CONFIG_FILE, config);
  return true;
}

export async function setRssInterval(
  guildId: string,
  minutes: number,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.rssIntervalMinutes = minutes;
  await guildWrite(guildId, CONFIG_FILE, config);
}

export async function updateRssSignature(
  guildId: string,
  url: string,
  signature: string,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  const feed = config.rssFeeds.find((f) => f.url === url);
  if (feed) {
    feed.signature = signature;
    feed.lastCheck = Date.now();
    await guildWrite(guildId, CONFIG_FILE, config);
  }
}

export interface GuildWithFeeds {
  guildId: string;
  feeds: RssFeedEntry[];
  intervalMinutes: number;
}

export async function getAllGuildsWithFeeds(): Promise<GuildWithFeeds[]> {
  const guildIds = await listGuilds();
  const result: GuildWithFeeds[] = [];

  for (const guildId of guildIds) {
    const config = await getGuildConfig(guildId);
    if (config.rssFeeds.length > 0) {
      result.push({
        guildId,
        feeds: config.rssFeeds,
        intervalMinutes: config.rssIntervalMinutes,
      });
    }
  }

  return result;
}
