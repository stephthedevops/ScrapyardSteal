---
title: "Reverse Engineering - Scrapyard Steal"
description: "Architecture patterns and conventions derived from reverse-engineering the Scrapyard Steal codebase"
version: "1.0.0"
lastUpdated: "2026-04-26"
lastUpdatedBy: "AI Assistant"
inclusion: "fileMatch"
patterns: ["server/**/*.ts", "src/**/*.ts", "tests/**/*.ts"]
---

# Scrapyard Steal — Architecture Patterns & Conventions

## Architecture Overview

Scrapyard Steal is a multiplayer clicker/strategy game with an authoritative Colyseus server and a thin Phaser 3 rendering client. All game logic runs server-side. The client sends messages and renders state diffs.

## Module Structure

### Server (`server/`)
- `index.ts` — entry point, calls `listen(app)` from `@colyseus/tools`
- `app.config.ts` — room definitions + Express REST endpoints
- `rooms/GameRoom.ts` — single room type handling full lifecycle (1685 lines)
- `logic/` — pure functions: GridManager, ConflictEngine, aiNames, sanitize
- `state/GameState.ts` — Colyseus schema: Player, Tile, GameState

### Client (`src/`)
- `main.ts` — Phaser.Game bootstrap with 4 scenes
- `scenes/` — MenuScene → LobbyScene → GameScene (+ TutorialScene)
- `rendering/GridRenderer.ts` — tile rendering with HUD-aware margins
- `ui/HUDManager.ts` — stats, purchase bots, timer, notifications, modals
- `ui/MusicToggle.ts` — global mute toggle
- `network/NetworkManager.ts` — typed send methods wrapping room.send()
- `network/client.ts` — Colyseus Client instance
- `utils/nameGenerator.ts` — random name generation

## Key Patterns

### 1. Authoritative Server
All state mutations happen in GameRoom. Client never modifies GameState directly. Every message handler validates: phase, rate limit, player existence, ownership, resources, bounds.

### 2. Two-Tick-Loop
- `gameTick` (1000ms): timer, AI actions, automine, gear spawning, win check
- `battleTick` (500ms): attack resolution, defense reduction, tile capture, absorption

### 3. Team Leader Delegation
Absorbed players act on behalf of their team leader. Pattern:
```typescript
let leader = player;
if (player.absorbed && player.teamId) {
  const teamLeader = this.state.players.get(player.teamId);
  if (!teamLeader || teamLeader.absorbed) return;
  leader = teamLeader;
}
```

### 4. Rate Limiting
100ms minimum between same-type actions per player. Map<sessionId, Map<actionType, timestamp>>.

### 5. Static Class Maps
GameRoom uses static maps for cross-room coordination: shortCodeMap, publicRooms, playerCounts.

### 6. Pure Logic Functions
Game calculations in `server/logic/` are pure, side-effect-free, and independently testable.

### 7. JSON-Encoded Schema Fields
Colyseus schema limitation: nested arrays use JSON strings (defenseBotsJSON, collectorsJSON, seriesScoresJSON).

### 8. Scene Data Passing
Phaser scenes pass data via `this.scene.start(key, data)`. GameScene receives `{ room, networkManager, sessionId }`.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | PascalCase for classes, camelCase for utilities | `GameRoom.ts`, `nameGenerator.ts` |
| Classes | PascalCase | `GameRoom`, `GridRenderer`, `HUDManager` |
| Functions | camelCase | `calculateTileClaimCost`, `sanitizeName` |
| Constants | UPPER_SNAKE_CASE | `BASE_COLORS`, `RATE_LIMIT_MS` |
| Message types | camelCase strings | `"claimTile"`, `"battleFlash"` |
| Schema fields | camelCase | `ownerId`, `isTeamLead`, `gearScrap` |

## Game Formulas

- Tile claim cost: `floor(10 × (1 + 0.02 × tileCount))`
- Upgrade cost: `50 + (5 × currentStatValue)`
- Attack pressure: `factories + floor(attackBots / activeBattles)`
- Tile defense: `5 + (defenseBots on tile × 5)`
- Mining yield: `5 × factories owned`
- Grid size: `min(20, max(12, 10 + playerCount))`

## Testing Conventions

- Unit tests: `tests/unit/**/*.test.ts`
- Property tests: `tests/property/**/*.prop.ts`
- E2E tests: `tests/e2e/**/*.spec.ts`
- Test aliases: `server` → `/server`, `src` → `/src`
- Property tests use fast-check with descriptive property names

## Security Model

- No authentication — session-based identity only
- All input validated server-side (bounds, whitelists, sanitization)
- Rate limiting on all gameplay actions
- Monitor endpoint (`/colyseus`) should be auth-protected in production

## Deployment

- Server: Colyseus Cloud (US-ORD), deployed via `@colyseus/cloud` CLI
- Client: Wavedash static hosting, deployed via `wavedash` CLI
- Production server URL set via `VITE_SERVER_URL` env var at build time
