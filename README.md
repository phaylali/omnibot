# Omnibot

A modular Discord bot built with [Bun](https://bun.sh) + [TypeScript](https://www.typescriptlang.org/) + [discord.js](https://discord.js.org) v14.

Originally made for the **Omniversify** server and Moroccan communities, but anyone can fork it and adapt it.

## Features

- **Modular command system** — each command is a self-contained file in `src/commands/`
- **28 slash commands** — test, challenge (RPS), userinfo, flip, help, config, dadjoke, freegames, hug, slap, bonk, pet, tifinagh, quiz, xp, leaderboard, init-roles, show-roles, relay, clear-channel, dog, cat, bored, facepalm, pat, animequote, holidays, date
- **Tifinagh dictionary** — /tifinagh translate/transliterate/random, powered by a standalone Hono API
- **Tifinagh quiz** — /quiz tifinagh with 33 Neo-Tifinagh IRCAM letters, 4-choice buttons, per-guild leaderboard
- **XP + leveling** — message-based XP (15-25 per message, 30s cooldown), 20 levels with titles, level-up announcements, progress bar
- **Reaction roles** — /init-roles creates roles, category, per-role channels with locked permissions, selection embed with toggle buttons
- **Coin flip** — /flip with live buttons, per-guild leaderboard, top-3 embed, crypto randomness
- **Social actions** — /hug, /slap, /bonk, /pet, /pat, /facepalm with reaction GIFs from nekos.best
- **RSS monitoring** — watches RSS/Atom feeds and posts new items as embeds to a configured channel
- **Word of the Day** — posts random Tifinagh words to a configured channel on a schedule
- **Channel relay** — /relay bulk-copies messages between channels with attachment re-upload and dedup
- **Channel clear** — /clear-channel deletes all messages in a channel
- **Free games monitor** — auto-polls GamerPower API every 3h, posts active game giveaways
- **Moroccan date** — /date shows Gregorian, Islamic, and Amazigh calendars with Tifinagh/Arabic names
- **Moroccan holidays** — /holidays countdown to next public holidays via Nager.Date
- **Welcome/leave events** — green embed on join, sassy red embed on leave (both humans and bots)
- **Interactive components** — buttons, select menus
- **Per-guild data** — all configs stored in `data/<guildId>/`, global data in `data/global/`
- **TypeScript** — full type safety across the entire codebase
- **Latest discord.js** — v14 with `SlashCommandBuilder`, `Collection` routing, proper intents

## Prerequisites

- [Bun](https://bun.sh) >= 1.0 (`curl -fsSL https://bun.sh/install | bash`)
- A [Discord application](https://discord.com/developers/applications) with bot enabled
- Privileged intents enabled in Discord Developer Portal: **Guild Members**, **Message Content**

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
| `/animequote` | Random anime quote from a curated list |
| `/bonk <user>` | Bonk someone |
| `/bored` | Suggest a random activity to do |
| `/cat` | Random cat picture from cataas.com |
| `/challenge [object]` | Start a Rock-Paper-Scissors game with buttons + select menus |
| `/clear-channel` | Delete all messages in the current channel |
| `/config` | Server configuration (notify, word, rss groups) |
| `/dadjoke` | Fetch a random dad joke from icanhazdadjoke.com |
| `/date today` | Show Gregorian, Islamic, and Amazigh calendars |
| `/date convert <cal> <y> <m> <d>` | Convert a Gregorian date to Amazigh or Islamic |
| `/date months <calendar>` | List month names in Latin, Arabic, Tifinagh |
| `/date time` | Show current Morocco time |
| `/dog` | Random dog picture from dog.ceo |
| `/facepalm` | Facepalm reaction GIF |
| `/flip [heads\|tails]` | Coin flip guessing game with per-guild leaderboard |
| `/freegames` | Browse free game giveaways from GamerPower, paginated with claim links |
| `/help` | Show all available commands |
| `/holidays` | Countdown to upcoming Moroccan public holidays |
| `/hug <user>` | Hug someone with a reaction GIF |
| `/init-roles <group> <roles>` | Create a role group with toggle buttons and per-role channels |
| `/leaderboard` | Top 10 XP leaderboard with medals |
| `/pat <user>` | Pat someone with a reaction GIF |
| `/pet <user>` | Pet someone |
| `/quiz tifinagh` | Tifinagh letter quiz (4-choice buttons, leaderboard) |
| `/quiz tifinagh-2` | Reverse Tifinagh quiz (letter → name) |
| `/relay <source> <target>` | Bulk-copy all messages between channels with dedup |
| `/show-roles [group]` | Re-post role selection embeds |
| `/slap <user>` | Slap someone |
| `/test` | Sanity check — replies with "hello world" + random emoji |
| `/tifinagh translate <from> <text>` | Translate text between Latin/Arabic/Tifinagh scripts |
| `/tifinagh random` | Get a random Tifinagh word with translations |
| `/userinfo [user]` | Show Discord account info + XP level |
| `/xp [user]` | Show XP, level, and progress bar |

### `/config` — Server Configuration

**Notify group:**
| Subcommand | Description |
|------------|-------------|
| `setonlinechannel <#channel>` | Set the channel for online/bot-status notifications |
| `getonlinechannel` | Show the current online notification channel |
| `setwelcomechannel <#channel>` | Set the channel for welcome/leave messages |
| `getwelcomechannel` | Show the current welcome channel |
| `setwordchannel <#channel>` | Set the channel for Word of the Day |
| `getwordchannel` | Show the current Word of the Day channel |
| `setfreegameschannel <#channel>` | Set the channel for free game announcements |
| `getfreegameschannel` | Show the current free games channel |
| `setrankchannel <#channel>` | Set the channel for level-up announcements |
| `getrankchannel` | Show the current rank channel |
| `setrolechannel <#channel>` | Set the channel where role selection embeds are posted |
| `getrolechannel` | Show the current role channel |
| `testwelcome` | Preview the welcome embed |

**Word group:**
| Subcommand | Description |
|------------|-------------|
| `channel [channel]` | Set/show the Word of the Day channel |
| `interval <hours>` | Set how often a word is posted (default 24) |
| `now` | Post a word immediately |
| `status` | Show current word channel and interval |

**RSS group:**
| Subcommand | Description |
|------------|-------------|
| `add <url> [channel]` | Add an RSS/Atom feed to monitor |
| `remove <url>` | Remove a monitored RSS feed |
| `list` | List all monitored feeds with check times |
| `interval <minutes>` | Set check interval (default 60) |

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
│   ├── config.json       — Channel configs, RSS feeds, intervals
│   ├── flipStats.json    — Win/loss records for /flip
│   ├── quizStats.json    — Tifinagh quiz leaderboard
│   ├── xpData.json       — XP and levels per user
│   ├── roles.json        — Reaction role group definitions
│   ├── relay-stats.json  — Dedup message IDs for /relay
│   ├── freeGamesSent.json— Sent giveaway IDs for free games monitor
└── global/
    ├── tifinagh-letters.json  — 33 Neo-Tifinagh IRCAM letter mappings
    └── ...                    — Other cross-guild data (tracked in git)
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
├── index.ts                  # Entry point — boots the client + all services
├── config.ts                 # Centralized env vars & constants
├── types.ts                  # Shared TypeScript interfaces
├── deploy.ts                 # Command registration script
│
├── commands/
│   ├── _index.ts             # Command registry (add new commands here)
│   ├── animequote.ts         # /animequote command
│   ├── bonk.ts               # /bonk command
│   ├── bored.ts              # /bored command
│   ├── cat.ts                # /cat command
│   ├── challenge.ts          # /challenge (RPS) command
│   ├── clear-channel.ts      # /clear-channel command
│   ├── config.ts             # /config command (notify + word + rss groups)
│   ├── dadjoke.ts            # /dadjoke command
│   ├── date.ts               # /date command (today, convert, months, time)
│   ├── dog.ts                # /dog command
│   ├── facepalm.ts           # /facepalm command
│   ├── flip.ts               # /flip coin flip command
│   ├── freegames.ts          # /freegames command
│   ├── help.ts               # /help command
│   ├── holidays.ts           # /holidays command
│   ├── hug.ts                # /hug command
│   ├── init-roles.ts         # /init-roles reaction roles command
│   ├── leaderboard.ts        # /leaderboard command
│   ├── pat.ts                # /pat command
│   ├── pet.ts                # /pet command
│   ├── quiz.ts               # /quiz tifinagh command
│   ├── relay.ts              # /relay channel relay command
│   ├── show-roles.ts         # /show-roles command
│   ├── slap.ts               # /slap command
│   ├── test.ts               # /test command
│   ├── tifinagh.ts           # /tifinagh translate/random command
│   ├── userinfo.ts           # /userinfo command
│   └── xp.ts                 # /xp command
│
├── events/
│   ├── interactionCreate.ts  # Router for all interactions (slash, buttons, select)
│   ├── guildMemberEvents.ts  # Welcome/leave handlers
│   └── messageCreate.ts      # XP tracking on messages
│
├── games/
│   └── rps.ts                # RPS game engine + state management
│
├── services/
│   ├── freeGamesMonitor.ts   # Auto-poll GamerPower giveaways
│   ├── rssMonitor.ts         # Background RSS polling service
│   └── wordMonitor.ts        # Word of the Day polling service
│
├── lib/
│   ├── commandLoader.ts      # Loads commands into the client
│   ├── configStore.ts        # Per-guild config (channels, RSS, word interval)
│   ├── flipStats.ts          # Per-guild flip leaderboard
│   ├── freeGamesStore.ts     # Dedup store for free game giveaways
│   ├── logger.ts             # Structured logging
│   ├── quizStats.ts          # Per-guild quiz leaderboard
│   ├── relayStore.ts         # Dedup store for /relay message IDs
│   ├── rolesStore.ts         # Reaction role group data
│   ├── rssParser.ts          # RSS/Atom XML parser
│   ├── store.ts              # Generic guild/global JSON read/write
│   └── xpStore.ts            # XP data and level calculations
│
└── utils/
    ├── helpers.ts            # Emoji, capitalize, random, date formatting
    ├── discordApi.ts         # Discord REST API wrapper (for deploy)
    └── social.ts             # Social reaction helper (nekos.best API)

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
