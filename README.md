# Omnibot

A modular Discord bot built with [Bun](https://bun.sh) + [TypeScript](https://www.typescriptlang.org/) + [discord.js](https://discord.js.org) v14.

Originally made for the **Omniversify** server and Moroccan communities, but anyone can fork it and adapt it.

## Features

- **Modular command system** — each command is a self-contained file in `src/commands/`
- **Slash commands** — `/test`, `/challenge` (Rock Paper Scissors), `/userinfo`
- **Interactive components** — buttons, select menus
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
| `/challenge [object]` | Start a Rock-Paper-Scissors game. Buttons + select menus |
| `/userinfo [user]` | Show Discord account info (join date, account age, etc.) |

## Scripts

| Script | Description |
|--------|-------------|
| `bun run start` | Start the bot |
| `bun run dev` | Start with hot reload (`--watch`) |
| `bun run deploy` | Register/update slash commands |

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
│   └── userinfo.ts           # /userinfo command
│
├── events/
│   └── interactionCreate.ts  # Router for all interactions
│
├── games/
│   └── rps.ts                # RPS game engine + state management
│
├── lib/
│   ├── commandLoader.ts      # Loads commands into the client
│   └── logger.ts             # Structured logging
│
└── utils/
    ├── helpers.ts            # Emoji, capitalize, random, date formatting
    └── discordApi.ts         # Discord REST API wrapper (for deploy)
```

## License

MIT

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
