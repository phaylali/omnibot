import { Client, EmbedBuilder } from "discord.js";
import { getAllGuildsWithFeeds, updateRssSignature } from "../lib/configStore.ts";
import { fetchRss, itemsSignature } from "../lib/rssParser.ts";

export class RssMonitor {
  private client: Client;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    this.timer = setInterval(() => this.poll(), 60_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    const guilds = await getAllGuildsWithFeeds();
    const now = Date.now();

    for (const { guildId, feeds, intervalMinutes } of guilds) {
      const intervalMs = intervalMinutes * 60_000;

      for (const feed of feeds) {
        if (feed.lastCheck && now - feed.lastCheck < intervalMs) continue;

        const items = await fetchRss(feed.url);
        if (!items || items.length === 0) continue;

        const newSig = itemsSignature(items);

        if (newSig === feed.signature) {
          await updateRssSignature(guildId, feed.url, newSig);
          continue;
        }

        const channel = this.client.channels.cache.get(feed.channelId);
        if (!channel || !("send" in channel)) {
          await updateRssSignature(guildId, feed.url, newSig);
          continue;
        }

        if (!feed.signature) {
          await updateRssSignature(guildId, feed.url, newSig);
          continue;
        }

        const oldItems = feed.signature.split("|");
        const newItems = items.filter(
          (item) => !oldItems.includes(item.guid || item.link || item.title),
        );

        for (const item of newItems) {
          try {
            const embed = new EmbedBuilder()
              .setColor(0xff6600)
              .setTitle(item.title.slice(0, 256))
              .setURL(item.link)
              .setDescription(item.description || null)
              .setTimestamp(item.pubDate ? new Date(item.pubDate).getTime() : Date.now());

            if (item.author) embed.setAuthor({ name: item.author });
            if (item.imageUrl) embed.setImage(item.imageUrl);

            await channel.send({ embeds: [embed] });
          } catch {
            // Skip items that fail to send
          }
        }

        await updateRssSignature(guildId, feed.url, newSig);
      }
    }
  }
}
