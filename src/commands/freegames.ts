import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
} from "discord.js";

export interface Giveaway {
  title: string;
  worth: string;
  image: string;
  open_giveaway_url: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  status: string;
}

interface PageState {
  games: Giveaway[];
  page: number;
  userId: string;
}

const pages = new Map<string, PageState>();

const PLATFORM_CHOICES = [
  { name: "All", value: "all" },
  { name: "Steam", value: "steam" },
  { name: "Epic Games Store", value: "epic-games-store" },
  { name: "GOG", value: "gog" },
  { name: "PC (all stores)", value: "pc" },
  { name: "itch.io", value: "itchio" },
  { name: "Android", value: "android" },
  { name: "iOS", value: "ios" },
] as const;

const TYPE_CHOICES = [
  { name: "Games", value: "game" },
  { name: "Loot", value: "loot" },
  { name: "Betas", value: "beta" },
] as const;

export const data = new SlashCommandBuilder()
  .setName("freegames")
  .setDescription("Browse currently free games and giveaways across stores")
  .addStringOption((option) =>
    option
      .setName("platform")
      .setDescription("Filter by platform")
      .setRequired(false)
      .addChoices(...PLATFORM_CHOICES),
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Filter by giveaway type")
      .setRequired(false)
      .addChoices(...TYPE_CHOICES),
  );

function typeLabel(type: string): { emoji: string; label: string } {
  if (type === "game") return { emoji: "🎮", label: "Free Game" };
  if (type === "loot") return { emoji: "📦", label: "In-Game Loot" };
  if (type === "beta") return { emoji: "🧪", label: "Beta Access" };
  return { emoji: "🔗", label: type };
}

function buildPage(game: Giveaway, index: number, total: number) {
  const t = typeLabel(game.type);

  const embed = new EmbedBuilder()
    .setColor(0x00ae86)
    .setTitle(`${t.emoji} ${game.title}`)
    .setURL(game.open_giveaway_url)
    .setFooter({ text: `${index + 1} of ${total} · Powered by GamerPower.com` })
    .setTimestamp();

  if (game.image) embed.setImage(game.image);

  const lines: string[] = [];
  lines.push(`**Type:** ${t.label}`);
  if (game.platforms) lines.push(`**Platforms:** ${game.platforms}`);
  if (game.worth && game.worth !== "N/A") lines.push(`**Worth:** ${game.worth}`);
  if (game.end_date) {
    const ts = Math.floor(new Date(game.end_date).getTime() / 1000);
    lines.push(`**Ends:** <t:${ts}:R>`);
  }
  embed.setDescription(lines.join("\n"));

  const claim = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🎁 Claim this giveaway")
      .setStyle(ButtonStyle.Link)
      .setURL(game.open_giveaway_url),
  );

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("freegames_prev")
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId("freegames_next")
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === total - 1),
  );

  return { embed, claim, nav };
}

export function handleFreeGamesNav(
  customId: string,
  message: Message,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } | null {
  const state = pages.get(message.id);
  if (!state) return null;

  if (customId === "freegames_prev") state.page--;
  if (customId === "freegames_next") state.page++;

  const game = state.games[state.page];
  const { embed, claim, nav } = buildPage(game, state.page, state.games.length);
  return { embeds: [embed], components: [claim, nav] };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const platform = interaction.options.getString("platform") ?? "all";
  const type = interaction.options.getString("type");

  await interaction.deferReply();

  try {
    const params = new URLSearchParams();
    if (platform !== "all") params.set("platform", platform);
    if (type) params.set("type", type);
    const qs = params.toString();
    const url = `https://www.gamerpower.com/api/giveaways${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch giveaways right now." });
      return;
    }

    const giveaways = (await res.json()) as Giveaway[];

    if (!Array.isArray(giveaways) || giveaways.length === 0) {
      await interaction.editReply({ content: "📭 No active giveaways found." });
      return;
    }

    const active = giveaways.filter((g) => g.status === "Active");
    if (active.length === 0) {
      await interaction.editReply({ content: "📭 No active giveaways found." });
      return;
    }

    const sorted = [...active].sort(
      (a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime(),
    );

    const { embed, claim, nav } = buildPage(sorted[0], 0, sorted.length);
    const msg = await interaction.editReply({ embeds: [embed], components: [claim, nav] });

    pages.set(msg.id, { games: sorted, page: 0, userId: interaction.user.id });

    setTimeout(() => pages.delete(msg.id), 120_000);
  } catch (err) {
    await interaction.editReply({ content: "❌ Couldn't fetch giveaways right now." });
    console.error(`Freegames error: ${err}`);
  }
}
