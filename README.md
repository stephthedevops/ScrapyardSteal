<p align="center">
  <img src="images/scrapyardsteal.png" alt="Scrapyard Steal" width="200"/>
  <img src="images/bunnybot.png" alt="Bunnybot" width="120"/>
</p>

<h1 align="center">🏭 Scrapyard Steal</h1>

<p align="center">
  <em>Expand. Absorb. Dominate the scrapyard.</em>
</p>

<p align="center">
  <a href="https://itch.io/jam/gamedevjs-2026"><img src="https://img.shields.io/badge/Gamedev.js_Jam-2026-ff5722?style=for-the-badge&logo=itch.io&logoColor=white" alt="Gamedev.js Jam 2026"/></a>
  <img src="https://img.shields.io/badge/Theme-Machines-e0a030?style=for-the-badge" alt="Theme: Machines"/>
  <img src="https://img.shields.io/badge/Engine-Phaser_3-4a7fa5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsMTAgNSAxMC01TTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="Phaser 3"/>
  <img src="https://img.shields.io/badge/Multiplayer-Colyseus-3d8a8a?style=for-the-badge" alt="Colyseus"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-5.4-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"/>
  <img src="https://img.shields.io/github/stars/stephthedevops/ScrapyardSteal?style=flat-square" alt="Stars"/>
</p>

---

