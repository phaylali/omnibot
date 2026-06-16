# Developer Notes — Omnibot

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.ts                                 │
│  Client (Guilds + GuildMembers + GuildMessages + MessageContent) │
│  → loadCommands → registerInteractionHandler                    │
│  → RssMonitor.start() → WordMonitor.start()                     │
│  → registerGuildMemberEvents() → registerXpEvents()             │
│  → client.login()                                               │
└──────┬─────────────────────────┬──────────────────────┬─────────┘
       │                         │                      │
       ▼                         ▼                      ▼
┌──────────────────┐   ┌─────────────────────┐  ┌──────────────┐
│ commands/         │   │ events/             │  │ services/    │
│ _index.ts         │   │ interactionCreate   │  │ rssMonitor   │
│ test / challenge  │   │ → slash → commands  │  │ wordMonitor  │
│ userinfo / flip   │   │ → button → route    │  └──────────────┘
│ help / config     │   │ → select → route    │
│ hug / slap / bonk │   └─────────────────────┘
│ dadjoke / free    │
│ tifinagh / quiz   │
│ xp / leaderboard  │
│ init-roles / show │
└──────────────────┘
```

## File-by-File Breakdown

### `src/index.ts` — Entry Point

Creates the Client with 4 intents, starts all services and event handlers, then logs in. No business logic.

### `src/commands/` — 19 Commands

Each file exports `data` (SlashCommandBuilder) and `execute` (handler). Registered via `commands/_index.ts`.

- **`init-roles.ts`** — Creates Discord roles, a category, and per-role text channels with locked permissions. Posts an embed with toggle buttons. Verifies existence on Discord via API fetch (not cache) before skipping re-creation. Emoji prefixes on channels/categories via `GROUP_EMOJIS` map + `EMOJI_POOL`.
- **`show-roles.ts`** — Re-posts role selection embeds from stored data.
- **`quiz.ts`** — Tifinagh quiz with 33 letters, 4-choice buttons, per-guild leaderboard.
- **`xp.ts`** — Shows XP, level, progress bar for self or another user.
- **`leaderboard.ts`** — Top 10 XP leaderboard, bot-filtered, with medals.
- **`config.ts`** — Subcommand groups: `notify` (10 subcommands), `word` (4 subcommands), `rss` (4 subcommands).
- Others follow the same pattern.

### `src/events/` — Event Handlers

- **`interactionCreate.ts`** — Central router. Routes by type: ChatInputCommand → `client.commands.get()`, Button → customId prefixes (`rt_` for reaction roles, `flip_`, `rps_`, `freegames_`, `quiz_`), StringSelectMenu → `rps_choose`.
- **`guildMemberEvents.ts`** — `registerGuildMemberEvents()` handles GuildMemberAdd (green welcome embed) and GuildMemberRemove (red sassy embed). Both humans and bots. Uses `resolveChannel()` with 5s timeout.
- **`messageCreate.ts`** — `registerXpEvents()` handles MessageCreate for XP tracking: 15-25 XP per message (30s cooldown), +10 bonus for >100 chars, level-up announcements.

### `src/services/`

- **`rssMonitor.ts`** — Single 60s global timer. Per-guild check cadence via `rssIntervalMinutes` from config. Signature-based change detection (pipe-joined item IDs). Sends embeds for new items.
- **`wordMonitor.ts`** — Same timer pattern. Fetches `/api/random` from the dictionary API, sends Tifinagh word embed to word channel.

### `src/lib/` — Data Stores

| File | Path | Purpose |
|------|------|---------|
| `store.ts` | `data/<guildId>/<file>` | Generic JSON read/write helpers |
| `configStore.ts` | `config.json` | Channels, RSS feeds, word interval, auto-migrates defaultChannelId |
| `rolesStore.ts` | `roles.json` | Reaction role groups with sanitizeKey() helper |
| `xpStore.ts` | `xpData.json` | XP with 30s cooldown, level formula (50 × n × (n+1)), progress bar |
| `flipStats.ts` | `flipStats.json` | Per-guild /flip win/loss records |
| `quizStats.ts` | `quizStats.json` | Per-guild quiz leaderboard |
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
