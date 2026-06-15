/**
 * =============================================================================
 * COMMAND INDEX
 * Re-exports all command modules so the loader and deploy script can
 * iterate over them without knowing individual file names.
 *
 * To add a new command:
 *   1. Create src/commands/<name>.ts with `data` and `execute` exports
 *   2. Import and add it to the `commandList` array below
 * That's it — the loader handles the rest.
 * =============================================================================
 */

import type { Command } from "../types.ts";

import * as test from "./test.ts";
import * as challenge from "./challenge.ts";
import * as userinfo from "./userinfo.ts";
import * as flip from "./flip.ts";
import * as config from "./config.ts";
import * as help from "./help.ts";
import * as tifinagh from "./tifinagh.ts";
import * as dadjoke from "./dadjoke.ts";
import * as freegames from "./freegames.ts";
import * as hug from "./hug.ts";
import * as slap from "./slap.ts";
import * as bonk from "./bonk.ts";
import * as pet from "./pet.ts";
import * as quiz from "./quiz.ts";
import * as xp from "./xp.ts";
import * as leaderboard from "./leaderboard.ts";

/** Ordered list of all commands. The loader uses this to register them. */
export const commandList: Command[] = [test, challenge, userinfo, flip, config, help, tifinagh, dadjoke, freegames, hug, slap, bonk, pet, quiz, xp, leaderboard];
