import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("hug")
  .setDescription("Give someone a hug")
  .addUserOption((option) =>
    option.setName("user").setDescription("Who to hug").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const result = await sendReaction("hug", interaction.user, target, "hugged");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a hug right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
