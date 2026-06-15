import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import {
  setDefaultChannel,
  setWelcomeChannel,
  getGuildConfig,
  addRssFeed,
  removeRssFeed,
  setRssInterval,
  setWordChannel,
  setWordInterval,
} from "../lib/configStore.ts";
import { WordMonitor } from "../services/wordMonitor.ts";
import { logger } from "../lib/logger.ts";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

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
      )
      .addSubcommand((sub) =>
        sub
          .setName("setwelcome")
          .setDescription("Set the channel for welcome/leave messages")
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
          .setName("welcome")
          .setDescription("Show the currently configured welcome channel"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("testwelcome")
          .setDescription("Test the welcome/leave system by sending a sample message"),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("word")
      .setDescription("Word of the Day settings")
      .addSubcommand((sub) =>
        sub
          .setName("channel")
          .setDescription("Set the channel for Word of the Day messages")
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
          .setName("interval")
          .setDescription("Set how often a random word is posted (hours)")
          .addIntegerOption((option) =>
            option
              .setName("hours")
              .setDescription("Hours between posts (min 1, max 24)")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(24),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("now")
          .setDescription("Send a random Tifinagh word now"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("status")
          .setDescription("Show current Word of the Day settings"),
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

    if (subcommand === "setwelcome") {
      const channel = interaction.options.getChannel("channel", true);
      await setWelcomeChannel(guildId, channel.id);
      logger.info(`Welcome channel set to #${channel.name} (${channel.id}) in guild ${guildId}`);
      await interaction.reply({
        content: `✅ Welcome/leave messages will now be posted to <#${channel.id}>.`,
      });
      return;
    }

    if (subcommand === "welcome") {
      const config = await getGuildConfig(guildId);
      const cid = config.welcomeChannelId || config.defaultChannelId;
      if (cid) {
        await interaction.reply({
          content: `👋 Welcome messages are set to <#${cid}>${config.welcomeChannelId ? "" : " *(falling back to notification channel)*"}.`,
        });
      } else {
        await interaction.reply({
          content: "❌ No welcome channel is configured yet. Use `/config notify setwelcome #channel` to set one.",
        });
      }
      return;
    }

    if (subcommand === "testwelcome") {
      await interaction.deferReply({ ephemeral: true });
      const config = await getGuildConfig(guildId);
      const cid = config.welcomeChannelId || config.defaultChannelId;
      if (!cid) {
        await interaction.editReply({ content: "❌ No welcome channel configured. Set one first with `/config notify setwelcome #channel`." });
        return;
      }

      const channel = interaction.guild?.channels.cache.get(cid);
      if (!channel?.isTextBased()) {
        await interaction.editReply({ content: `❌ Channel <#${cid}> is not available or not a text channel.` });
        return;
      }

      try {
        const testEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🪐 Test — New arrival")
          .setDescription(
            `Welcome ${interaction.user}, ⴰⵣⵓⵍ, مرحبا!\nYou are the **${ordinal(interaction.guild!.memberCount)}** piece of the omniversal puzzle.`,
          )
          .setThumbnail(interaction.user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [testEmbed] });

        const leaveEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription(`😔 test mode — one more lost soul...\n*— ${interaction.user.tag}*`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [leaveEmbed] });

        await interaction.editReply({
          content: `✅ Test messages sent to <#${cid}>. If you don't see them, the bot may be missing the **Server Members Intent** in the Discord Developer Portal.`,
        });
      } catch (err) {
        logger.error(`Test welcome failed: ${err}`);
        await interaction.editReply({
          content: `❌ Failed to send test messages: ${err}`,
        }).catch(() => {});
      }
      return;
    }
  }

  if (group === "word") {
    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel", true);
      await setWordChannel(guildId, channel.id);
      logger.info(`Word channel set to #${channel.name} (${channel.id}) in guild ${guildId}`);
      await interaction.reply({
        content: `✅ Word of the Day will now be posted to <#${channel.id}>.`,
      });
      return;
    }

    if (subcommand === "interval") {
      const hours = interaction.options.getInteger("hours", true);
      await setWordInterval(guildId, hours);
      logger.info(`Word interval set to ${hours}h in guild ${guildId}`);
      await interaction.reply({
        content: `✅ Word of the Day will now be posted every **${hours}** hour(s).`,
      });
      return;
    }

    if (subcommand === "now") {
      await interaction.deferReply({ ephemeral: true });
      const wordMonitor = new WordMonitor(interaction.client);
      const ok = await wordMonitor.sendNow(guildId);
      if (ok) {
        await interaction.editReply({ content: "✅ Random word sent to the configured channel." });
      } else {
        await interaction.editReply({ content: "❌ No Word of the Day channel configured. Use `/config word channel #channel` first." });
      }
      return;
    }

    if (subcommand === "status") {
      const config = await getGuildConfig(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle("📖 Word of the Day");
      if (config.wordChannelId) {
        embed.setDescription(`Channel: <#${config.wordChannelId}>\nInterval: **${config.wordIntervalHours}** hour(s)`);
      } else {
        embed.setDescription("❌ Not configured. Use `/config word channel #channel` to set up.");
      }
      await interaction.reply({ embeds: [embed] });
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
