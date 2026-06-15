import { EmbedBuilder } from "discord.js";
import type { User } from "discord.js";

interface ReactionResult {
  url: string;
  artist: string;
  artist_url: string;
  source_url: string;
}

export async function sendReaction(
  action: string,
  actor: User,
  target: User | null,
  verb: string,
): Promise<{ embed: EmbedBuilder; gifUrl: string } | null> {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${action}`, {
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { results: ReactionResult[] };
    const result = body.results?.[0];
    if (!result) return null;

    const label = target
      ? `${actor} ${verb} ${target}`
      : `${actor} ${verb}`;

    const embed = new EmbedBuilder()
      .setColor(0xff6b81)
      .setDescription(label)
      .setImage(result.url)
      .setFooter({ text: `Art by ${result.artist}` })
      .setTimestamp();

    return { embed, gifUrl: result.url };
  } catch {
    return null;
  }
}
