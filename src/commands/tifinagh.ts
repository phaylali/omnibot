import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { TIFINAGH_API_URL } from "../config.ts";

const SCRIPTS = [
  { name: "Arabic", value: "arabic" },
  { name: "Tifinagh", value: "tifinagh" },
  { name: "Latin", value: "latin" },
] as const;

const LANGS = [
  { name: "Arabic", value: "arabic" },
  { name: "English", value: "english" },
  { name: "Tifinagh", value: "tifinagh" },
] as const;

export const data = new SlashCommandBuilder()
  .setName("tifinagh")
  .setDescription("Tifinagh script tools — transliteration & dictionary")
  .addSubcommand((sub) =>
    sub
      .setName("retype")
      .setDescription("Convert text between Arabic, Latin, and Tifinagh scripts")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text to convert")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("from")
          .setDescription("Source script (auto-detected if omitted)")
          .setRequired(false)
          .addChoices(...SCRIPTS),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("translate")
      .setDescription("Look up a word in the Amazigh dictionary")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The word to look up")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("from")
          .setDescription("Language of the input text (auto-detected if omitted)")
          .setRequired(false)
          .addChoices(...LANGS),
      ),
  );

async function apiPost(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(`${TIFINAGH_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, data: null, error: (data as any).error || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, data: null, error: msg };
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  const text = interaction.options.getString("text", true);
  const from = interaction.options.getString("from");

  await interaction.deferReply();

  if (sub === "retype") {
    const body: Record<string, unknown> = { text };
    if (from) body.from = from;

    const { ok, data, error } = await apiPost("/retype", body);

    if (!ok) {
      await interaction.editReply({
        content: `❌ API error: ${error}`,
      });
      return;
    }

    const result = data as {
      input: { text: string; script: string };
      output: { text: string; script: string };
    };

    const embed = new EmbedBuilder()
      .setColor(0x2d7f2d)
      .setTitle("ⵣ Retype")
      .addFields(
        {
          name: "Input",
          value: `\`${result.input.text}\` (${result.input.script})`,
        },
        {
          name: "Output",
          value: `\`${result.output.text}\` (${result.output.script})`,
        },
      );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === "translate") {
    const body: Record<string, unknown> = { text };
    if (from) body.from = from;

    const { ok, data, error } = await apiPost("/translate", body);

    if (!ok) {
      await interaction.editReply({
        content: `❌ API error: ${error}`,
      });
      return;
    }

    const result = data as {
      query: string;
      results: {
        word: string;
        pronunciation: string;
        type: string;
        arabic: string;
        english: string;
      }[];
    };

    if (result.results.length === 0) {
      await interaction.editReply({
        content: `📭 No dictionary entries found for \`${result.query}\`.`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2d7f2d)
      .setTitle("ⵣ Dictionary — " + result.query)
      .setFooter({ text: `${result.results.length} result(s)` });

    for (const entry of result.results.slice(0, 5)) {
      const parts: string[] = [];
      if (entry.pronunciation) parts.push(`*${entry.pronunciation}*`);
      if (entry.arabic) parts.push(`العربية: ${entry.arabic}`);
      if (entry.english) parts.push(`English: ${entry.english}`);
      embed.addFields({
        name: entry.word,
        value: parts.join("\n") || "—",
      });
    }

    await interaction.editReply({ embeds: [embed] });
    return;
  }
}
