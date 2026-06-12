# Omnibot

A modular Discord bot built with [Bun](https://bun.sh) + [TypeScript](https://www.typescriptlang.org/) + [discord.js](https://discord.js.org) v14.

Originally made for the **Omniversify** server and Moroccan communities, but anyone can fork it and adapt it.

## Features

- **Modular command system** — each command is a self-contained file in `src/commands/`
- **Slash commands** — `/test`, `/challenge` (Rock Paper Scissors), `/userinfo`, `/flip`, `/help`, `/config`
- **Coin flip** — `/flip` with live buttons, per-guild leaderboard, top-3 embed, 📊 full leaderboard
- **Server config** — `/config notify setchannel`, `/config rss add|remove|list|interval`
- **RSS monitoring** — watches RSS/Atom feeds and posts new items as embeds to a configured channel
- **Interactive components** — buttons, select menus
- **Per-guild data** — all configs stored in `data/<guildId>/`, global data in `data/global/`
- **TypeScript** — full type safety across the entire codebase
- **Latest discord.js** — v14 with `SlashCommandBuilder`, `Collection` routing, proper intents

## Prerequisites

- [Bun](https://bun.sh) >= 1.0 (`curl -fsSL https://bun.sh/install | bash`)
- A [Discord application](https://discord.com/developers/applications) with bot enabled

## Quick Start

```bash
git clone <repo-url>
cd omnibot
bun install

cp .env.sample .env
# Fill in APP_ID, DISCORD_TOKEN, PUBLIC_KEY

# Register commands (run once, or after adding new commands)
bun run deploy

# Start the bot
bun run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/test` | Sanity check — replies with "hello world" + random emoji |
| `/help` | Show all available commands |
| `/userinfo [user]` | Show Discord account info (join date, account age, etc.) |
| `/challenge [object]` | Start a Rock-Paper-Scissors game with buttons + select menus |
| `/flip [heads|tails]` | Coin flip guessing game with per-guild leaderboard |
| `/config notify setchannel <#channel>` | Set the notification channel for bot status |
| `/config notify channel` | Show the currently configured notification channel |
| `/config rss add <url> [channel]` | Add an RSS/Atom feed to monitor for new posts |
| `/config rss remove <url>` | Remove a monitored RSS feed |
| `/config rss list` | List all monitored RSS feeds with check times |
| `/config rss interval <minutes>` | Set how often RSS feeds are checked (default 60) |

## Scripts

| Script | Description |
|--------|-------------|
| `bun run start` | Start the bot |
| `bun run dev` | Start with hot reload (`--watch`) |
| `bun run deploy` | Register/update slash commands |

## Data Storage

All per-guild data is stored as JSON files in `data/<guildId>/`. Each guild gets its own directory:

```
data/
├── <guildId>/
│   └── config.json    — Notification channel, RSS feeds, interval
├── <guildId>/
│   ├── config.json
│   └── flipStats.json — Win/loss records for /flip
└── global/
    └── ...             — Cross-guild shared data (tracked in git)
```

Per-guild directories are gitignored. Global data is tracked.

## Adding a New Command

1. Create `src/commands/<name>.ts`
2. Export `data` (a `SlashCommandBuilder`) and `execute` (the handler)
3. Import and add it to the `commandList` array in `src/commands/_index.ts`
4. Run `bun run deploy`

## Project Structure

```
src/
├── index.ts                  # Entry point — boots the client
├── config.ts                 # Centralized env vars & constants
├── types.ts                  # Shared TypeScript interfaces
├── deploy.ts                 # Command registration script
│
├── commands/
│   ├── _index.ts             # Command registry (add new commands here)
│   ├── test.ts               # /test command
│   ├── challenge.ts          # /challenge command
│   ├── userinfo.ts           # /userinfo command
│   ├── flip.ts               # /flip command
│   ├── help.ts               # /help command
│   └── config.ts             # /config command (notify + rss groups)
│
├── events/
│   └── interactionCreate.ts  # Router for all interactions
│
├── games/
│   └── rps.ts                # RPS game engine + state management
│
├── services/
│   └── rssMonitor.ts         # Background RSS polling service
│
├── lib/
│   ├── commandLoader.ts      # Loads commands into the client
│   ├── logger.ts             # Structured logging
│   ├── store.ts              # Generic guild/global JSON read/write
│   ├── configStore.ts        # Per-guild config (channel, RSS feeds)
│   ├── flipStats.ts          # Per-guild flip leaderboard
│   └── rssParser.ts          # RSS/Atom XML parser
│
└── utils/
    ├── helpers.ts            # Emoji, capitalize, random, date formatting
    └── discordApi.ts         # Discord REST API wrapper (for deploy)

images/
├── front-coin.png            # Coin flip heads image
└── back-coin.png             # Coin flip tails image

data/                         # Per-guild directories (gitignored)
└── global/                   # Cross-guild data (tracked)
```

## License

[The Unlicense](LICENSE) — public domain. Do whatever you want with it.

---

## Support Us

<p align="center">
  <a href="https://ko-fi.com/omniversify">
    <img src="https://raw.githubusercontent.com/phaylali/Omniversify/main/public/images/kofi_logo.svg" width="200" alt="Ko-Fi" />
  </a>
</p>

<p align="center">
  <strong>Keep us going</strong>
</p>

---

&copy; 2026 [Omniversify](https://omniversify.com). All rights reserved.

_Made by Moroccans, for the Omniverse_

[![ReadMeSupportPalestine](https://raw.githubusercontent.com/Safouene1/support-palestine-banner/master/banner-project.svg)](https://donate.unrwa.org/-landing-page/en_EN)
