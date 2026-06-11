/**
 * =============================================================================
 * DISCORD REST API HELPER
 * Low-level HTTP wrapper for Discord's REST API (v10).
 * Used primarily by the deploy script for command registration.
 * =============================================================================
 */

import { DISCORD_TOKEN } from "../config.ts";

/**
 * Sends an authenticated request to the Discord REST API.
 *
 * @param endpoint - API path (e.g., "applications/123/commands")
 * @param options  - Fetch options (method, body, headers)
 * @returns The fetch Response
 */
export async function discordRequest(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `https://discord.com/api/v10/${endpoint}`;

  const body =
    options.body && typeof options.body === "object"
      ? JSON.stringify(options.body)
      : options.body;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent": "DiscordBot (omnibot, 1.0.0)",
    },
    ...options,
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error(`Discord API error (${res.status}):`, data);
    throw new Error(JSON.stringify(data));
  }

  return res;
}
