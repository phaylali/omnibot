# Developer Notes — Omnibot

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   index.ts                       │
│  Creates Client → loads commands → registers    │
│  handlers → client.login()                       │
└────────────┬─────────────────────────┬───────────┘
             │                         │
             ▼                         ▼
┌──────────────────────┐  ┌───────────────────────┐
│  commands/_index.ts   │  │ events/interaction    │
│  (command registry)   │  │ Create.ts             │
│                      │  │ (interaction router)  │
│  test.ts             │  │                       │
│  challenge.ts        │  │  slash commands  →    │
│  userinfo.ts         │  │  commands/{name}.ts   │
└──────────────────────┘  │                       │
                          │  buttons/menus   →    │
┌──────────────────────┐  │  games/rps.ts         │
│  games/rps.ts         │  └───────────────────────┘
│  game state + logic   │
└──────────────────────┘
```

## Why This Architecture

### Modular Command Pattern
The industry standard for discord.js bots. Each command is a standalone module that exports `data` (the `SlashCommandBuilder` definition) and `execute` (the handler function). Benefits:

- **Self-contained** — adding a new command means adding one file + one import
- **Lazy-loading ready** — can be extended to dynamic imports for large bots
- **Testable** — each command can be unit-tested independently
- **Collaboration-friendly** — multiple people can work on different commands without merge conflicts

### Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| `index.ts` | Boot sequence only — create client, wire up modules, login |
| `commands/*.ts` | Slash command definitions + handlers (pure logic, no routing) |
| `events/interactionCreate.ts` | Routes interactions to the right handler based on type |
| `games/rps.ts` | Game state + business logic (framework-agnostic) |
| `lib/commandLoader.ts` | Iterates command list and populates `client.commands` Collection |
| `config.ts` | Single source of truth for all env vars |

## File-by-File Breakdown

### `src/index.ts` — Entry Point

Minimal bootstrapper. Does 4 things in order:
1. Creates the `Client` with `GatewayIntentBits.Guilds`
2. Calls `loadCommands(client)` to populate `client.commands`
3. Calls `registerInteractionHandler(client)` to wire up the event listener
4. Calls `client.login()`

No business logic lives here — it's pure orchestration.

### `src/config.ts` — Configuration

Centralizes all `process.env` reads with sensible defaults. Every other module imports from here rather than reading `process.env` directly. This makes:
- **Testing easier** — you can mock the config module
- **Validation clearer** — missing env vars are obvious at import time
- **Refactoring cleaner** — one file to change if env var names change

### `src/types.ts` — Shared Types

Defines the `Command` interface that every command module must conform to. Also declares module augmentation on `discord.js.Client` to add custom properties (`commands`, `activeGames`, `componentHandlers`).

### `src/commands/` — Command Modules

Each file follows the same contract:

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("command_name")
  .setDescription("Description shown in Discord UI")
  // .addStringOption(...) etc.

export async function execute(interaction: ChatInputCommandInteraction) {
  // Handle the command
}
```

**`_index.ts`** is the registry — you add new commands here. The loader iterates this list to avoid dynamic filesystem scanning (which is fragile and hard to test).

### `src/events/interactionCreate.ts` — Interaction Router

Single event listener that checks `interaction.type` and dispatches:
- `ChatInputCommand` → looks up `interaction.client.commands.get(name)` and calls `.execute()`
- `Button` → checks `customId` prefix and calls the appropriate handler
- `StringSelectMenu` → checks `customId` and calls the appropriate handler

Game-specific component handling (RPS buttons/selects) lives here rather than in the command file because:
- Component interactions don't have a `commandName` — they're not commands
- Multiple commands could register components with overlapping `customId` patterns
- Centralizing avoids circular imports

### `src/games/rps.ts` — RPS Engine

A `class RPSGameManager` wraps all game state and logic:

- **State**: `Collection<string, RPSGame>` keyed by channel ID
- **`createGame()`** — registers a new challenge
- **`calculateResult()`** — compares two choices against the `RPS_CHOICES` rule table
- **`getShuffledOptions()`** — returns random-order select menu options

The manager is exported as a singleton (`rpsGame`) so both the challenge command and the interaction handler can access the same state.

### `src/lib/commandLoader.ts` — Command Loader

Iterates `commandList` from `commands/_index.ts` and populates `client.commands` (a `Collection<string, Command>`). This is intentionally simple — if you need dynamic loading later, the interface doesn't change.

### `src/lib/logger.ts` — Logger

Thin wrapper around `console` with timestamps and level prefixes. Format: `[YYYY-MM-DD HH:MM:SS] [LEVEL] message`. Levels: `info`, `warn`, `error`, `debug`.

### `src/utils/helpers.ts` — Pure Utility Functions

Stateless helper functions: `getRandomEmoji()`, `capitalize()`, `randomItem()`, `formatDate()`. No Discord imports — these are pure functions that could be used in any project.

### `src/utils/discordApi.ts` — REST API Wrapper

Raw `fetch` wrapper for Discord's v10 REST API. Used only by `deploy.ts` for command registration. The main bot uses discord.js's built-in REST client instead.

## Interaction Flow: RPS Game

```
1. User A runs /challenge rock
   ├─ challenge.ts stores game via rpsGame.createGame(channelId, { id, objectName, interaction })
   └─ Bot replies: "User A challenges you! [Accept] [Cancel]"

2. User B clicks "Accept Challenge"
   ├─ interactionCreate.ts: handleButton → customId "rps_accept"
   ├─ Validates: game exists? not self-challenge?
   └─ Sends ephemeral select menu to User B

3. User B clicks "Cancel"
   ├─ interactionCreate.ts: handleButton → customId "rps_cancel"
   ├─ Validates: only challenger can cancel
   └─ Updates original message: "Challenge cancelled."

4. User B picks "scissors" from select menu
   ├─ interactionCreate.ts: handleSelectMenu → customId "rps_choose"
   ├─ rpsGame.calculateResult(challenger, opponent)
   ├─ rpsGame.endGame(channelId)
   └─ Updates original message: "User A's Rock crushes User B's Scissors"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ID` | Yes | Discord application ID |
| `DISCORD_TOKEN` | Yes | Bot token (keep secret!) |
| `PUBLIC_KEY` | Yes | For interaction verification |
| `GUILD_ID` | No | Dev guild — scopes commands for instant registration |
| `OWNER_IDS` | No | Comma-separated user IDs with owner privileges |

Bun loads `.env` automatically — no `dotenv` dependency needed.

## Global vs Guild Commands

- **Guild commands** (`GUILD_ID` set): Register via `PUT /applications/:id/guilds/:guildId/commands`. **Instant** — use during development.
- **Global commands** (no `GUILD_ID`): Register via `PUT /applications/:id/commands`. **Up to 1 hour** to propagate across Discord's CDN.

Set `GUILD_ID` in `.env` during development. Remove it when deploying to production.

## Command Registration Methods

| Method | When to Use |
|--------|-------------|
| `bun run deploy` | After adding/removing/changing commands. Standalone script. |
| Auto-register on startup | `index.ts` CAN call `rest.put()` in the ready event, but this is redundant with the deploy script and can hit rate limits on restart loops. Prefer manual deploy. |

## TypeScript Module Augmentation

`src/types.ts` uses `declare module "discord.js"` to add custom properties to the `Client` interface:

```typescript
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    activeGames: Collection<string, RPSGameState>;
    componentHandlers: Collection<string, ComponentHandler>;
  }
}
```

This avoids type assertions or `any` casts when accessing `client.commands` etc.

## Performance Considerations

- **Bun's `--watch`** mode is used for development — it restarts instantly on file changes
- **discord.js uses WebSocket** for real-time events (not polling)
- **Collection lookups** are O(1) — command dispatch is essentially instant
- **No filesystem scanning** at runtime — commands are statically imported via `_index.ts`

## Future Considerations

- **Sharding**: When the bot grows beyond 2,500 guilds, wrap with discord.js `ShardingManager`
- **Database**: Add Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Cooldowns**: Add a `cooldowns` Collection to the client with per-command timers
- **Permissions**: Add a middleware layer checking `interaction.member.permissions`
- **Dynamic loading**: Replace static `_index.ts` imports with `fs.readdir` + dynamic `import()` for hot-pluggable command files
- **Music**: Use `@discordjs/voice` with FFmpeg for voice channel playback
- **Slash command localization**: discord.js v14 supports `nameLocalizations` and `descriptionLocalizations` for multi-language commands
- **Subcommands**: Use `.addSubcommand()` on `SlashCommandBuilder` for complex commands
