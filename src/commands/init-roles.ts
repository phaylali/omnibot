import { randomInt } from "node:crypto";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  Colors,
} from "discord.js";
import { getGuildConfig } from "../lib/configStore.ts";
import { getRolesData, saveRolesData, sanitizeKey } from "../lib/rolesStore.ts";
import type { RoleGroup, RoleEntry } from "../lib/rolesStore.ts";
import { logger } from "../lib/logger.ts";

const EMOJI_POOL = [
  "🎮", "🎯", "⚔️", "🛡️", "🎲", "🎪", "🎨", "🎭",
  "🎸", "🎺", "🎻", "🎹", "🥁", "🎬", "🎤", "🎧",
  "🎼", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎷", "🎺",
  "🌍", "🌎", "🌏", "🗺️", "🏯", "🏰", "🌋", "🏝️",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱",
  "🚗", "🚀", "🛸", "✈️", "🚁", "🚂", "🚲", "🛴",
];

const GROUP_EMOJIS: [string, string][] = [
  ["language", "🌍"],
  ["fps", "🎯"],
  ["battle", "🏆"],
  ["gacha", "💎"],
  ["moba", "⚔️"],
  ["mmorpg", "🗺️"],
  ["sandbox", "⛏️"],
  ["survival", "⛏️"],
  ["sport", "⚽"],
  ["racing", "🏎️"],
  ["rp", "🎭"],
  ["open world", "🎭"],
  ["music", "🎵"],
  ["anime", "🌸"],
  ["tech", "💻"],
  ["creative", "🎨"],
];

const ROLE_COLORS = [
  Colors.Red, Colors.Blue, Colors.Green, Colors.Yellow, Colors.Purple,
  Colors.Orange, Colors.Fuchsia, Colors.Gold, Colors.Aqua, Colors.LuminousVividPink,
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function groupEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [kw, emoji] of GROUP_EMOJIS) {
    if (lower.includes(kw)) return emoji;
  }
  return "📁";
}

function chName(base: string, emoji: string): string {
  const cleaned = sanitizeKey(base).replace(/-/g, "");
  return `${emoji}${cleaned}`;
}

