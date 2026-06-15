import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dadjoke")
  .setDescription("Get a random dad joke");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch("https://icanhazdadjoke.com/", {
      headers: { Accept: "text/plain", "User-Agent": "Omnibot (discord)" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch a joke right now." });
      return;
    }

    const joke = await res.text();

    const embed = new EmbedBuilder()
      .setColor(0xf5c542)
      .setTitle("😂 Dad Joke")
      .setDescription(joke.trim());

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch a joke right now." });
  }
}
