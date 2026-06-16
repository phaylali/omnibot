import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { getRolesData, sanitizeKey } from "../lib/rolesStore.ts";
import { logger } from "../lib/logger.ts";

const EMOJI_POOL = [
  "🎮", "🎯", "⚔️", "🛡️", "🎲", "🎪", "🎨", "🎭",
  "🎸", "🎺", "🎻", "🎹", "🥁", "🎬", "🎤", "🎧",
  "🎼", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎷", "🎺",
  "🌍", "🌎", "🌏", "🗺️", "🏯", "🏰", "🌋", "🏝️",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱",
  "🚗", "🚀", "🛸", "✈️", "🚁", "🚂", "🚲", "🛴",
];

const COLORS = [
  0xed4245, 0x5865f2, 0x57f287, 0xfee75c, 0x9b59b6,
  0xe67e22, 0xf1c40f, 0x2ecc71, 0x3498db, 0xe91e63,
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export const data = new SlashCommandBuilder()
  .setName("show-roles")
  .setDescription("Show role group selection embeds")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((option) =>
    option
      .setName("group")
      .setDescription("Show only a specific group")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;
  const filterGroup = interaction.options.getString("group")?.trim();

  const store = await getRolesData(guildId);
  const entries = Object.entries(store.groups);

  if (entries.length === 0) {
    await interaction.reply({ content: "📭 No role groups exist yet. Use `/init-roles` to create one." });
    return;
  }

  const groupName = filterGroup ? sanitizeKey(filterGroup) : null;

  let sent = 0;
  for (const [key, group] of entries) {
    if (groupName && key !== groupName) continue;

    const embed = new EmbedBuilder()
      .setColor(pick(COLORS, sent))
      .setTitle(group.name)
      .setDescription("Click a button below to get the role!\nClick again to remove it.")
      .setTimestamp();

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < group.roles.length; i++) {
      const role = group.roles[i];
      const roleKey = sanitizeKey(role.name);
      const emoji = pick(EMOJI_POOL, i);

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`rt_${key}_${roleKey}`)
          .setLabel(role.name)
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Secondary),
      );

      if (currentRow.components.length === 5 || i === group.roles.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
    }

    if (sent === 0) {
      await interaction.reply({ embeds: [embed], components: rows });
    } else {
      await interaction.followUp({ embeds: [embed], components: rows });
    }
    sent++;
  }

  if (sent === 0) {
    await interaction.reply({ content: `❌ Group "${filterGroup}" not found.` });
  }

  logger.info(`/show-roles displayed ${sent} group(s) in guild ${guildId}`);
}
