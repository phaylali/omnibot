import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("facepalm")
  .setDescription("Facepalm");

export async function execute(interaction: ChatInputCommandInteraction) {
  const result = await sendReaction("facepalm", interaction.user, null, "facepalms");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a facepalm right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
