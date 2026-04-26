---
title: "Code Organization & Patterns"
description: "Documents architectural patterns used in Scrapyard Steal: authoritative server, scene-based client, schema decorators, rate limiting, and more."
version: "1.0.0"
date: "2026-04-26"
---

# Code Organization & Patterns

## Overview

Scrapyard Steal follows a clear separation between an authoritative Colyseus server and a Phaser 3 rendering client. This document catalogs the key architectural patterns and conventions used throughout the codebase.

## 1. Authoritative Server Pattern

All game logic runs in `GameRoom` on the server. The client is a thin rendering and input layer.

**How it works:**

- Client sends messages via `NetworkManager.send*()` methods
- Server validates every message (phase, rate limit, ownership, resources, bounds)
- Server mutates the Colyseus schema (`GameState`, `Player`, `Tile`)
- Colyseus automatically synchronizes state diffs to all clients
- Client re-renders on `room.onStateChange()`

**Why:** Prevents cheating. The client cannot modify game state directly. Even if a player reverse-engineers the client, they can only send messages that the server validates.

## 2. Scene-Based Client Architecture

The Phaser 3 client uses four scenes with a linear flow:

```
MenuScene → LobbyScene → GameScene
              ↑                ↓
         (back button)    (game end → MenuScene)

MenuScene → TutorialScene → MenuScene (side branch)
```

Each scene is a self-contained class extending `Phaser.Scene`:

- `MenuScene` — entry point, room creation/joining
- `LobbyScene` — pre-game configuration, receives `{ mode, roomId }` data
- `GameScene` — main gameplay, receives `{ room, networkManager, sessionId }` data
- `TutorialScene` — standalone 12-page tutorial

Scene transitions pass data via `this.scene.start(key, data)`.

## 3. Colyseus Schema Decorators

State is defined using `@colyseus/schema` decorators in `server/state/GameState.ts`:

```typescript
export class Player extends Schema {
  @type("string") id: string = "";
  @type("number") resources: number = 0;
  @type("boolean") absorbed: boolean = false;
  // ...
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Tile]) tiles = new ArraySchema<Tile>();
  // ...
}
```

**Limitations handled:**

- No nested object arrays in schema → `defenseBotsJSON` and `collectorsJSON` use JSON strings
- `seriesScoresJSON` stores round wins as a JSON-encoded `Record<string, number>`

## 4. Two-Tick-Loop Architecture

`GameRoom` runs two independent server-side loops:

| Loop | Interval | Purpose |
|------|----------|---------|
| `gameTick` | 1000 ms | Timer countdown, AI actions, automine (collectors), gear spawning, win-check |
| `battleTick` | 500 ms | Process all active battles: reduce defense, handle bot loss, tile capture, absorption triggers |

Both loops are started in `startGame()` and cleared in `handleRoundEnd()` and `onDispose()`.

**Why two loops:** Combat resolution needs faster feedback (500 ms) than economic actions (1 s). Separating them keeps each loop focused and predictable.

## 5. Rate Limiting Pattern

Implemented as a per-player, per-action-type timestamp map:

```typescript
private lastActionTime: Map<string, Map<string, number>> = new Map();
private static readonly RATE_LIMIT_MS = 100;

private checkRateLimit(sessionId: string, action: string): boolean {
  const now = Date.now();
  // ... check and update timestamp
}
```

Every message handler calls `checkRateLimit` before processing. Entries are cleaned up in `onLeave`.

## 6. Team Leader Delegation

When a player is absorbed, they join the captor's team. Absorbed players can still perform actions on behalf of their team leader:

```typescript
let leader = player;
if (player.absorbed && player.teamId) {
  const teamLeader = this.state.players.get(player.teamId);
  if (!teamLeader || teamLeader.absorbed) return;
  leader = teamLeader;
}
```

This pattern appears in handlers for: `claimTile`, `upgradeDefense`, `placeDefenseBot`, `upgradeCollection`, `placeCollector`, `mineGear`.

**Restrictions:** Only team leaders can `upgradeAttack` and `attackTile`.

## 7. Static Class Maps

`GameRoom` uses static maps shared across all room instances for cross-room coordination:

```typescript
static shortCodeMap = new Map<string, string>();   // code → roomId
static publicRooms = new Set<string>();             // public room codes
static playerCounts = new Map<string, number>();    // code → player count
```

These are read by Express endpoints (`/lookup`, `/public`, `/public/list`) and updated in `onCreate`, `onJoin`, `onLeave`, and `onDispose`.

## 8. Pure Logic Functions

Game calculations are extracted into pure, testable functions in `server/logic/`:

| Module | Functions |
|--------|-----------|
| `GridManager` | `initializeGrid`, `getAdjacentTiles`, `isAdjacent`, `assignStartingPositions`, `calculateGridSize`, `spawnNewGears` |
| `ConflictEngine` | `findBorders`, `calculateAttackPressure`, `resolveBorder`, `calculateTileClaimCost`, `calculateUpgradeCost` |
| `sanitize` | `sanitizeName` |
| `aiNames` | `generateAIName` |

These functions have no side effects and no dependencies on Colyseus runtime, making them ideal for unit and property-based testing.

## 9. Client Rendering Architecture

`GridRenderer` handles all tile visualization with HUD-aware margins:

```typescript
const LEFT_MARGIN = 140;    // stats panel
const RIGHT_MARGIN = 140;   // leaderboard + bot panel
const TOP_MARGIN = 8;
const BOTTOM_MARGIN = 50;   // identity + bot icons
```

The grid is centered within the remaining space. Tile size is calculated dynamically based on grid dimensions and available area.

`HUDManager` owns all UI elements outside the grid: stats panel (left), timer and stats popup (right), purchase bot buttons (bottom-right), notifications (center), and the capture choice modal.

## 10. AI Player Pattern

AI players are `Player` instances with `isAI = true`. They execute in the `gameTick` loop with the same validation as human players:

1. Mine a gear (prioritized)
2. Claim an adjacent neutral tile (prefer gear tiles)
3. Upgrade attack or defense
4. Initiate attacks on enemy border tiles

AI players auto-surrender on absorption (2-second delay). When a human player leaves mid-game, their player is converted to AI via the `leaveGame` handler (noun gets `"roid"` suffix appended).

## 11. Name Generation (Dual Implementation)

Name generation exists in two places to avoid cross-boundary imports:

| Location | Nouns | Purpose |
|----------|-------|---------|
| `src/utils/nameGenerator.ts` | 230+ animals with `"bot"` suffix | Human player names |
| `server/logic/aiNames.ts` | 35 household-roid nouns | AI player names |

Both share the same 35 adjectives and use the same deduplication pattern (filter by taken sets).

## 12. Short Code Generation

Room codes are 5 characters from a 32-character alphabet (no I/O/0/1 to avoid confusion):

```typescript
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
```

Uniqueness is enforced by checking against `GameRoom.shortCodeMap` before assignment.
