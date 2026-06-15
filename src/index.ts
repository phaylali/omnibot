/**
 * =============================================================================
 * OMNIBOT — MAIN ENTRY POINT
 * =============================================================================
 *
 * Boot sequence:
 *   1. Load environment variables (Bun does this automatically)
 *   2. Create the Discord.js client with required intents
 *   3. Load all command modules from commands/_index.ts
 *   4. Register the interaction event handler
 *   5. Connect to Discord via the gateway
 *
 * Run:  bun run start
 * Dev:  bun run dev   (auto-restarts on file changes)
 *
 * Environment variables (from .env):
 *   APP_ID        — Discord application ID
 *   DISCORD_TOKEN — Bot token (keep secret!)
 *   PUBLIC_KEY    — For interaction verification
 *   GUILD_ID      — (Optional) Dev server for instant command registration
 * =============================================================================
 */

import { Client, GatewayIntentBits, Events } from "discord.js";
import { DISCORD_TOKEN, BOT_NAME } from "./config.ts";
import { loadCommands } from "./lib/commandLoader.ts";
import { registerInteractionHandler } from "./events/interactionCreate.ts";
import { getAllConfiguredOnlineGuilds } from "./lib/configStore.ts";
import { RssMonitor } from "./services/rssMonitor.ts";
import { WordMonitor } from "./services/wordMonitor.ts";
import { registerGuildMemberEvents } from "./events/guildMemberEvents.ts";
import { registerXpEvents } from "./events/messageCreate.ts";
import { logger } from "./lib/logger.ts";

// ───── 1. Create the Client ─────
//
// GatewayIntentBits.Guilds is the minimum needed to receive guild
// and command events. Add more intents as features grow (e.g., GuildMessages).
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ───── 2. Load Commands ─────
//
// This reads all command files from commands/ and stores them in
// client.commands (a Collection) for fast lookup by name.
loadCommands(client);

// ───── 3. Register Event Handlers ─────
//
// The interactionCreate handler routes slash commands, buttons, and
// select menus to the right functions.
registerInteractionHandler(client);
registerGuildMemberEvents(client);
registerXpEvents(client);

// ───── 4. Ready Event ─────
//
// Fires once after a successful gateway connection.
// This is where we know the bot is online and can set its status.
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`✅ Logged in as ${readyClient.user.tag}`);
  logger.info(`   Serving ${readyClient.guilds.cache.size} guild(s)`);

  // Set the bot's "playing" status
  readyClient.user.setPresence({
    activities: [{ name: "/help • omnibot" }],
    status: "online",
  });

  // ── Start RSS monitor ──
  const rssMonitor = new RssMonitor(readyClient);
  rssMonitor.start();
  logger.info("📡 RSS monitor started");

  // ── Start Word of the Day monitor ──
  const wordMonitor = new WordMonitor(readyClient);
  wordMonitor.start();

  // ── Send online notification to configured guilds ──
  // Each guild can set a default channel via /config setchannel.
  // When the bot starts, it posts a simple "I'm online" message there.
  const configuredGuilds = await getAllConfiguredOnlineGuilds();

  for (const { guildId, channelId } of configuredGuilds) {
    const guild = readyClient.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found — skipping online message`);
      continue;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Channel ${channelId} in guild ${guildId} not found or not text — skipping`);
      continue;
    }

    try {
      await channel.send(`🟢 **${BOT_NAME}** is now online!`);
      logger.info(`Online notification sent to guild ${guildId} (#${channel.name})`);
    } catch (err) {
      logger.error(`Failed to send online message to guild ${guildId}: ${err}`);
    }
  }
});

// ───── 5. Login ─────
//
// Bun loads .env automatically, so DISCORD_TOKEN is available via config.ts.
await client.login(DISCORD_TOKEN);
