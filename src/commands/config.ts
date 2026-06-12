/**
 * =============================================================================
 * /config COMMAND
 * Server configuration command. Only users with Manage Server permission
 * or Administrator can use this.
 *
 * Subcommands:
 *   /config setchannel #channel  — Set the channel for bot online notifications
 *   /config channel              — Show the currently configured channel
 * =============================================================================
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { setDefaultChannel, getGuildConfig } from "../lib/configStore.ts";
import { logger } from "../lib/logger.ts";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure bot settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName("setchannel")
      .setDescription("Set the channel for bot online notifications")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The text channel to use")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("channel")
      .setDescription("Show the currently configured notification channel"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // This command is guild-only (DMPermission false), so guild is always available
  const guildId = interaction.guildId!;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "setchannel") {
    const channel = interaction.options.getChannel("channel", true);

    await setDefaultChannel(guildId, channel.id);

    logger.info(
      `Default channel set to #${channel.name} (${channel.id}) in guild ${guildId}`,
    );

    await interaction.reply({
      content: `✅ Online notifications will now be posted to <#${channel.id}>.`,
    });
  }

  if (subcommand === "channel") {
    const config = await getGuildConfig(guildId);

    if (config.defaultChannelId) {
      await interaction.reply({
        content: `📢 Online notifications are set to <#${config.defaultChannelId}>.`,
      });
    } else {
      await interaction.reply({
        content: "❌ No notification channel is configured yet. Use `/config setchannel #channel` to set one.",
      });
    }
  }
}
