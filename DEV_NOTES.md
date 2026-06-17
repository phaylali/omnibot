# Developer Notes — Omnibot

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               index.ts                                       │
│  Client (Guilds + GuildMembers + GuildMessages + MessageContent)              │
│  → loadCommands → registerInteractionHandler                                 │
│  → RssMonitor.start() → WordMonitor.start() → FreeGamesMonitor.start()       │
│  → registerGuildMemberEvents() → registerXpEvents()                          │
│  → client.login()                                                            │
└──────┬──────────────────────────┬──────────────────────┬───────────────────┬──┘
       │                          │                      │                   │
       ▼                          ▼                      ▼                   ▼
┌──────────────────┐   ┌─────────────────────┐  ┌──────────────┐  ┌──────────────┐
│ commands/         │   │ events/             │  │ services/    │  │ lib/         │
│ 28 commands       │   │ interactionCreate   │  │ rssMonitor   │  │ 7 stores     │
│                   │   │ guildMemberEvents   │  │ wordMonitor  │  │              │
│                   │   │ messageCreate (XP)  │  │ freeGames    │  │              │
└──────────────────┘   └─────────────────────┘  └──────────────┘  └──────────────┘
```

## File-by-File Breakdown

### `src/index.ts` — Entry Point

Creates the Client with 4 intents, starts all services and event handlers, then logs in. No business logic.

### `src/commands/` — 28 Commands

Each file exports `data` (SlashCommandBuilder) and `execute` (handler). Registered via `commands/_index.ts`.

- **`relay.ts`** — Fetches all messages from source channel, dedup via relay-stats.json, re-uploads attachments, posts as embeds with progress updates. Handles token expiry via followUp fallback.
- **`clear-channel.ts`** — Bulk-deletes all messages in the current channel (batches of 100, 14-day limit).
- **`date.ts`** — 4 subcommands: `today` (all 3 calendars), `convert` (Gregorian → Amazigh/Islamic), `months` (month names in Latin/Arabic/Tifinagh), `time` (Morocco time). Powered by moroccan-time-api.
- **`holidays.ts`** — Fetches next Moroccan public holidays from Nager.Date API with day countdown.
- **`dog.ts`** / **`cat.ts`** — Random animal pictures from dog.ceo and cataas.com.
- **`bored.ts`** — Random activity suggestion from boredapi.com.
- **`facepalm.ts`** / **`pat.ts`** — nekos.best reaction GIFs via `sendReaction()` helper.
- **`animequote.ts`** — Static curated list of 35 anime quotes, picked via crypto.randomInt.
- **`init-roles.ts`** — Creates Discord roles, a category, and per-role text channels with locked permissions. Posts an embed with toggle buttons. Verifies existence on Discord via API fetch (not cache) before skipping re-creation. Emoji prefixes on channels/categories via `GROUP_EMOJIS` map + `EMOJI_POOL`.
- **`show-roles.ts`** — Re-posts role selection embeds from stored data.
- **`quiz.ts`** — Tifinagh quiz with 33 letters, 4-choice buttons, per-guild leaderboard.
- **`xp.ts`** — Shows XP, level, progress bar for self or another user.
- **`leaderboard.ts`** — Top 10 XP leaderboard, bot-filtered, with medals.
- **`config.ts`** — Subcommand groups: `notify` (10 subcommands), `word` (4 subcommands), `rss` (4 subcommands).

### `src/events/` — Event Handlers

- **`interactionCreate.ts`** — Central router. Routes by type: ChatInputCommand → `client.commands.get()`, Button → customId prefixes (`rt_` for reaction roles, `flip_`, `rps_`, `freegames_`, `quiz_`), StringSelectMenu → `rps_choose`.
- **`guildMemberEvents.ts`** — `registerGuildMemberEvents()` handles GuildMemberAdd (green welcome embed) and GuildMemberRemove (red sassy embed). Both humans and bots. Uses `resolveChannel()` with 5s timeout.
- **`messageCreate.ts`** — `registerXpEvents()` handles MessageCreate for XP tracking: 15-25 XP per message (30s cooldown), +10 bonus for >100 chars, level-up announcements.

### `src/services/`

- **`rssMonitor.ts`** — Single 60s global timer. Per-guild check cadence via `rssIntervalMinutes` from config. Signature-based change detection (pipe-joined item IDs). Sends embeds for new items.
- **`wordMonitor.ts`** — Same timer pattern. Fetches `/api/random` from the dictionary API, sends Tifinagh word embed to word channel.
- **`freeGamesMonitor.ts`** — Waits 60s after boot, then polls GamerPower API every 60s. Per-guild `freegamesIntervalHours` controls actual cadence. Filters: `type === "game"`, `status === "Active"`, published within 30 days, end date not passed. Dedup via `freeGamesSent.json`.

### `src/lib/` — Data Stores

| File | Path | Purpose |
|------|------|---------|
| `store.ts` | `data/<guildId>/<file>` | Generic JSON read/write helpers |
| `configStore.ts` | `config.json` | Channels, RSS feeds, word interval, free games interval, auto-migrates defaultChannelId |
| `rolesStore.ts` | `roles.json` | Reaction role groups with sanitizeKey() helper |
| `xpStore.ts` | `xpData.json` | XP with 30s cooldown, level formula (50 × n × (n+1)), progress bar |
| `flipStats.ts` | `flipStats.json` | Per-guild /flip win/loss records |
| `quizStats.ts` | `quizStats.json` | Per-guild quiz leaderboard |
| `relayStore.ts` | `relay-stats.json` | Copied message IDs per source channel for /relay dedup |
| `freeGamesStore.ts` | `freeGamesSent.json` | Sent giveaway IDs for FreeGamesMonitor dedup |
| `rssParser.ts` | — | RSS 2.0 + Atom XML parser via DOMParser |
| `commandLoader.ts` | — | Static import from `_index.ts` |
| `logger.ts` | — | Timestamped console logging |

### Key Design Patterns

- **Static imports** — Commands loaded via `_index.ts`, not dynamic filesystem scan.
- **File-based JSON** — Per-guild `data/<guildId>/` directories, zero database deps.
- **Module-level Maps** — Quiz state, pagination state stored in module-level Maps (not client). Avoids collector race conditions.
- **Deterministic customIds** — Reaction role buttons use `rt_{groupKey}_{roleKey}` format, parsed without stored state.
- **Always fetch from Discord** — `/init-roles` existence checks hit the API, not cache, to detect deleted roles/channels/categories.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ID` | Yes | Discord application ID |
| `DISCORD_TOKEN` | Yes | Bot token |
| `PUBLIC_KEY` | Yes | For interaction verification |
| `GUILD_ID` | No | Dev guild for instant command registration |
| `TIFINAGH_API_URL` | No | Dictionary API base URL |

### Commit Convention

`feat:` / `fix:` / `docs:` / `refactor:` / `perf:` / `chore:`
