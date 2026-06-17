import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { sendReaction } from "../utils/social.ts";

export const data = new SlashCommandBuilder()
  .setName("pat")
  .setDescription("Pat someone")
  .addUserOption((option) =>
    option.setName("user").setDescription("Who to pat").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const result = await sendReaction("pat", interaction.user, target, "patted");
  if (!result) {
    await interaction.reply({ content: "❌ Couldn't fetch a pat right now." });
    return;
  }
  await interaction.reply({ embeds: [result.embed] });
}
