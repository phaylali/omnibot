# Developer Notes — Omnibot

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    index.ts                           │
│  Client → loadCommands → registerInteractionHandler  │
│  → RssMonitor.start() → client.login()               │
└──────┬─────────────────────────┬──────────────────────┘
       │                         │
       ▼                         ▼
┌──────────────────┐   ┌─────────────────────┐
│ commands/         │   │ events/interaction  │
│ _index.ts         │   │ Create.ts           │
│ test.ts           │   │                     │
│ challenge.ts      │   │ slash → commands/*  │
│ userinfo.ts       │   │ buttons → games/*   │
│ flip.ts           │   │ select → games/*    │
│ help.ts           │   └─────────────────────┘
│ config.ts         │
└──────────────────┘
       ▲
       │
       ▼
┌──────────────────────────────────────────────┐
│ services/rssMonitor.ts   (polls every 60s)   │
│  ├── configStore.ts  →  data/<guildId>/      │
│  ├── rssParser.ts    →  fetch + DOMParser    │
│  └── channel.send()  →  embed per new item   │
└──────────────────────────────────────────────┘
```

## File-by-File Breakdown

### `src/index.ts` — Entry Point

Minimal bootstrapper. Does 5 things in order:
1. Creates the `Client` with `GatewayIntentBits.Guilds`
2. Calls `loadCommands(client)` to populate `client.commands`
3. Calls `registerInteractionHandler(client)` to wire up the event listener
4. Starts `RssMonitor` on `Events.ClientReady`
5. Calls `client.login()`

No business logic lives here — it's pure orchestration.

### `src/config.ts` — Configuration

Centralizes all `process.env` reads with sensible defaults. Every other module imports from here rather than reading `process.env` directly.

### `src/types.ts` — Shared Types

Defines the `Command` interface. Also declares module augmentation on `discord.js.Client` to add `commands`, `activeGames`, and `componentHandlers` collections.

### `src/commands/` — Command Modules

Each file exports `data` (a `SlashCommandBuilder`) and `execute` (an async handler). The `_index.ts` file is the registry — add new commands here.

**`config.ts`** uses subcommand groups for clear namespacing:
- `notify` group: `setchannel`, `channel` — notification channel management
- `rss` group: `add`, `remove`, `list`, `interval` — RSS feed management

All config subcommands require `ManageGuild` permission.

### `src/events/interactionCreate.ts` — Interaction Router

Single event listener that checks `interaction.type` and dispatches:
- `ChatInputCommand` → `client.commands.get(name).execute()`
- `Button` → routes by `customId` prefix (`flip_`, `rps_`)
- `StringSelectMenu` → routes by `customId` prefix (`rps_choose`)

### `src/lib/store.ts` — Data Store

Generic helpers for reading/writing JSON files, both per-guild and global:

| Function | Path |
|----------|------|
| `guildRead(guildId, file, fallback)` | `data/<guildId>/<file>` |
| `guildWrite(guildId, file, data)` | `data/<guildId>/<file>` |
| `globalRead(file, fallback)` | `data/global/<file>` |
| `globalWrite(file, data)` | `data/global/<file>` |
| `listGuilds()` | Lists all directories in `data/` excluding `global` |

Uses `Bun.file()` and `Bun.write()` — no fs/promises needed for JSON operations.

### `src/lib/configStore.ts` — Config Store

Per-guild configuration stored in `data/<guildId>/config.json`.

```typescript
interface GuildConfig {
  defaultChannelId: string | null;
  rssFeeds: RssFeedEntry[];
  rssIntervalMinutes: number;  // default 60
}

interface RssFeedEntry {
  url: string;
  channelId: string;
  lastCheck: number | null;
  signature: string;  // pipe-joined item IDs for change detection
}
```

### `src/lib/flipStats.ts` — Flip Stats

Per-guild /flip leaderboard stored in `data/<guildId>/flipStats.json`.

- `recordFlip(guildId, userId, won)` — records a result
- `getLeaderboard(guildId)` — returns all players sorted by wins
- `getTopN(guildId, n)` — returns top N players

### `src/lib/rssParser.ts` — RSS Parser

Fetches RSS 2.0 or Atom XML and parses it into structured `RssItem` objects using Bun's built-in `DOMParser` (Web API). Handles:

- RSS 2.0: `<rss><channel><item>` elements
- Atom: `<feed><entry>` elements
- HTML stripping from descriptions
- CDATA content
- Media enclosures (images)
- `itemsSignature()` — generates a stable pipe-joined ID string for change detection

### `src/services/rssMonitor.ts` — RSS Monitor

Background polling service that checks RSS feeds on a configurable interval.

```
RssMonitor.poll() every 60 seconds:
1. getAllGuildsWithFeeds() → list of guilds with feeds + interval
2. For each feed:
   ├─ Skip if lastCheck + (intervalMinutes * 60_000) hasn't elapsed
   ├─ fetchRss(url) → parse XML → items[]
   ├─ itemsSignature(items) vs feed.signature
   ├─ Same → update lastCheck, continue (no changes)
   ├─ Different:
   │   ├─ First check (signature empty) → store signature, skip notifications
   │   ├─ Split old signature by "|" → known item IDs
   │   ├─ Filter items whose ID is NOT in known → new items
   │   └─ For each new item: build embed → channel.send()
   └─ updateRssSignature(guildId, url, newSignature)
```

The timer interval is fixed at 60 seconds. Per-guild check cadence is controlled by `rssIntervalMinutes` in config.

### `src/games/rps.ts` — RPS Engine

A singleton `RPSGameManager` wraps all game state and logic:
- `Collection<string, RPSGame>` keyed by channel ID
- `createGame()`, `calculateResult()`, `endGame()`
- Uses the `RPS_CHOICES` rule table for deterministic resolution

### `src/lib/commandLoader.ts` — Command Loader

Iterates `commandList` from `commands/_index.ts` and populates `client.commands`.

### `src/lib/logger.ts` — Logger

Thin wrapper around `console` with timestamps and level prefixes: `[YYYY-MM-DD HH:MM:SS] [LEVEL] message`.

### `src/utils/helpers.ts` — Pure Utility Functions

Stateless helpers: `getRandomEmoji()`, `capitalize()`, `randomItem()`, `formatDate()`. No Discord imports.

### `src/utils/discordApi.ts` — REST API Wrapper

Raw `fetch` wrapper for Discord's v10 REST API. Used only by `deploy.ts`.

## Interaction Flow: RPS Game

```
1. User A runs /challenge rock
   ├─ challenge.ts stores game via rpsGame.createGame(...)
   └─ Bot replies: "User A challenges you! [Accept] [Cancel]"

2. User B clicks "Accept"
   ├─ interactionCreate → customId "rps_accept"
   ├─ Validates: game exists? not self-challenge?
   └─ Sends ephemeral select menu to User B

3. User B clicks "Cancel"
   ├─ interactionCreate → customId "rps_cancel"
   └─ Only challenger can cancel → updates message

4. User B picks from select menu
   ├─ interactionCreate → customId "rps_choose"
   ├─ rpsGame.calculateResult(challenger, opponent)
   ├─ rpsGame.endGame(channelId)
   └─ Updates original message with result
```

## Interaction Flow: Coin Flip

```
1. User runs /flip [heads|tails]
   ├─ flip.ts posts message with [Heads] [Tails] buttons
   └─ User clicks a button

2. interactionCreate → customId "flip_heads" or "flip_tails"
   ├─ crypto.randomInt(2) → 0 = heads, 1 = tails
   ├─ Compare user guess vs outcome
   ├─ flipStats.recordFlip(guildId, userId, won)
   ├─ Build result embed with win/loss and top-3 leaderboard
   ├─ [📊] button to view full leaderboard via nav
   └─ interaction.update() with result

3. User clicks [📊] on result embed
   ├─ interactionCreate → customId "flip_leaderboard"
   └─ flipStats.getLeaderboard() → paginated embed
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ID` | Yes | Discord application ID |
| `DISCORD_TOKEN` | Yes | Bot token (keep secret!) |
| `PUBLIC_KEY` | Yes | For interaction verification |
| `GUILD_ID` | No | Dev guild — scopes commands for instant registration |

Bun loads `.env` automatically — no `dotenv` dependency needed.

## Commit Convention

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change that neither fixes nor adds
- `perf:` — performance improvement
- `chore:` — maintenance, deps, config

## Possible Coming Features

Ideas ranked by engagement impact vs implementation effort.

### 🧩 Trivial (~20 min each)
- **Polls** — `/poll "Question?" "opt1" "opt2" ...`. Button-based voting. Same pattern as RPS select menu.
- **8ball** — `/8ball <question>`. Random answer from a curated string array.

### 📈 Moderate (~1 hr each)
- **Quote Saver** — `/quote add <message-link>` saves to `data/<guild>/quotes.json`. `/quote random` picks one. Same read/write pattern as flipStats.
- **Birthday Role** — `/birthday set <MM-DD>`. Daily check in `index.ts` ready event auto-assigns a "🎂" role on the user's date.
- **Reaction Roles** — `/reactionrole create <msg-id> <emoji> <role>`. Uses `messageReactionAdd` event + per-guild JSON mapping.

### 🎯 Thematic (Omniversify/Tifinagh)
- **Tifinagh Trivia** — `/quiz` with multiple-choice questions about Amazigh language/culture. Scores tracked per-user. Reuses the dictionary API for content.
- **Word of the Day** — Posts a Tifinagh word + translation to a configured channel daily. Same cron pattern as RSS monitor.

### 🛠 Infrastructure
- **Rate limiting / caching** for the dictionary API (production hardening)
- **Auto-detect script** in `/tifinagh` — infer input script instead of requiring `from` parameter
