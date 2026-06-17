import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("bored")
  .setDescription("Get a random activity suggestion");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch("https://www.boredapi.com/api/activity", { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch an activity right now." });
      return;
    }
    const body = await res.json() as { activity: string; type: string; participants: number; price: number };
    const priceLabel = body.price === 0 ? "Free" : body.price < 0.3 ? "Cheap" : body.price < 0.6 ? "Moderate" : "Expensive";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("😐 Bored? Try this:")
      .setDescription(body.activity)
      .addFields(
        { name: "Type", value: body.type, inline: true },
        { name: "Participants", value: String(body.participants), inline: true },
        { name: "Price", value: priceLabel, inline: true },
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch an activity right now." });
  }
}
