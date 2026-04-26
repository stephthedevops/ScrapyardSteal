---
title: "Endpoint Catalog"
description: "Catalogs all Express REST endpoints and Colyseus message handlers for Scrapyard Steal."
version: "1.0.0"
date: "2026-04-26"
---

# Endpoint Catalog

## Express REST Endpoints

All endpoints are defined in `server/app.config.ts` via the `initializeExpress` callback.

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/` | Health check | `"Scrapyard Steal server"` |
| GET | `/lookup?code=XXXXX` | Resolve a 5-character short code to a Colyseus `roomId` | `{ roomId }` or `404 { error }` |
| GET | `/public` | Get the first available public room | `{ roomId, code }` or `404 { error }` |
| GET | `/public/list` | List all public rooms with player counts | `{ rooms: [{ code, roomId, playerCount }] }` |
| GET | `/colyseus` | Colyseus Monitor dashboard (`@colyseus/monitor`) | HTML dashboard |

### Static Class Maps Used by Endpoints

The REST endpoints read from static maps on the `GameRoom` class:

- `GameRoom.shortCodeMap: Map<string, string>` — maps short codes to room IDs
- `GameRoom.publicRooms: Set<string>` — short codes of public waiting rooms
- `GameRoom.playerCounts: Map<string, number>` — player count per short code

## Colyseus Room Definition

Defined in `server/app.config.ts`:

```typescript
gameServer.define("game", GameRoom);
```

Single room type `"game"` handles all game phases.

## Client-to-Server Message Handlers

All handlers are registered in `GameRoom.onCreate()`. Each handler validates phase, rate limits (100 ms per action type), and player state before processing.

### Lobby Phase Messages (phase = `"waiting"`)

| Message | Payload | Purpose | Sender Restriction |
|---------|---------|---------|--------------------|
| `startGame` | `{}` | Host starts the game | Host only |
| `setName` | `{ adj: string, noun: string }` | Set player display name | Any player |
| `togglePublic` | `{}` | Toggle room public/private visibility | Host only |
| `selectColor` | `{ color: number }` | Choose a color from the allowed palette | Any player |
| `setConfig` | `{ timeLimit?, matchFormat?, gearScrapSupply?, maxPlayers? }` | Configure match settings | Host only |
| `addAI` | `{ color: number }` | Add an AI player to the lobby | Host only |
| `removeAI` | `{ aiPlayerId: string }` | Remove an AI player from the lobby | Host only |

### Active Phase Messages (phase = `"active"`)

| Message | Payload | Purpose | Sender Restriction |
|---------|---------|---------|--------------------|
| `claimTile` | `{ x: number, y: number }` | Claim an adjacent neutral tile | Any non-pending player |
| `upgradeAttack` | `{}` | Purchase an ATK bot (+1 attack) | Team lead only |
| `upgradeDefense` | `{}` | Purchase a DEF bot (+1 defense) | Any non-pending player |
| `placeDefenseBot` | `{ x: number, y: number }` | Place a DEF bot on an owned tile (max 4 per tile) | Any non-pending player |
| `attackTile` | `{ x: number, y: number }` | Initiate a battle on an adjacent enemy tile | Team lead with factory |
| `upgradeCollection` | `{}` | Purchase a COL bot (+1 collection) | Any non-pending player |
| `placeCollector` | `{ x: number, y: number }` | Place a collector on an owned spawn/gear tile | Any non-pending player |
| `mineGear` | `{ x: number, y: number }` | Extract scrap from a gear tile | Any non-pending player |
| `captureResponse` | `{ choice: "surrender" \| "drop" }` | Respond to absorption prompt | Pending player only |
| `leaveGame` | `{}` | Voluntarily leave (converts to AI takeover) | Any active player |

### Team Leader Delegation

Absorbed team members can perform actions on behalf of their team leader. The server resolves the effective leader for: `claimTile`, `upgradeDefense`, `placeDefenseBot`, `upgradeCollection`, `placeCollector`, `mineGear`.

## Server-to-Client Broadcasts

These are sent via `this.broadcast()` or targeted `client.send()` in `GameRoom`.

| Message | Payload | Target | Purpose |
|---------|---------|--------|---------|
| `gameStarted` | `{}` | All clients | Signals lobby-to-game transition |
| `battleFlash` | `{ x, y, attackerId }` | All clients | Visual flash on attacked tile |
| `factoryCaptured` | `{ claimingTeamName, factoryAdj }` | All clients | Factory ownership change notification |
| `selfDestruct` | `{ tiles: [{x, y}] }` | All clients | Explosion animation on dropped tiles |
| `notification` | `{ message }` | All clients | General notification (e.g., absorption) |
| `captureChoice` | `{ captorTeamName, timeoutSeconds }` | Pending player | Prompt surrender or self-destruct |
| `captureResolved` | `{ result }` | Pending player | Dismiss capture choice modal |
| `startError` | `{ message }` | Host | Error starting game (duplicate names, etc.) |
| `nameRejected` | `{ adj, noun, adjTaken, nounTaken }` | Requesting player | Name collision notification |
