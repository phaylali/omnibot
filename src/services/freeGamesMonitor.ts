import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Client, TextBasedChannel } from "discord.js";
import { getAllConfiguredFreeGamesGuilds } from "../lib/configStore.ts";
import { getSentGiveawayIds, markGiveawaySent } from "../lib/freeGamesStore.ts";
import { logger } from "../lib/logger.ts";

const POLL_INTERVAL = 60_000;
const API_URL = "https://www.gamerpower.com/api/giveaways";

interface Giveaway {
  id: number;
  title: string;
  worth: string;
  image: string;
  open_giveaway_url: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  status: string;
  description: string;
}

const BOOT_DELAY = 60_000;

export class FreeGamesMonitor {
  private client: Client;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    if (this.timer) return;
    setTimeout(() => {
      this.poll();
      this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
      logger.info("🎮 Free games monitor started");
    }, BOOT_DELAY);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const guilds = await getAllConfiguredFreeGamesGuilds();
      if (guilds.length === 0) return;

      const res = await fetch(API_URL, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logger.warn(`FreeGamesMonitor: API returned ${res.status} — ${body.slice(0, 200)}`);
        return;
      }

      const text = await res.text();
      let giveaways: Giveaway[];
      try {
        giveaways = JSON.parse(text);
      } catch {
        logger.warn(`FreeGamesMonitor: non-JSON response — ${text.slice(0, 200)}`);
        return;
      }

      for (const cfg of guilds) {
        await this.processGuild(cfg.guildId, cfg.channelId, giveaways);
      }
    } catch (err) {
      logger.error(`FreeGamesMonitor poll error: ${err}`);
    }
  }

  private async processGuild(guildId: string, channelId: string, giveaways: Giveaway[]): Promise<void> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    const sentIds = await getSentGiveawayIds(guildId);

    for (const g of giveaways) {
      if (sentIds.has(g.id)) continue;
      if (g.status !== "Active") continue;
      if (g.type !== "game") continue;
      if (!isRecentAndValid(g)) continue;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(g.title)
        .setURL(g.open_giveaway_url)
        .setDescription(g.description ? truncate(g.description, 4096) : null)
        .setThumbnail(g.image)
        .addFields(
          { name: "Platforms", value: g.platforms || "—", inline: true },
          { name: "Type", value: g.type || "—", inline: true },
          { name: "Worth", value: g.worth || "Free", inline: true },
        )
        .setFooter({ text: "GamerPower" })
        .setTimestamp(new Date(g.published_date));

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Claim Now")
          .setURL(g.open_giveaway_url)
          .setStyle(ButtonStyle.Link),
      );

      try {
        await (channel as TextBasedChannel).send({ embeds: [embed], components: [row] });
        await markGiveawaySent(guildId, g.id);
        logger.info(`FreeGamesMonitor: sent "${g.title}" to guild ${guildId}`);
      } catch (err) {
        logger.error(`FreeGamesMonitor: failed to send "${g.title}" to guild ${guildId}: ${err}`);
      }
    }
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

function isRecentAndValid(g: Giveaway): boolean {
  // Check published within last 30 days
  const published = new Date(g.published_date);
  if (Date.now() - published.getTime() > THIRTY_DAYS_MS) return false;

  // Check end date hasn't passed
  if (g.end_date && g.end_date !== "N/A") {
    const end = new Date(g.end_date);
    if (isNaN(end.getTime())) return true;
    if (end.getTime() < Date.now()) return false;
  }

  return true;
}
