import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import {
  setDefaultChannel,
  getGuildConfig,
  addRssFeed,
  removeRssFeed,
  setRssInterval,
} from "../lib/configStore.ts";
import { logger } from "../lib/logger.ts";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure bot settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommandGroup((group) =>
    group
      .setName("notify")
      .setDescription("Notification channel settings")
      .addSubcommand((sub) =>
        sub
          .setName("setchannel")
          .setDescription("Set the channel for bot online/ready notifications")
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
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("rss")
      .setDescription("RSS feed monitoring settings")
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription("Add an RSS/Atom feed to monitor")
          .addStringOption((option) =>
            option
              .setName("url")
              .setDescription("The RSS/Atom feed URL")
              .setRequired(true),
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("Channel to post updates (defaults to current channel)")
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription("Remove a monitored RSS feed")
          .addStringOption((option) =>
            option
              .setName("url")
              .setDescription("The RSS/Atom feed URL to remove")
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("list")
          .setDescription("List all monitored RSS feeds"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("interval")
          .setDescription("Set how often feeds are checked (minutes)")
          .addIntegerOption((option) =>
            option
              .setName("minutes")
              .setDescription("Check interval in minutes (min 1, max 1440)")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(1440),
          ),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const subcommand = interaction.options.getSubcommand();
  const group = interaction.options.getSubcommandGroup();

  if (group === "notify") {
    if (subcommand === "setchannel") {
      const channel = interaction.options.getChannel("channel", true);
      await setDefaultChannel(guildId, channel.id);
      logger.info(`Notify channel set to #${channel.name} (${channel.id}) in guild ${guildId}`);
      await interaction.reply({
        content: `✅ Online notifications will now be posted to <#${channel.id}>.`,
      });
      return;
    }

    if (subcommand === "channel") {
      const config = await getGuildConfig(guildId);
      if (config.defaultChannelId) {
        await interaction.reply({
          content: `📢 Online notifications are set to <#${config.defaultChannelId}>.`,
        });
      } else {
        await interaction.reply({
          content: "❌ No notification channel is configured yet. Use `/config notify setchannel #channel` to set one.",
        });
      }
      return;
    }
  }

  if (group === "rss") {
    if (subcommand === "add") {
      const url = interaction.options.getString("url", true);
      const channel = interaction.options.getChannel("channel") ?? interaction.channel;

      if (!channel || !("id" in channel)) {
        await interaction.reply({ content: "❌ Could not determine the target channel." });
        return;
      }

      try {
        new URL(url);
      } catch {
        await interaction.reply({ content: "❌ That doesn't look like a valid URL. Include `https://`." });
        return;
      }

      const added = await addRssFeed(guildId, url, channel.id);
      if (!added) {
        await interaction.reply({ content: "⚠️ That feed URL is already being monitored." });
        return;
      }

      logger.info(`RSS feed added: ${url} -> #${"name" in channel ? channel.name : channel.id} (guild ${guildId})`);
      await interaction.reply({
        content: `✅ Added RSS feed. New posts will be posted to <#${channel.id}>.\n⏱  Feed is checked every ${(await getGuildConfig(guildId)).rssIntervalMinutes} minutes.`,
      });
      return;
    }

    if (subcommand === "remove") {
      const url = interaction.options.getString("url", true);
      const removed = await removeRssFeed(guildId, url);
      if (!removed) {
        await interaction.reply({ content: "❌ That feed URL is not in the monitored list." });
        return;
      }

      logger.info(`RSS feed removed: ${url} (guild ${guildId})`);
      await interaction.reply({ content: `✅ Removed RSS feed: \`${url}\`` });
      return;
    }

    if (subcommand === "list") {
      const config = await getGuildConfig(guildId);

      if (config.rssFeeds.length === 0) {
        await interaction.reply({ content: "📭 No RSS feeds are being monitored. Use `/config rss add <url>` to add one." });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle("📡 Monitored RSS Feeds")
        .setDescription(`Check interval: **${config.rssIntervalMinutes}** minutes`)
        .setFooter({ text: `Total: ${config.rssFeeds.length} feed(s)` });

      for (const feed of config.rssFeeds) {
        const lastCheck = feed.lastCheck
          ? `<t:${Math.floor(feed.lastCheck / 1000)}:R>`
          : "Never";
        embed.addFields({
          name: feed.url,
          value: `Channel: <#${feed.channelId}> · Last check: ${lastCheck}`,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "interval") {
      const minutes = interaction.options.getInteger("minutes", true);
      await setRssInterval(guildId, minutes);
      logger.info(`RSS interval set to ${minutes} min (guild ${guildId})`);
      await interaction.reply({
        content: `✅ RSS feeds will now be checked every **${minutes}** minute(s).`,
      });
      return;
    }
  }
}
