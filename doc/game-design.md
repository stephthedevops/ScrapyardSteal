# Scrap Machine — Game Design Document

## Overview

Scrap Machine is a multiplayer clicker/strategy game built for the Gamedev.js Jam 2026 (theme: "Machines"). Players share a "petri dish" world with 10–20 participants, each controlling a small factory or machine in a scrapyard setting. The goal is to grow your machine by collecting scrap tiles, expanding territory, and absorbing opponents — not eliminating them.

## Core Concept

Each player starts with a small organism-like factory and a few buttons: grow, attack, and defend. Players compete on a shared tile grid, expanding territory through strategic clicking. When you overcome an opponent, they aren't eliminated — instead, the defeated player's territory is absorbed and assists the victor in further expansion.

## Game Mechanics

### Territory Expansion
- The map is a shared grid of tiles. Each player starts with a small cluster.
- Players click to grow, claiming neutral tiles adjacent to their territory.
- Claiming tiles increases territory size and resource income, fueling further expansion and upgrades.

### Border Conflict & Stalemates
- When two players share a border, conflict is resolved by comparing attack strength and tile control along the shared edge.
- Players with similar attack and defense values may reach a stalemate, sharing a border until one gains an advantage.
- Tile takeover is gradual, influenced by border length and relative attack strength.
- Absorbed tiles become part of the attacker's territory.

### Steering Growth
- Players can steer their growth direction, choosing to expand toward specific opponents or neutral territory.
- This adds a layer of strategy beyond raw stat upgrades — positioning and timing matter.

### Growth Strategy
- Players balance three priorities:
  - **Growth speed** — how fast you claim neutral tiles
  - **Defense** — how resistant your borders are to absorption
  - **Aggression** — how effectively you push into opponent territory
- Upgrade costs increase as your machine grows, forcing strategic choices about when to expand vs. fortify.

### Resource Management
- Resource income is proportional to the number of tiles controlled.
- Growth increases income, which fuels further expansion and upgrades.
- Resources are spent on:
  - Claiming new tiles
  - Upgrading attack strength
  - Upgrading defense
- The initial version uses a single resource type. Multiple resource types may be added later.

### Static / Stationary Model (V1)
- The first version features stationary players — machines expand outward from their position without movement.
- This keeps the initial build simple and playable.
- Movement mechanics may be added in a later iteration to enrich gameplay.

### Future Features (Post-V1)
- **Attack types** — Different attack types with rock-paper-scissors style strengths and weaknesses.
- **Multiple resources** — Additional resource types to add economic depth.
- **Movement** — Allowing machines to physically move across the grid.
- These are explicitly deferred to keep V1 scoped for the jam timeline.

## Theme Integration

The game is set in a scrapyard. Players control tank-like machines with magnets that collect scrap to grow. Tiles represent scrap that machines integrate into their body. Absorbing an opponent means salvaging their parts. The visual language should lean into industrial/mechanical aesthetics — rust, magnets, welded metal, sparks.

## Technical Considerations

### Engine Options
- **Phaser** — Strong HTML5 support, sponsor of the jam, dedicated challenge track with extra prizes.
- **Godot** — Familiar to some developers, supports HTML5 export.
- **Cocos Creator** — Full-featured 2D/3D engine with web export.
- **Defold** — Lightweight, also a jam sponsor.

Engine choice is still open pending team familiarity and comfort level.

### Target Platform
- Web browser (HTML5) — required for Gamedev.js Jam submission.

## Open Questions

- Which engine/framework to commit to?
- How to handle the learning curve for unfamiliar technologies within the jam window?
- Movement mechanics: defer entirely or attempt a basic version during the jam?
- How many simultaneous players can the design support before performance degrades?

## Next Steps

1. Share this document with the team for feedback
2. Lock in engine choice and set up project scaffold
3. Prototype the tile grid, click-to-grow mechanic, and basic resource loop
4. Implement border conflict and stalemate logic
5. Playtest and iterate on balance (growth vs. defense vs. aggression)
