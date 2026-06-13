/**
 * =============================================================================
 * BOT CONFIGURATION
 * Centralizes all environment variables and app-wide constants.
 * Import this instead of reading process.env directly.
 * =============================================================================
 */

/** Discord application ID (needed for command registration) */
export const APP_ID = process.env.APP_ID ?? "";

/** Bot token used to authenticate with Discord */
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? "";

/** Public key for verifying interaction requests (used by discord.js internally) */
export const PUBLIC_KEY = process.env.PUBLIC_KEY ?? "";

/**
 * Optional guild ID for development.
 * When set, commands are scoped to this server for instant registration.
 * When empty, commands are global (slow cache — up to 1 hour).
 */
export const GUILD_ID = process.env.GUILD_ID ?? "";

/** Owner/developer user IDs — used for owner-only commands */
export const OWNER_IDS = (process.env.OWNER_IDS ?? "").split(",").filter(Boolean);

/** The default prefix for any text-based commands (future use) */
export const PREFIX = process.env.PREFIX ?? "!";

/** Tifinagh Dictionary API base URL */
export const TIFINAGH_API_URL =
  process.env.TIFINAGH_API_URL ?? "https://omniversify-tifinagh-dictionary-api.omniversify.com";

/** Default embed color used across the bot */
export const EMBED_COLOR = 0x5865f2; // Discord blurple

/**
 * The bot's display name — used in embeds and status messages.
 * You can customize this per-server by overriding it here.
 */
export const BOT_NAME = "Omnibot";
