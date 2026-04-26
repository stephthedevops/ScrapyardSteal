---
title: "Developer Onboarding Guide"
description: "Complete setup guide for new developers joining the Scrapyard Steal project"
version: "1.0.0"
date: "2026-04-26"
---

# Developer Onboarding Guide

## Overview

Scrapyard Steal is a multiplayer clicker/strategy game where 2–20 players compete in a shared scrapyard, built with Phaser 3 and Colyseus for the [Gamedev.js Jam 2026](https://itch.io/jam/gamedevjs-2026). The client renders the game in the browser while an authoritative Colyseus server manages all game state and logic.

For a high-level project summary, see the [README](../../README.md). For detailed architecture documentation, see [docs/architecture/](../architecture/).

## Prerequisites

| Tool | Version | Verify with |
|------|---------|-------------|
| Node.js | 20+ | `node --version` |
| npm | (bundled with Node.js) | `npm --version` |
| Git | Any recent version | `git --version` |

## Initial Setup

### 1. Clone the repository

```bash
git clone https://github.com/stephthedevops/ScrapyardSteal.git
cd ScrapyardSteal
```

### 2. Install dependencies

```bash
npm install
```

Expected output ends with something like:

```
added 450+ packages in 15s
```

### 3. Build the project

Build the client:

```bash
npm run build
```

This runs `tsc && vite build`. Expected output:

```
vite v5.x.x building for production...
✓ 50+ modules transformed.
dist/index.html        0.xx kB │ gzip: 0.xx kB
dist/assets/index-xxxxx.js  xxx.xx kB │ gzip: xxx.xx kB
✓ built in x.xxs
```

Build the server:

```bash
npm run server:build
```

This compiles server TypeScript to `build/`. Expected output:

```
(no errors = success)
```

### 4. Run the test suite

```bash
npm test
```

Expected output:

```
 ✓ tests/unit/...
 ✓ tests/property/...

 Test Files  25 passed
 Tests       157 passed
 Duration    x.xxs
```

## Running Locally

You need **two terminals** running simultaneously:

**Terminal 1 — Colyseus server (port 2567):**

```bash
npm run server:dev
```

This starts the server with nodemon for hot-reload. You should see:

```
⚔ Colyseus 0.15.x
🏟 Your Colyseus App
⚔ Listening on ws://localhost:2567
```

**Terminal 2 — Vite dev server (port 3000):**

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

Open `http://localhost:3000` in **two browser tabs** to test multiplayer. Create a game in one tab, copy the room code, and join from the other tab.

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit and property tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode — re-runs on file changes |
| `npm run test:coverage` | Run tests with V8 code coverage (output in `coverage/`) |
| `npm run test:e2e` | Run Playwright end-to-end tests (Chromium) |
| `npm run test:all` | Run Vitest tests followed by Playwright e2e tests |

## Local Development Configuration

The Vite dev client connects to the Colyseus server via WebSocket. The default URL is:

```
ws://localhost:2567
```

This is configured through `VITE_SERVER_URL` in the Vite build. For local development, **no `.env` file is needed** — the client defaults to `ws://localhost:2567` when the variable is not set.

For production builds, the URL is set inline:

```bash
npm run build:prod
```

This sets `VITE_SERVER_URL` to the Colyseus Cloud endpoint during the build.

## IDE Setup

This project is designed to work with **Kiro** (or VS Code).

### Pre-configured workspace tools

The `.kiro/` directory contains AI-assisted development configuration that works out of the box:

- **`.kiro/steering/`** — 11 steering files covering TypeScript standards, conventional commits, security practices, and more. These guide AI-assisted development automatically.
- **`.kiro/hooks/`** — 6 automated hooks for building, testing, PR review, and issue triage. These trigger on relevant events (file saves, commits, etc.).

### Recommended extensions

- TypeScript language support (built into VS Code / Kiro)
- Vitest extension for inline test results

No additional IDE configuration is required. The `.vscode/` directory is included but minimal.

## Project Structure

```
├── server/                 # Colyseus server (authoritative game logic)
│   ├── index.ts            # Server entry + short code lookup endpoint
│   ├── app.config.ts       # Colyseus Cloud config
│   ├── rooms/
│   │   └── GameRoom.ts     # Room lifecycle, messages, game loop, battle tick
│   ├── logic/
│   │   ├── GridManager.ts  # Grid init, adjacency, circular spawn placement
│   │   ├── ConflictEngine.ts # Attack pressure, cost formulas
│   │   ├── aiNames.ts      # AI bot name generation
│   │   └── sanitize.ts     # Name sanitization
│   └── state/
│       └── GameState.ts    # Colyseus schema: Player, Tile, GameState
├── src/                    # Phaser client (rendering, input, UI)
│   ├── main.ts             # Game bootstrap
│   ├── scenes/
│   │   ├── MenuScene.ts    # Create/Join game menu
│   │   ├── LobbyScene.ts   # Color pick, name, room code, config, AI, start
│   │   ├── GameScene.ts    # Main game: grid, HUD, input, state sync, battles
│   │   └── TutorialScene.ts # How to Play walkthrough
│   ├── rendering/
│   │   └── GridRenderer.ts # Tile rendering, animations, highlights
│   ├── ui/
│   │   └── HUDManager.ts   # Stats, bot purchases, timer, stats popup
│   ├── network/
│   │   ├── client.ts       # Colyseus client config
│   │   └── NetworkManager.ts # Message wrapper (claim, attack, mine, bots)
│   └── utils/
│       └── nameGenerator.ts # Random bot name generation
├── tests/                  # Test suite
│   ├── unit/               # Vitest unit tests (7 files)
│   ├── property/           # fast-check property-based tests (18 files)
│   └── e2e/                # Playwright end-to-end tests
├── issue_tracking/         # Markdown-based project tracking
├── doc/                    # Design docs, changelog, meeting transcripts
└── docs/                   # Architecture documentation
```

## Key Concepts

Understanding these patterns will help you navigate the codebase:

### Authoritative server

All game state lives on the Colyseus server. The client renders state received from the server and sends player actions (click to claim, attack, mine, buy bots) as messages. The server validates every action before applying it. Never trust the client.

### Two-tick loop

The server runs two separate intervals:
- **Game tick** — handles tile claiming, gear mining, bot placement, and AI behavior
- **Battle tick** — runs at 2×/sec, resolving attack damage based on attack pressure (`factories + floor(ATK bots / active battles)`)

### Team leader delegation

When a player loses all their tiles, they are absorbed into the attacker's team. The attacker becomes the team leader. Only team leaders can buy ATK bots and initiate attacks. Team members can still claim tiles, mine gears, and place DEF/COL bots.

For full architecture details, see [docs/architecture/](../architecture/).

## Common Pitfalls

- **Two processes required** — The game needs both the Colyseus server and the Vite dev server running. If you only start one, the game won't work.
- **Server must start first** — The client tries to connect to `ws://localhost:2567` on load. If the Colyseus server isn't running, you'll see a WebSocket connection error in the browser console.
- **Port conflicts** — If port 2567 or 3000 is already in use, the respective server will fail to start. Kill the conflicting process or change the port.
- **Schema changes require server restart** — If you modify `GameState.ts` or any Colyseus schema, restart the server. Nodemon handles this automatically in `server:dev` mode.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `npm install` fails | Node.js version too old | Upgrade to Node.js 20+ (`node --version` to check) |
| Port 2567 already in use | Another process on that port | `lsof -i :2567` to find it, then kill the process |
| Port 3000 already in use | Another process on that port | `lsof -i :3000` to find it, then kill the process |
| Tests fail after pull | Dependencies out of date | Run `npm install` to sync `node_modules` with `package-lock.json` |
| Playwright tests fail | Browsers not installed | Run `npx playwright install chromium` to download the test browser |
| WebSocket connection error in browser | Colyseus server not running | Start the server first: `npm run server:dev` |
| `Cannot find module 'ts-node'` | Missing dev dependencies | Run `npm install` (ts-node is a devDependency) |
| Build fails with type errors | TypeScript strict mode catches issues | Fix the type errors — strict mode is intentional |

## Getting Help

### Team

| Name | Role |
|------|------|
| Steph Hicks (Felar) | Developer |
| Nathan Engert (Valokor) | Developer |
| Evan Kuhlmann | Software Quality Engineer |
| Pete Wanamaker | Software Quality Engineer |

### Resources

- **GitHub Issues** — [github.com/stephthedevops/ScrapyardSteal/issues](https://github.com/stephthedevops/ScrapyardSteal/issues) for bug reports and feature requests
- **Project README** — [README.md](../../README.md) for quick start and gameplay overview
- **Architecture Docs** — [docs/architecture/](../architecture/) for system design and module details
- **Game Design** — [doc/game-design.md](../../doc/game-design.md) for gameplay rules and mechanics
- **Testing Guide** — [doc/testing.md](../../doc/testing.md) for testing strategy and guidelines
- **Issue Tracking** — [issue_tracking/](../../issue_tracking/) for current priorities, bugs, and backlog
