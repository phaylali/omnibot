import { guildRead, guildWrite, listGuilds } from "./store.ts";

export interface RssFeedEntry {
  url: string;
  channelId: string;
  lastCheck: number | null;
  signature: string;
}

export interface GuildConfig {
  defaultChannelId: string | null;
  rssFeeds: RssFeedEntry[];
  rssIntervalMinutes: number;
}

const CONFIG_FILE = "config.json";
const DEFAULT_CONFIG: GuildConfig = {
  defaultChannelId: null,
  rssFeeds: [],
  rssIntervalMinutes: 60,
};

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return guildRead(guildId, CONFIG_FILE, DEFAULT_CONFIG);
}

export async function setDefaultChannel(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  const config = await getGuildConfig(guildId);
  config.defaultChannelId = channelId;
  await guildWrite(guildId, CONFIG_FILE, config);
}

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
