import { Events, Message } from "discord.js";
import type { Client } from "discord.js";
import { addMessageXp } from "../lib/xpStore.ts";
import { getGuildConfig } from "../lib/configStore.ts";
import { logger } from "../lib/logger.ts";

export function registerXpEvents(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const result = await addMessageXp(
      message.guild.id,
      message.author.id,
      message.author.globalName ?? message.author.username,
      message.content,
    );

    if (!result) return;

    if (result.newLevel > result.oldLevel) {
      const levelNames = [
        "1st Dimension",
        "2nd Dimension",
        "3rd Dimension",
        "4th Dimension",
        "5th Dimension",
        "6th Dimension",
        "7th Dimension",
        "8th Dimension",
        "9th Dimension",
        "10th Dimension",
        "11th Dimension",
        "12th Dimension",
        "13th Dimension",
        "14th Dimension",
        "15th Dimension",
        "16th Dimension",
        "17th Dimension",
        "18th Dimension",
        "19th Dimension",
        "20th Dimension",
      ];

      const levelName = levelNames[result.newLevel] ?? `Level ${result.newLevel}`;
      const config = await getGuildConfig(message.guild.id);
      const cid = config.rankChannelId || config.onlineChannelId;
      const channel = cid
        ? message.guild.channels.cache.get(cid)
        : null;

      if (channel?.isTextBased()) {
        await channel.send(
          `✨ **Congrats <@${message.author.id}>!** You are now at the **${levelName}** ✨`,
        );
      }
    }
  });

  logger.debug("XP events registered");
}
