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

/** Ordered list of all commands. The loader uses this to register them. */
export const commandList: Command[] = [test, challenge, userinfo, flip, config];