🎮 [**Play Now**](https://stephthedevops.github.io/ScrapyardSteal/) | [itch.io](https://felartaillier.itch.io/scrapyardsteal)

## What is Scrapyard Steal?

A multiplayer clicker/strategy game where 2–20 players compete in a shared scrapyard. Control a factory-machine, expand your territory by claiming scrap tiles, build an army of bots, and attack rival machines. When you destroy an opponent's last tile, they join your team. Lose your factory and you're demoted — but you can still help your team by building defenses and collecting scrap.

Built for the [Gamedev.js Jam 2026](https://itch.io/jam/gamedevjs-2026) (Theme: **Machines**).

## 🎮 How to Play

| Action | Control |
|--------|---------|
| Claim a tile | Click an adjacent neutral tile |
| Mine a gear | Click a ⚙️ tile you own or is unclaimed |
| Attack a tile | Click an enemy tile next to your territory |
| Buy ⚔️ ATK Bot | Click the ATK button (team lead only) |
| Buy 🛡️ DEF Bot | Click the DEF button |
| Place DEF Bot | Click 🛡️ icon, then click a tile you own |
| Buy ⚙️ COL Bot | Click the COL button |
| Place COL Bot | Click ⚒ icon, then click a tile you own |
| View stats | Click 📊 Stats button |

### Game Flow

1. **Create or Join** — Host creates a game and shares the 5-character room code. Others join with the code, or use Quick Play for a random public game.
2. **Lobby** — Pick your color, get a random bot name (🎲 to reroll). Host can configure time limit (including Deathmatch), match format, scrap supply, max players, and add AI opponents.
3. **Expand** — Claim neutral tiles adjacent to your territory. Each tile costs scrap, and the cost scales as you grow.
4. **Mine** — Click gear tiles (⚙️) to extract scrap. Mining yields 5 × factories owned.
5. **Build Bots** — Buy ATK bots (more simultaneous attacks), DEF bots (place on tiles for +5 defense each), and COL bots (auto-mine gears and generate factory income).
6. **Attack** — Click enemy border tiles to start battles. Each battle tick (2×/sec) deals damage based on your attack pressure: `factories + floor(ATK bots / active battles)`. Tiles become unclaimed at 0 defense.
7. **Defend** — Every tile has 5 base defense. Place up to 4 DEF bots per tile for up to 25 total defense. When defense drops past thresholds, bots are destroyed (50% chance to repair).
8. **Absorb** — When a player loses all tiles, they join the attacker's team. Lose your factory and you're demoted to non-leader.
9. **Win** — Most tiles when the timer runs out, or last team standing in Deathmatch.

### Roles

| Action | Team Lead | Member |
|--------|-----------|--------|
| Buy ⚔️ ATK Bots | ✅ | ❌ |
| Attack tiles | ✅ | ❌ |
| Buy 🛡️ DEF / ⚙️ COL Bots | ✅ | ✅ |
| Place bots | ✅ | ✅ |
| Claim tiles | ✅ | ✅ |
| Mine gears | ✅ | ✅ |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Game Engine | [Phaser 3](https://phaser.io/) |
| Multiplayer | [Colyseus](https://colyseus.io/) |
| Language | TypeScript |
| Bundler | [Vite](https://vitejs.dev/) |
| Testing | [Vitest](https://vitest.dev/) + [fast-check](https://github.com/dubzzz/fast-check) |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run locally

Start the Colyseus server:

```bash
npm run server:dev
```

Start the Vite dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in two browser tabs to test multiplayer.

### Build for production

```bash
npm run build
```

## 📁 Project Structure

```
├── server/                 # Colyseus server
│   ├── index.ts            # Server entry + short code lookup endpoint
│   ├── app.config.ts       # Colyseus Cloud config
│   ├── rooms/
│   │   └── GameRoom.ts     # Game room: lifecycle, messages, game loop, battle tick
│   ├── logic/
│   │   ├── GridManager.ts  # Grid init, adjacency, circular spawn placement
│   │   ├── ConflictEngine.ts # Attack pressure, cost formulas
│   │   ├── aiNames.ts      # AI bot name generation
│   │   └── sanitize.ts     # Name sanitization
│   └── state/
│       └── GameState.ts    # Colyseus schema: Player, Tile, GameState
├── src/                    # Phaser client
│   ├── main.ts             # Game bootstrap
│   ├── scenes/
│   │   ├── MenuScene.ts    # Create/Join game menu + About popup
│   │   ├── LobbyScene.ts   # Color pick, name, room code, config, AI, start
│   │   ├── GameScene.ts    # Main game: grid, HUD, input, state sync, battles
│   │   └── TutorialScene.ts # 13-page How to Play
│   ├── rendering/
│   │   └── GridRenderer.ts # Tile rendering, animations, highlights, defense display
│   ├── ui/
│   │   └── HUDManager.ts   # Stats, purchase bots, timer, stats popup, bot icons
│   ├── network/
│   │   ├── client.ts       # Colyseus client config
│   │   └── NetworkManager.ts # Message wrapper (claim, attack, mine, bots, config)
│   ├── logic/
│   │   └── DirectionFilter.ts # Growth direction filtering
│   └── utils/
│       └── nameGenerator.ts # Random "Adjective Animalbot" names
├── issue_tracking/         # Project tracking
├── doc/                    # Design docs, changelog, transcripts
└── tests/                  # Vitest + fast-check tests
```

## 🎨 Features

- **Multiplayer** — 2–20 players in real-time via WebSockets
- **Room codes** — 5-character codes to share and join specific games
- **Quick Play** — Join a random public game instantly
- **Manual combat** — Click enemy tiles to attack; battle ticks run 2×/sec
- **Attack pressure** — Damage scales with factories and ATK bots, split across active battles
- **Defense bots** — Place 🛡️ bots on tiles for +5 defense each (max 4 per tile, permanent)
- **Collection bots** — Place ⚒ bots to auto-mine gears and generate passive factory income
- **Team absorption** — Defeated players join the victor's team and keep clicking
- **Factory demotion** — Lose your factory and you're demoted to non-leader (can't attack or buy ATK bots)
- **Stacking names** — Each absorption adds an adjective: "Turbo Hydraulic Otterbot"
- **Gear mining** — ⚙️ tiles with configurable scrap (default 1000), mined at 5 × factories
- **Deathmatch mode** — Infinite time, last team standing wins
- **Match formats** — Single match, Best of 3, Best of 5
- **AI opponents** — Up to 4 AI bots that mine, claim, upgrade, and attack
- **Server config** — Host configures time limit, match format, scrap supply, max players
- **Color persistence** — Your team always shows in your chosen color on your screen
- **10+ metal colors** — Copper, Gold, Titanium, Cobalt, Bismuth, Chromium, and more (20 in expanded mode)
- **Stats popup** — Full-screen team stats with tiles, ATK, DEF, COL, factories, and scrap
- **8 secret elite bots** — Hidden in the lobby tagline (find the clickable letters!)

## 🏆 Jam Challenge Tracks

| Challenge | Status |
|-----------|--------|
| Build it with Phaser | ✅ Eligible |
| Open Source by GitHub | ✅ Eligible |
| Deploy to Wavedash | 🔲 Pending |

## 📋 Issue Tracking

We use a lightweight markdown-based issue tracking system in [`issue_tracking/`](issue_tracking/).

| File | What it tracks |
|------|---------------|
| [Core Priorities](issue_tracking/core-priorities.md) | Must-do before jam submission |
| [Known Bugs](issue_tracking/known-bugs.md) | Confirmed bugs |
| [Nice-to-Haves](issue_tracking/nice-to-haves.md) | Polish items |
| [Backlog](issue_tracking/backlog.md) | Post-jam / future features |
| [Completed](issue_tracking/completed.md) | Done and verified |
| [Rejected](issue_tracking/rejected.md) | Decided against |

See [`issue_tracking/00_README.md`](issue_tracking/00_README.md) for how to add items, tag for triage, and assign work.

## 👥 Team

| Name | Role |
|------|------|
| Steph Hicks (Felar) | Developer |
| Nathan Engert (Valokor) | Developer |
| Evan Kuhlmann | Software Quality Engineer |
| Pete Wanamaker | Software Quality Engineer |

## 📄 License

MIT

## 🤝 Contributing

This project was built for the Gamedev.js Jam 2026. Contributions, ideas, and feedback are welcome. Open an issue or submit a PR.

---

<p align="center">
  <sub>Built with 🏭 for the Gamedev.js Jam 2026</sub>
</p>
