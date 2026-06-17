import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dog")
  .setDescription("Get a random dog picture");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch("https://dog.ceo/api/breeds/image/random", { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      await interaction.editReply({ content: "❌ Couldn't fetch a dog right now." });
      return;
    }
    const body = await res.json() as { message: string; status: string };
    const embed = new EmbedBuilder()
      .setColor(0xf0a030)
      .setTitle("🐕 Woof!")
      .setImage(body.message)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ Couldn't fetch a dog right now." });
  }
}
