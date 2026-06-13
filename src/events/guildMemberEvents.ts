import { Client, Events, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../lib/configStore.ts";
import { logger } from "../lib/logger.ts";

const SASSY_GOODBYES = [
  "😔 one more lost soul...",
  "😔 another one bites the dust.",
  "😔 they couldn't handle the omniverse.",
  "😔 one less frazzle to dazzle.",
  "😔 the void called them back.",
  "😔 they went to touch grass.",
  "😔 the council has been informed of their departure.",
  "😔 we'll always have the logs.",
];

async function resolveChannel(guild: import("discord.js").Guild, id: string) {
  const cached = guild.channels.cache.get(id);
  if (cached?.isTextBased()) {
    console.log(`[resolveChannel] Cache hit for ${id}`);
    return cached;
  }
  try {
    const fetched = await Promise.race([
      guild.channels.fetch(id),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("fetch timeout")), 5000),
      ),
    ]);
    if (fetched?.isTextBased()) {
      console.log(`[resolveChannel] Fetch success for ${id}`);
      return fetched;
    }
  } catch (err) {
    console.log(`[resolveChannel] Fetch fail for ${id}: ${err}`);
  }
  return null;
}

export function registerGuildMemberEvents(client: Client): void {
  logger.info("Registering guild member event listeners");

  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      logger.debug(`GuildMemberAdd: ${member.user.tag} joined ${member.guild.id}`);
      if (member.user.bot) return;

      const config = await getGuildConfig(member.guild.id);
      const channelId = config.welcomeChannelId || config.defaultChannelId;
      if (!channelId) {
        logger.debug(`No welcome channel configured for guild ${member.guild.id}`);
        return;
      }

      const channel = await resolveChannel(member.guild, channelId);
      if (!channel) {
        logger.warn(`Welcome channel ${channelId} not found for guild ${member.guild.id}`);
        return;
      }

      const count = member.guild.memberCount;
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("🪐 New arrival detected")
        .setDescription(
          `Welcome ${member}, ⴰⵣⵓⵍ, مرحبا!\nYou are the **${ordinal(count)}** piece of the omniversal puzzle.`,
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(`Welcome sent to ${member.user.tag} in guild ${member.guild.id}`);
    } catch (err) {
      logger.error(`Welcome handler error: ${err}`);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      logger.debug(`GuildMemberRemove: ${member.user.tag} left ${member.guild.id}`);
      if (member.user.bot) {
        logger.debug(`GuildMemberRemove: bot member skipped`);
        return;
      }

      const config = await getGuildConfig(member.guild.id);
      const channelId = config.welcomeChannelId || config.defaultChannelId;
      logger.debug(`GuildMemberRemove: channelId resolved to ${channelId}`);
      if (!channelId) {
        logger.debug(`No welcome channel configured for guild ${member.guild.id}`);
        return;
      }

      console.log(`[GuildMemberRemove] Resolving channel ${channelId} in guild ${member.guild.id}`);
      const channel = await resolveChannel(member.guild, channelId);
      console.log(`[GuildMemberRemove] resolveChannel returned: ${channel ? channel.id : "null"}`);
      if (!channel) {
        logger.warn(`Welcome channel ${channelId} not found for guild ${member.guild.id}`);
        return;
      }

      const msg = SASSY_GOODBYES[Math.floor(Math.random() * SASSY_GOODBYES.length)];

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(`${msg}\n*— ${member.user.tag}*`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(`Goodbye sent for ${member.user.tag} in guild ${member.guild.id}`);
    } catch (err) {
      logger.error(`Goodbye handler error: ${err}`);
    }
  });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}
