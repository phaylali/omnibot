import { randomInt } from "node:crypto";
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { globalRead } from "../lib/store.ts";
import { recordQuiz, getQuizTopN } from "../lib/quizStats.ts";

interface LetterEntry {
  tifinagh: string;
  arabic: string;
  latin: string;
}

const LETTERS_FILE = "tifinagh-letters.json";

let lettersCache: LetterEntry[] | null = null;

async function loadLetters(): Promise<LetterEntry[]> {
  if (lettersCache) return lettersCache;
  const data = await globalRead<LetterEntry[]>(LETTERS_FILE, []);
  lettersCache = data;
  return data;
}

function pickRandom<T>(arr: T[], count: number, exclude?: T): T[] {
  const pool = exclude ? arr.filter((x) => x !== exclude) : [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randomInt(pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

interface QuizSession {
  userId: string;
  guildId: string | null;
  username: string;
  mode: "tifinagh" | "tifinagh-2";
}

interface QuizState {
  session: QuizSession;
  correctIndex: number;
  answered: boolean;
}

const quizSessions = new Map<string, QuizState>();

function makeQuestion(
  letters: LetterEntry[],
  mode: "tifinagh" | "tifinagh-2",
): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder>; correctIndex: number } {
  const answer = letters[randomInt(letters.length)];
  const distractors = pickRandom(letters, 3, answer);
  const choices = [answer, ...distractors].sort(() => randomInt(3) - 1);
  const correctIndex = choices.indexOf(answer);

  const description = mode === "tifinagh"
    ? `Which Tifinagh letter matches **${answer.arabic}** / **${answer.latin}**?`
    : `Which Arabic/Latin pair matches **${answer.tifinagh}**?`;

  const labelParts = choices.map((c) =>
    mode === "tifinagh" ? c.tifinagh : `${c.arabic} / ${c.latin}`,
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🧮 Tifinagh Quiz")
    .setDescription(description);

  const prefix = mode === "tifinagh" ? "quiz_a_" : "quiz_b_";
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    labelParts.map((label, i) =>
      new ButtonBuilder()
        .setCustomId(`${prefix}${i}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary),
    ),
  );

  return { embed, row, correctIndex };
}

async function showResult(
  interaction: ButtonInteraction,
  state: QuizState,
  choice: number,
): Promise<void> {
  const correct = choice === state.correctIndex;
  state.answered = true;

  if (state.session.guildId) {
    await recordQuiz(state.session.guildId, state.session.userId, state.session.username, correct);
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  if (correct) {
    embed.setColor(0x57f287).setTitle("✅ Correct!");
  } else {
    embed.setColor(0xed4245).setTitle(`❌ Wrong! Answer was option #${state.correctIndex + 1}`);
  }

  if (state.session.guildId) {
    const top3 = await getQuizTopN(state.session.guildId, 3);
    if (top3.length > 0) {
      const lines = top3.map((u, i) =>
        `**#${i + 1}** ${u.username} — ${u.correct}/${u.total} (${u.winRate.toFixed(0)}%)`,
      );
      embed.addFields({ name: "🏆 Top Players", value: lines.join("\n") });
    }
  }

  const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    interaction.message.components[0].components.map((comp) =>
      ButtonBuilder.from(comp).setDisabled(true),
    ),
  );

  const nextRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("quiz_next")
      .setLabel("Next Question")
      .setStyle(ButtonStyle.Success)
      .setEmoji("➡️"),
  );

  await interaction.update({ embeds: [embed], components: [disabledRow, nextRow] });
}

export async function handleQuizButton(interaction: ButtonInteraction): Promise<void> {
  const state = quizSessions.get(interaction.message.id);
  if (!state) {
    await interaction.reply({ content: "This quiz session expired.", ephemeral: true });
    return;
  }
  if (state.session.userId !== interaction.user.id) {
    await interaction.reply({ content: "This quiz isn't for you. Run `/quiz` yourself!", ephemeral: true });
    return;
  }
  if (state.answered) {
    await interaction.reply({ content: "You already answered this one!", ephemeral: true });
    return;
  }

  const choice = parseInt(interaction.customId.replace("quiz_a_", "").replace("quiz_b_", ""), 10);
  if (isNaN(choice)) return;

  await showResult(interaction, state, choice);
}

export async function handleQuizNext(interaction: ButtonInteraction): Promise<void> {
  const state = quizSessions.get(interaction.message.id);
  if (!state || !state.answered) {
    await interaction.reply({ content: "Answer the current question first!", ephemeral: true });
    return;
  }
  if (state.session.userId !== interaction.user.id) {
    await interaction.reply({ content: "This quiz isn't for you.", ephemeral: true });
    return;
  }

  const letters = await loadLetters();
  if (letters.length < 4) {
    await interaction.reply({ content: "Not enough letters loaded.", ephemeral: true });
    return;
  }

  const { embed, row, correctIndex } = makeQuestion(letters, state.session.mode);
  quizSessions.set(interaction.message.id, {
    session: state.session,
    correctIndex,
    answered: false,
  });

  await interaction.update({ embeds: [embed], components: [row] });
}

export const data = new SlashCommandBuilder()
  .setName("quiz")
  .setDescription("Tifinagh trivia quiz")
  .addSubcommand((s) =>
    s
      .setName("tifinagh")
      .setDescription("Given an Arabic/Latin pair, pick the correct Tifinagh letter"),
  )
  .addSubcommand((s) =>
    s
      .setName("tifinagh-2")
      .setDescription("Given a Tifinagh letter, pick the correct Arabic/Latin pair"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand(true) as "tifinagh" | "tifinagh-2";
  const letters = await loadLetters();

  if (letters.length < 4) {
    await interaction.reply({ content: "Not enough letters loaded for a quiz." });
    return;
  }

  const { embed, row, correctIndex } = makeQuestion(letters, sub);

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row],
    withResponse: true,
  });

  const msg = reply.resource?.message;
  if (msg) {
    const session: QuizSession = {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      username: interaction.user.globalName ?? interaction.user.username,
      mode: sub,
    };

    quizSessions.set(msg.id, { session, correctIndex, answered: false });
  }
}
