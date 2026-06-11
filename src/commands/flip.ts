/**
 * =============================================================================
 * /flip COMMAND
 * Flips a coin. Randomly lands on heads or tails and shows the
 * corresponding image from the project's images/ directory.
 *
 * Images:  images/front-coin.png  (heads)
 *          images/back-coin.png   (tails)
 *
 * Replace these with your own coin images and the command will
 * pick them up automatically.
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";

/** Maps result → image filename */
const COIN_IMAGES: Record<string, string> = {
  heads: "front-coin.png",
  tails: "back-coin.png",
};

export const data = new SlashCommandBuilder()
  .setName("flip")
  .setDescription("Flip a coin — heads or tails?")
  .setIntegrationTypes(0, 1)
  .setContexts(0, 1, 2);

export async function execute(interaction: ChatInputCommandInteraction) {
  // ── Pick heads or tails ──
  const result = Math.random() < 0.5 ? "heads" : "tails";
  const filename = COIN_IMAGES[result];

  // Path is relative to the project root (where bun run is executed)
  const imagePath = `images/${filename}`;

  // Create an attachment from the local file
  // AttachmentBuilder reads the file and sends it with the interaction
  const attachment = new AttachmentBuilder(imagePath);
  const imageUrl = `attachment://${filename}`;

  // Build an embed with the coin image and result text
  const embed = new EmbedBuilder()
    .setColor(0xf5c542) // gold
    .setTitle("🪙 Coin Flip")
    .setDescription(`It landed on **${result.toUpperCase()}**!`)
    .setImage(imageUrl)
    .setFooter({ text: `Flipped by ${interaction.user.globalName || interaction.user.username}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    files: [attachment],
  });
}
