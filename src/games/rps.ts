/**
 * =============================================================================
 * ROCK-PAPER-SCISSORS GAME ENGINE
 * Manages game state and determines winners for the RPS challenge.
 *
 * Each object beats 3 others. The rules are defined in RPS_CHOICES.
 * Game state is stored in a Map (channelId → game data) so multiple
 * games can run simultaneously in different channels.
 * =============================================================================
 */

import { Collection, ChatInputCommandInteraction } from "discord.js";
import { capitalize } from "../utils/helpers.ts";
import { logger } from "../lib/logger.ts";

// ───── Types ─────

interface RPSPlayer {
  id: string;
  objectName: string;
}

interface RPSGame {
  challenger: RPSPlayer;
  opponent: RPSPlayer | null;
  /** The challenger's original interaction — used to edit the challenge message later */
  sourceInteraction: ChatInputCommandInteraction;
}

// ───── Win/Loss Rules ─────

/**
 * Key: object name → { [victim]: "verb describing the action" }
 * If object X has an entry for Y, then X beats Y.
 */
const RPS_CHOICES: Record<string, Record<string, string>> = {
  rock:     { virus: "outwaits", computer: "smashes", scissors: "crushes" },
  cowboy:   { scissors: "puts away", wumpus: "lassos", rock: "steel-toe kicks" },
  scissors: { paper: "cuts", computer: "cuts cord of", virus: "cuts DNA of" },
  virus:    { cowboy: "infects", computer: "corrupts", wumpus: "infects" },
  computer: { cowboy: "overwhelms", paper: "uninstalls firmware for", wumpus: "deletes assets for" },
  wumpus:   { paper: "draws on", rock: "paints face on", scissors: "admires reflection in" },
  paper:    { virus: "ignores", cowboy: "papercuts", rock: "covers" },
};

// ───── Game State Manager ─────

class RPSGameManager {
  private games = new Collection<string, RPSGame>();

  /** Returns the list of valid object names */
  getChoices(): string[] {
    return Object.keys(RPS_CHOICES);
  }

  /** Creates a new game in the given channel */
  createGame(
    channelId: string,
    challenger: {
      id: string;
      objectName: string;
      interaction: ChatInputCommandInteraction;
    },
  ): void {
    this.games.set(channelId, {
      challenger: { id: challenger.id, objectName: challenger.objectName },
      opponent: null,
      sourceInteraction: challenger.interaction,
    });
    logger.debug(`RPS game created in channel ${channelId}`);
  }

  /** Gets the active game in a channel (if any) */
  getGame(channelId: string): RPSGame | undefined {
    return this.games.get(channelId);
  }

  /** Removes a completed/cancelled game */
  endGame(channelId: string): void {
    this.games.delete(channelId);
    logger.debug(`RPS game ended in channel ${channelId}`);
  }

  /** Calculates the winner and returns a formatted Discord string */
  calculateResult(p1: RPSPlayer, p2: RPSPlayer): string {
    const winner = this.findWinner(p1, p2);

    if (!winner) {
      return `<@${p1.id}> and <@${p2.id}> draw with **${capitalize(p1.objectName)}**`;
    }

    const [winnerPlayer, loserPlayer, verb] = winner;
    return `<@${winnerPlayer.id}>'s **${capitalize(winnerPlayer.objectName)}** ${verb} <@${loserPlayer.id}>'s **${capitalize(loserPlayer.objectName)}**`;
  }

  /** Returns shuffled options for the select menu */
  getShuffledOptions(): { label: string; value: string; description: string }[] {
    const options = this.getChoices().map((choice) => ({
      label: capitalize(choice),
      value: choice.toLowerCase(),
      description: (RPS_CHOICES[choice] as Record<string, string>).description ?? "",
    }));

    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return options;
  }

  /** Returns [winner, loser, verb] or null if tie */
  private findWinner(
    p1: RPSPlayer,
    p2: RPSPlayer,
  ): [RPSPlayer, RPSPlayer, string] | null {
    const p1Beats = RPS_CHOICES[p1.objectName]?.[p2.objectName];
    if (p1Beats) return [p1, p2, p1Beats];

    const p2Beats = RPS_CHOICES[p2.objectName]?.[p1.objectName];
    if (p2Beats) return [p2, p1, p2Beats];

    return null;
  }
}

/** Shared singleton — import this wherever you need game access */
export const rpsGame = new RPSGameManager();