export const data = new SlashCommandBuilder()
  .setName("init-roles")
  .setDescription("Create or update a role group with toggle buttons")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((option) =>
    option
      .setName("group")
      .setDescription("The name of the role group (e.g. Languages, FPS)")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("roles")
      .setDescription("Comma-separated role names (e.g. English,Arabic,Tamazight)")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;
  const groupName = interaction.options.getString("group", true).trim();
  const rolesRaw = interaction.options.getString("roles", true);
  const roleNames = rolesRaw.split(",").map((r) => r.trim()).filter(Boolean);

  if (roleNames.length === 0) {
    await interaction.reply({ content: "❌ You must specify at least one role." });
    return;
  }

  if (roleNames.length > 20) {
    await interaction.reply({ content: "❌ Maximum 20 roles per group." });
    return;
  }

  await interaction.deferReply();

  const groupKey = sanitizeKey(groupName);
  const gEmoji = groupEmoji(groupName);
  const store = await getRolesData(guildId);
  const existing = store.groups[groupKey];

  let categoryId = existing?.categoryId ?? null;
  if (categoryId) {
    const cat = await guild.channels.fetch(categoryId).catch(() => null);
    if (!cat || cat.type !== ChannelType.GuildCategory) {
      categoryId = null;
    }
  }
  let messageId = existing?.messageId ?? null;
  let postedChannelId = existing?.channelId ?? null;

  const existingRoleMap = new Map<string, RoleEntry>(
    (existing?.roles ?? []).map((r) => [sanitizeKey(r.name), r]),
  );

  const roles: RoleEntry[] = [];
  const newChannelIds: string[] = [];

  for (const name of roleNames) {
    const key = sanitizeKey(name);
    const existingEntry = existingRoleMap.get(key);

    if (existingEntry) {
      const roleExists = existingEntry.roleId
        ? !!(await guild.roles.fetch(existingEntry.roleId).catch(() => null))
        : false;
      const channelExists = existingEntry.channelId
        ? !!(await guild.channels.fetch(existingEntry.channelId).catch(() => null))
        : false;

      if (roleExists && channelExists) {
        roles.push(existingEntry);
        continue;
      }

      // re-create missing role
      if (!roleExists) {
        const color = pick(ROLE_COLORS, roles.length);
        const discordRole = await guild.roles.create({
          name,
          color,
          reason: `Re-created by /init-roles for group ${groupName}`,
        });
        existingEntry.roleId = discordRole.id;
        await sleep(300);
      }

      // re-create missing channel
      if (!channelExists) {
        const roleEmoji = pick(EMOJI_POOL, roles.length);
        const discordRoleId = existingEntry.roleId!;
        const channel = await guild.channels.create({
          name: chName(name, roleEmoji),
          type: ChannelType.GuildText,
          parent: categoryId ?? undefined,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: discordRoleId, allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AddReactions,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.UseExternalEmojis,
              PermissionFlagsBits.UseApplicationCommands,
            ]},
          ],
          reason: `Re-created channel for role ${groupName}-${name}`,
        });
        existingEntry.channelId = channel.id;
        newChannelIds.push(channel.id);
        await sleep(300);
      }

      roles.push(existingEntry);
      continue;
    }

    const color = pick(ROLE_COLORS, roles.length);
    const discordRole = await guild.roles.create({
      name,
      color,
      reason: `Created by /init-roles for group ${groupName}`,
    });

    const roleEmoji = pick(EMOJI_POOL, roles.length);
    const channel = await guild.channels.create({
      name: chName(name, roleEmoji),
      type: ChannelType.GuildText,
      parent: categoryId ?? undefined,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: discordRole.id, allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.UseExternalEmojis,
          PermissionFlagsBits.UseApplicationCommands,
        ]},
      ],
      reason: `Channel for role ${discordRole.name}`,
    });

    newChannelIds.push(channel.id);
    roles.push({ name, roleId: discordRole.id, channelId: channel.id });

    await sleep(500);
  }

  // Ensure existing channels have emoji prefixes
  for (const r of roles) {
    if (!r.channelId) continue;
    const ch = guild.channels.cache.get(r.channelId);
    if (!ch) continue;
    const expectedEmoji = pick(EMOJI_POOL, roles.indexOf(r));
    if (!ch.name.startsWith(expectedEmoji)) {
      try {
        await ch.setName(chName(r.name, expectedEmoji), `Updating channel name with emoji`);
        await sleep(300);
      } catch { /* ignore if rename fails */ }
    }
  }

  // Create category if new group
  if (!categoryId) {
    const cat = await guild.channels.create({
      name: `${gEmoji}${sanitizeKey(groupName).replace(/-/g, "")}`,
      type: ChannelType.GuildCategory,
      reason: `Category for /init-roles group ${groupName}`,
    });
    categoryId = cat.id;

    for (const r of roles) {
      if (r.channelId) {
        const ch = guild.channels.cache.get(r.channelId);
        if (ch) await ch.setParent(cat.id, { lockPermissions: false });
      }
    }
  } else {
    const cat = guild.channels.cache.get(categoryId);
    if (cat && !cat.name.startsWith(gEmoji)) {
      try {
        await cat.setName(`${gEmoji}${sanitizeKey(groupName).replace(/-/g, "")}`, `Updating category name with emoji`);
      } catch { /* ignore */ }
    }
  }

  // Build embed + buttons
  const groupColor = pick(ROLE_COLORS, roles.length);
  const embed = new EmbedBuilder()
    .setColor(groupColor)
    .setTitle(groupName)
    .setDescription("Click a button below to get the role!\nClick again to remove it.")
    .setTimestamp();

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const key = sanitizeKey(role.name);
    const emoji = pick(EMOJI_POOL, i);

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`rt_${groupKey}_${key}`)
        .setLabel(role.name)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary),
    );

    if (currentRow.components.length === 5 || i === roles.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }
  }

  // Determine target channel
  const config = await getGuildConfig(guildId);
  const targetChannelId = config.roleChannelId || interaction.channelId;
  const targetChannel = guild.channels.cache.get(targetChannelId);
  if (!targetChannel?.isTextBased()) {
    await interaction.editReply({ content: "❌ Target channel not found or not a text channel." });
    return;
  }

  // Post or edit the message
  if (messageId && postedChannelId) {
    try {
      const oldMsg = await (await guild.channels.fetch(postedChannelId))?.messages.fetch(messageId);
      if (oldMsg?.editable) {
        await oldMsg.edit({ embeds: [embed], components: rows });
        await interaction.editReply({ content: `✅ Updated role group **${groupName}**.` });
        store.groups[groupKey] = { name: groupName, categoryId, messageId, channelId: postedChannelId, roles };
        await saveRolesData(guildId, store);
        return;
      }
    } catch { /* fall through to sending new */ }
  }

  const msg = await targetChannel.send({ embeds: [embed], components: rows });
  messageId = msg.id;
  postedChannelId = targetChannel.id;

  store.groups[groupKey] = { name: groupName, categoryId, messageId, channelId: postedChannelId, roles };
  await saveRolesData(guildId, store);

  const count = newChannelIds.length;
  const summary = count > 0
    ? `Created ${count} new role${count > 1 ? "s" : ""} and channel${count > 1 ? "s" : ""}.`
    : "All roles already exist. Updated the embed.";

  await interaction.editReply({ content: `✅ Role group **${groupName}** is ready. ${summary}` });
  logger.info(`/init-roles ${groupName} (${roleNames.length} roles) in guild ${guildId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
