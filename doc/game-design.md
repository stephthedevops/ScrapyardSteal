# Scrapyard Steal — Game Design Document

<p align="center">
  <img src="../images/scrapyardsteal.png" alt="Scrapyard Steal" width="50%"/> <br />
</p>

## Overview

Scrapyard Steal is a multiplayer clicker/strategy game built for the Gamedev.js Jam 2026 (theme: "Machines"). Players share a scrapyard world, each controlling a factory-machine. The goal is to grow your machine by claiming scrap tiles, expanding territory, mining gears, and absorbing opponents into your team.

## Core Concept

Each player starts with a single tile and a factory (🏭). Players compete on a shared tile grid, expanding territory through clicking. When you overcome an opponent through border conflict, they join your team — their adjective stacks onto your team name, and they can help you click to earn scrap. The game ends after 5 minutes; the team with the most tiles wins.

## Game Mechanics

### Territory Expansion
- The map is a shared grid of tiles. Each player starts with 1 tile, placed equidistant around a circle.
- Players click neutral tiles adjacent to their territory to claim them.
- Claiming tiles costs scrap. Cost scales with tile count: `floor(10 × (1 + 0.02 × tileCount))`.
- More tiles = more income (1 scrap per tile per second).

### Border Conflict
- Borders between opposing players are evaluated every second.
- Attack pressure = `attack × shared border tiles`.
- Defense resistance = `defense × shared border tiles`.
- If pressure > resistance, one border tile transfers to the attacker.
- Equal pressure = stalemate (no transfer).

### Team Absorption
- When a player loses all tiles via border conflict, they are absorbed.
- The absorbed player joins the absorber's team.
- The absorbed player's name adjective is prepended to the team name (e.g., "Turbo Hydraulic Otterbot").
- Team members can click to claim tiles and mine gears for the team leader.
- Only the team leader can spend scrap on upgrades.
- The absorber receives 25% of the absorbed player's scrap as a bonus.

### Gear Mining
- Gear tiles (⚙) are randomly placed on the grid at game start (3 × player count).
- Each gear has 50 scrap.
- Click a gear tile to extract scrap equal to your team's attack stat.
- Gears can be mined on unclaimed tiles or tiles you own.
- Gears disappear when depleted.

### Upgrades
- Attack upgrade cost: `50 × current attack`.
- Defense upgrade cost: `50 × current defense`.
- Only the team leader can purchase upgrades.

### Growth Direction
- Arrow keys set a preferred expansion direction (north/south/east/west).
- Claimable tiles are filtered by direction relative to territory centroid.
- Press the same arrow again or Escape to clear.

### Stationary Model
- Machines expand outward from their position without movement.
- All expansion is through tile claiming, not unit movement.

## Player Identity

- Each player has a random name: adjective + noun (e.g., "Turbo Falconbot").
- Adjectives are machine-themed (Rusty, Turbo, Chrome, Hydraulic, etc.).
- Nouns are animals with "bot" suffix (Falconbot, Otterbot, Sharkbot, etc.).
- Players can reroll their name in the lobby (♻ button).
- Names are unique within a lobby (no duplicate adjectives or nouns).

## Color System

- 10 metal-themed colors: Copper, Corroded Copper, Gold, Tarnished Silver, Titanium, Cobalt, Bismuth, Rusty Iron, Chromium, Tungsten.
- Players choose a color in the lobby. Taken colors show a red ✕.
- After absorption, your screen still renders your team in your original chosen color.

## Lobby & Matchmaking

- Host creates a game and receives a 5-character room code.
- Other players join by entering the code.
- Host clicks START to begin the game.
- Multiple simultaneous game rooms are supported.

## Win Condition

- 5-minute timer. Most tiles when time expires wins.

## Theme Integration

<img src="../images/bunnybot.png" alt="Bunnybot" width="75%"/><br />
The game is set in a scrapyard. Players control factory-machines that collect scrap to grow. Tiles represent scrap integrated into the machine's body. Absorbing an opponent means salvaging their parts. Visual language: rust tones, metallic colors, gears, factory icons.

## Technical Stack

| Layer | Tech |
|-------|------|
| Game engine | Phaser 3 |
| Multiplayer | Colyseus |
| Server runtime | Node.js |
| Language | TypeScript |
| Build tool | Vite |
| Testing | Vitest + fast-check |
| Client hosting | itch.io |
| Server hosting | Colyseus Cloud (us-ord-ef0ec457.colyseus.cloud) |

### Repository
- https://github.com/stephthedevops/ScrapyardSteal
