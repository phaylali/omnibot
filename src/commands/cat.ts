import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("cat")
  .setDescription("Get a random cat picture");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch("https://cataas.com/cat?json=true", { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch a cat right now." });
      return;
    }
    const body = await res.json() as { url: string };
    const embed = new EmbedBuilder()
      .setColor(0xf09030)
      .setTitle("🐱 Meow!")
      .setImage(`https://cataas.com${body.url}`)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch a cat right now." });
  }
}
