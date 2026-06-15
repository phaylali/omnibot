import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("slap")
  .setDescription("Slap someone")
  .addUserOption((option) =>
    option.setName("user").setDescription("Who to slap").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const result = await sendReaction("slap", interaction.user, target, "slapped");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a slap right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
