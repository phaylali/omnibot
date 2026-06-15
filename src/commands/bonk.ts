import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("bonk")
  .setDescription("Bonk someone")
  .addUserOption((option) =>
    option.setName("user").setDescription("Who to bonk").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const result = await sendReaction("bonk", interaction.user, target, "bonked");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a bonk right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
