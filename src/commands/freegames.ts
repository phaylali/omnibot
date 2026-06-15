import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

interface Giveaway {
  id: number;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  open_giveaway_url: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  users: number;
  status: string;
  gamerpower_url: string;
  open_giveaway: string;
}

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

const PAGE_SIZE = 5;

export const data = new SlashCommandBuilder()
  .setName("freegames")
  .setDescription("Check currently free games and giveaways across stores")
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

function typeLabel(type: string): string {
  if (type === "game") return "🎮 Free Game";
  if (type === "loot") return "📦 In-Game Loot";
  if (type === "beta") return "🧪 Beta Access";
  return `🔗 ${type}`;
}

function buildPage(items: Giveaway[], page: number, totalPages: number) {
  const embed = new EmbedBuilder()
    .setColor(0x00ae86)
    .setTitle("🎮 Free Games & Giveaways")
    .setDescription(
      `Showing **${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, items.length)}** of **${items.length}** active — sorted by newest`,
    )
    .setFooter({ text: `Powered by GamerPower.com • Page ${page + 1}/${totalPages}` })
    .setTimestamp();

  if (items[0]?.image) {
    embed.setImage(items[0].image);
  }

  for (const g of items) {
    const tag = typeLabel(g.type);
    const platformInfo = g.platforms ? `\n📌 ${g.platforms}` : "";
    const endDate = g.end_date
      ? `\n⏳ Ends: <t:${Math.floor(new Date(g.end_date).getTime() / 1000)}:R>`
      : "";
    const worth = g.worth && g.worth !== "N/A" ? `\n💰 Worth: ${g.worth}` : "";
    embed.addFields({
      name: `${tag} — ${g.title}`,
      value: `[Claim now](${g.open_giveaway_url})${platformInfo}${endDate}${worth}`,
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("freegames_prev")
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("freegames_next")
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages - 1),
  );

  return { embed, row };
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
      await interaction.editReply({ content: "📭 No active giveaways found for that filter." });
      return;
    }

    const filtered = giveaways.filter((g) => g.status === "Active");
    if (filtered.length === 0) {
      await interaction.editReply({ content: "📭 No active giveaways found for that filter." });
      return;
    }

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime(),
    );

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    let page = 0;

    const { embed, row } = buildPage(sorted.slice(0, PAGE_SIZE), 0, totalPages);

    if (sorted.length <= PAGE_SIZE) {
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === interaction.user.id &&
        ["freegames_prev", "freegames_next"].includes(i.customId),
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      page = i.customId === "freegames_prev" ? page - 1 : page + 1;
      const start = page * PAGE_SIZE;
      const { embed: e, row: r } = buildPage(sorted.slice(start, start + PAGE_SIZE), page, totalPages);
      await i.update({ embeds: [e], components: [r] });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  } catch (err) {
    await interaction.editReply({ content: "❌ Couldn't fetch giveaways right now." });
    console.error(`Freegames error: ${err}`);
  }
}
