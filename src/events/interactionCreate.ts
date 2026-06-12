/**
 * =============================================================================
 * INTERACTION CREATE EVENT HANDLER
 * Central router for all user interactions with the bot.
 *
 * Handles three interaction types:
 *   • Slash commands     → dispatched to the matching command's execute()
 *   • Buttons            → routed by customId (RPS accept/cancel, etc.)
 *   • String select menus → routed by customId (RPS choice, etc.)
 *
 * This file is intentionally thin — business logic lives in commands/ and games/.
 * =============================================================================
 */

import { randomInt } from "node:crypto";
import { Events, Interaction, MessageFlags } from "discord.js";
import type { Client } from "discord.js";
import { rpsGame } from "../games/rps.ts";
import { logger } from "../lib/logger.ts";
import { BOT_NAME } from "../config.ts";
import { capitalize } from "../utils/helpers.ts";
import { recordFlip, getTopN, getLeaderboard } from "../lib/flipStats.ts";

/**
 * Registers the interactionCreate listener on the client.
 * Call once after creating the client, before client.login().
 */
export function registerInteractionHandler(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
        return;
      }
    } catch (error) {
      logger.error(`Interaction error: ${error}`);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: `${BOT_NAME} encountered an error.`, flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  });

  logger.debug("Interaction handler registered");
}

// ───── Slash Command Router ─────

async function handleSlashCommand(
  interaction: import("discord.js").ChatInputCommandInteraction,
) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: /${interaction.commandName}`);
    await interaction.reply({
      content: `Unknown command. Try \`/help\` to see available commands.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  logger.info(
    `/${command.data.name} by ${interaction.user.tag} (${interaction.user.id})`,
  );

  await command.execute(interaction);
}

// ───── Button Router ─────

async function handleButton(interaction: import("discord.js").ButtonInteraction) {
  const { customId, channelId } = interaction;

  // ── RPS: Accept Challenge ──
  if (customId === "rps_accept") {
    const game = rpsGame.getGame(channelId);

    if (!game) {
      await interaction.reply({ content: "No active challenge here!", flags: MessageFlags.Ephemeral });
      return;
    }
    if (game.challenger.id === interaction.user.id) {
      await interaction.reply({ content: "You can't accept your own challenge!", flags: MessageFlags.Ephemeral });
      return;
    }

    // Show an ephemeral select menu so only the accepting player sees their choices
    const { StringSelectMenuBuilder, ActionRowBuilder } = await import("discord.js");
    const select = new StringSelectMenuBuilder()
      .setCustomId("rps_choose")
      .setPlaceholder("Pick your object...")
      .addOptions(rpsGame.getShuffledOptions());

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.reply({
      content: `${interaction.user.globalName || interaction.user.username}, choose your weapon:`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── FLIP: Guess heads or tails ──
  if (customId === "flip_heads" || customId === "flip_tails") {
    const userGuess = customId === "flip_heads" ? "heads" : "tails";
    const outcome = randomInt(2) === 0 ? "heads" : "tails";
    const won = userGuess === outcome;

    // Track stats per-guild (skip in DMs since there's no guild)
    const guildId = interaction.guildId;
    if (guildId) {
      await recordFlip(guildId, interaction.user.id, interaction.user.globalName ?? interaction.user.username, won);
    }
    const top3 = guildId ? await getTopN(guildId, 3) : [];

    const filename = outcome === "heads" ? "front-coin.png" : "back-coin.png";
    const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle }
      = await import("discord.js");

    const attachment = new AttachmentBuilder(`images/${filename}`);

    // Build top-3 leaderboard text
    const leaderboardText = top3.length > 0
      ? "\n" + top3.map((u, i) =>
          `**#${i + 1}** ${u.username} — ${u.wins}W ${u.losses}L (${u.winRate.toFixed(0)}%)`,
        ).join("\n")
      : "";

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle("🪙 Coin Flip")
      .setDescription(
        `It landed on **${outcome.toUpperCase()}**!\n\n` +
        `You picked **${userGuess.toUpperCase()}** — **${won ? "✅ You won!" : "❌ You lost!"}**`,
      )
      .setImage(`attachment://${filename}`)
      .setTimestamp();

    if (top3.length > 0) {
      embed.addFields({ name: "🏆 Top Players", value: leaderboardText.trim() });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("flip_heads")
        .setLabel("Heads")
        .setEmoji("🪙")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("flip_tails")
        .setLabel("Tails")
        .setEmoji("🪙")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("flip_leaderboard")
        .setLabel("Leaderboard")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📊"),
    );

    await interaction.update({ embeds: [embed], files: [attachment], components: [row] });
    return;
  }

  // ── FLIP: Show full leaderboard ──
  if (customId === "flip_leaderboard") {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "Leaderboard is only available in servers.", flags: MessageFlags.Ephemeral });
      return;
    }
    const board = await getLeaderboard(guildId);

    if (board.length === 0) {
      await interaction.reply({ content: "No flips recorded yet. Be the first!", flags: MessageFlags.Ephemeral });
      return;
    }

    const { EmbedBuilder } = await import("discord.js");

    // Split into chunks of 15 to stay under Discord's 1024-char field limit
    const lines = board.map((u, i) =>
      `**#${i + 1}** ${u.username} — ${u.wins}W ${u.losses}L (${u.winRate.toFixed(0)}%) ─ ${u.total} flips`,
    );

    const embed = new EmbedBuilder()
      .setColor(0xf5c542)
      .setTitle("📊 Coin Flip — Full Leaderboard")
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${board.length} player${board.length !== 1 ? "s" : ""} total` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // ── RPS: Cancel Challenge ──
  if (customId === "rps_cancel") {
    const game = rpsGame.getGame(channelId);

    if (!game) {
      await interaction.reply({ content: "No active challenge here!", flags: MessageFlags.Ephemeral });
      return;
    }
    if (game.challenger.id !== interaction.user.id) {
      await interaction.reply({ content: "Only the challenger can cancel!", flags: MessageFlags.Ephemeral });
      return;
    }

    rpsGame.endGame(channelId);
    await interaction.update({ content: "Challenge cancelled.", components: [] });
    return;
  }

  logger.warn(`Unhandled button: ${customId}`);
  await interaction.reply({ content: "Unrecognized button.", flags: MessageFlags.Ephemeral });
}

// ───── Select Menu Router ─────

async function handleSelectMenu(
  interaction: import("discord.js").StringSelectMenuInteraction,
) {
  if (interaction.customId !== "rps_choose") return;

  const game = rpsGame.getGame(interaction.channelId);
  if (!game) {
    await interaction.reply({ content: "This challenge is no longer active.", flags: MessageFlags.Ephemeral });
    return;
  }

  const chosenObject = interaction.values[0];

  // Register opponent's choice and calculate result
  game.opponent = { id: interaction.user.id, objectName: chosenObject };
  const result = rpsGame.calculateResult(game.challenger, game.opponent);
  rpsGame.endGame(interaction.channelId);

  // ── Update the original challenge message with the result ──
  // The stored sourceInteraction allows us to edit the original public
  // challenge post (which the select menu cannot reach directly).
  await game.sourceInteraction.editReply({
    content: `🎮 **Game Over!**\n${result}`,
    components: [],
  });

  // ── Also acknowledge the ephemeral select menu ──
  // Tells the accepting player their choice was registered.
  await interaction.update({
    content: `You picked **${capitalize(chosenObject)}**. Check the challenge message for the result!`,
    components: [],
  });
}
