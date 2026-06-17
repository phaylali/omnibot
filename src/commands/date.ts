import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

const API_BASE = "https://morocco-date-api.omniversify.com";

interface MonthInfo {
  order: number;
  latin: string;
  tifinagh: string;
  arabic: string;
}

interface DateResponse {
  year: number;
  month: MonthInfo;
  day: number;
}

interface AllCalendarsResponse {
  amazigh: DateResponse;
  gregorian: DateResponse;
  islamic: DateResponse;
}

const CALENDAR_NAMES: Record<string, string> = {
  amazigh: "ⵣ Amazigh",
  gregorian: "📅 Gregorian",
  islamic: "🌙 Islamic",
};

export const data = new SlashCommandBuilder()
  .setName("date")
  .setDescription("Moroccan date information — Gregorian, Islamic, Amazigh")
  .addSubcommand((s) =>
    s.setName("today").setDescription("Show all three calendars for today"),
  )
  .addSubcommand((s) =>
    s
      .setName("convert")
      .setDescription("Convert a Gregorian date to another calendar")
      .addStringOption((o) =>
        o.setName("calendar").setDescription("Target calendar").setRequired(true)
          .addChoices(
            { name: "Amazigh", value: "amazigh" },
            { name: "Islamic", value: "islamic" },
          ),
      )
      .addIntegerOption((o) =>
        o.setName("year").setDescription("Year (e.g. 2026)").setRequired(true),
      )
      .addIntegerOption((o) =>
        o.setName("month").setDescription("Month (1-12)").setRequired(true),
      )
      .addIntegerOption((o) =>
        o.setName("day").setDescription("Day (1-31)").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("months")
      .setDescription("List month names for a calendar")
      .addStringOption((o) =>
        o.setName("calendar").setDescription("Calendar").setRequired(true)
          .addChoices(
            { name: "Amazigh", value: "amazigh" },
            { name: "Gregorian", value: "gregorian" },
            { name: "Islamic", value: "islamic" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s.setName("time").setDescription("Show current time in Morocco"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand(true);

  switch (sub) {
    case "today":
      return handleToday(interaction);
    case "convert":
      return handleConvert(interaction);
    case "months":
      return handleMonths(interaction);
    case "time":
      return handleTime(interaction);
  }
}

async function handleToday(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch(`${API_BASE}/api/date/`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as AllCalendarsResponse;

    const embed = new EmbedBuilder()
      .setColor(0xc1272d)
      .setTitle("🇲🇦 Moroccan Date")
      .addFields(
        {
          name: "📅 Gregorian",
          value: `${data.gregorian.month.latin} ${data.gregorian.day}, ${data.gregorian.year}`,
          inline: true,
        },
        {
          name: "🌙 Islamic",
          value: `${data.islamic.month.latin} ${data.islamic.day}, ${data.islamic.year}`,
          inline: true,
        },
        {
          name: "ⵣ Amazigh",
          value: `${data.amazigh.month.latin} ${data.amazigh.day}, ${data.amazigh.year}`,
          inline: true,
        },
        {
          name: "🇦🇷 Arabic",
          value: `م ${data.gregorian.month.arabic} ${data.gregorian.day}، ${data.gregorian.year}\nهـ ${data.islamic.month.arabic} ${data.islamic.day}، ${data.islamic.year}\nⵣ ${data.amazigh.month.arabic} ${data.amazigh.day}، ${data.amazigh.year}`,
          inline: false,
        },
        {
          name: "ⵜⵉⴼⵉⵏⴰⵖ",
          value: `ⴳ ${data.gregorian.month.tifinagh} ${data.gregorian.day}، ${data.gregorian.year}\nⵀ ${data.islamic.month.tifinagh} ${data.islamic.day}، ${data.islamic.year}\nⵣ ${data.amazigh.month.tifinagh} ${data.amazigh.day}، ${data.amazigh.year}`,
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch date data." });
  }
}

async function handleConvert(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const calendar = interaction.options.getString("calendar", true);
  const year = interaction.options.getInteger("year", true);
  const month = interaction.options.getInteger("month", true);
  const day = interaction.options.getInteger("day", true);

  if (month < 1 || month > 12) {
    await interaction.editReply({ content: "❌ Month must be between 1 and 12." });
    return;
  }
  if (day < 1 || day > 31) {
    await interaction.editReply({ content: "❌ Day must be between 1 and 31." });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/${calendar}/${year}/${month}/${day}/`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      await interaction.editReply({ content: "❌ Invalid date or conversion failed." });
      return;
    }
    const data = await res.json() as DateResponse;

    const embed = new EmbedBuilder()
      .setColor(0xc1272d)
      .setTitle(`🔄 ${year}/${month}/${day} → ${CALENDAR_NAMES[calendar]}`)
      .setDescription(
        `**${data.month.latin} ${data.day}, ${data.year}**\n` +
        `${data.month.arabic} ${data.day}، ${data.year}\n` +
        `ⵜⵉⴼⵉⵏⴰⵖ: ${data.month.tifinagh} ${data.day}، ${data.year}`,
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't convert the date." });
  }
}

async function handleMonths(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const calendar = interaction.options.getString("calendar", true);
  const key = `${calendar}Months`;

  try {
    const res = await fetch(`${API_BASE}/api/${key}/`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const months = await res.json() as MonthInfo[];

    const lines = months.map((m) =>
      `\`${String(m.order).padStart(2, " ")}\` **${m.latin}** — ${m.arabic} — ${m.tifinagh}`,
    );

    const embed = new EmbedBuilder()
      .setColor(0xc1272d)
      .setTitle(`${CALENDAR_NAMES[calendar]} Months`)
      .setDescription(lines.join("\n"))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch month names." });
  }
}

async function handleTime(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch(`${API_BASE}/api/time/`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const timeStr = await res.text() as string;
    const cleanTime = timeStr.replace(/"/g, "").replace(/_/g, " ");

    const embed = new EmbedBuilder()
      .setColor(0xc1272d)
      .setTitle("🕐 Morocco Time")
      .setDescription(`\`\`\`${cleanTime}\`\`\``)
      .setFooter({ text: "Africa/Casablanca" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch the time." });
  }
}
