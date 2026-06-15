import { EmbedBuilder } from "discord.js";
import type { Client, TextBasedChannel } from "discord.js";
import { TIFINAGH_API_URL } from "../config.ts";
import { getAllConfiguredWordGuilds, updateLastWordTimestamp } from "../lib/configStore.ts";
import { logger } from "../lib/logger.ts";

const POLL_INTERVAL = 60_000;

export class WordMonitor {
  private client: Client;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
    logger.info("📖 Word of the Day monitor started");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Send a word now to a specific guild's configured channel. Returns true on success. */
  async sendNow(guildId: string): Promise<boolean> {
    const guilds = await getAllConfiguredWordGuilds();
    const cfg = guilds.find((g) => g.guildId === guildId);
    if (!cfg) return false;

    return this.sendWord(guildId, cfg.channelId, false);
  }

  private async poll(): Promise<void> {
    try {
      const guilds = await getAllConfiguredWordGuilds();
      const now = Date.now();

      for (const cfg of guilds) {
        const elapsed = cfg.lastTimestamp ? now - cfg.lastTimestamp : Infinity;
        const intervalMs = cfg.intervalHours * 3_600_000;

        if (elapsed < intervalMs) continue;

        await this.sendWord(cfg.guildId, cfg.channelId, true);
      }
    } catch (err) {
      logger.error(`WordMonitor poll error: ${err}`);
    }
  }

  private async sendWord(guildId: string, channelId: string, updateTimestamp: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${TIFINAGH_API_URL}/api/random`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        logger.warn(`WordMonitor: random word API returned ${res.status} for guild ${guildId}`);
        return false;
      }

      const entry = (await res.json()) as {
        word: string;
        pronunciation: string;
        arabic: string;
        english: string;
      };

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        logger.warn(`WordMonitor: guild ${guildId} not found`);
        return false;
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel?.isTextBased()) {
        logger.warn(`WordMonitor: channel ${channelId} not found or not text in guild ${guildId}`);
        return false;
      }

      const embed = new EmbedBuilder()
        .setColor(0x2d7f2d)
        .setTitle("ⵣ Word of the Day")
        .setDescription(`**${entry.word}**`)
        .addFields(
          { name: "Pronunciation", value: entry.pronunciation || "—", inline: true },
          { name: "Arabic", value: entry.arabic || "—", inline: true },
          { name: "English", value: entry.english || "—", inline: true },
        )
        .setTimestamp();

      await (channel as TextBasedChannel).send({ embeds: [embed] });

      if (updateTimestamp) {
        await updateLastWordTimestamp(guildId);
      }

      logger.info(`WordMonitor: sent word "${entry.word}" to guild ${guildId}`);
      return true;
    } catch (err) {
      logger.error(`WordMonitor: send failed for guild ${guildId}: ${err}`);
      return false;
    }
  }
}
