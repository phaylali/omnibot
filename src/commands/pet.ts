import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("pet")
  .setDescription("Pet someone")
  .addUserOption((option) =>
    option.setName("user").setDescription("Who to pet").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const result = await sendReaction("pat", interaction.user, target, "petted");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a pet right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
