import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export const data = new SlashCommandBuilder()
  .setName("holidays")
  .setDescription("Show upcoming Moroccan holidays with countdown");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch("https://date.nager.at/api/v3/NextPublicHolidays/MA", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch holiday data." });
      return;
    }

    const holidays = await res.json() as Holiday[];
    if (holidays.length === 0) {
      await interaction.editReply({ content: "📅 No upcoming holidays found." });
      return;
    }

    const now = Date.now();
    const lines = holidays.slice(0, 10).map((h) => {
      const days = Math.ceil((new Date(h.date).getTime() - now) / 86_400_000);
      return `**${h.localName}** — ${days <= 0 ? "🎉 Today!" : `${days} days`}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xc1272d)
      .setTitle("🇲🇦 Upcoming Moroccan Holidays")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Source: Nager.Date" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch holiday data." });
  }
}
