# Design Document: Configurable Gear Scrap Supply

## Overview

Replace the hardcoded gear scrap value of 50 with a configurable `gearScrapSupply` field (default 1000) on `GameState`. The host sets it via the existing `setConfig` message handler, and a new selector row is added to the LobbyScene config panel. The value is used in all three places that previously hardcoded 50: `startGame()`, `gameTick()`, and `resetForNextRound()`.

## Architecture

No new modules or files. Changes touch four existing files:

1. **`server/state/GameState.ts`** — add `gearScrapSupply` field
2. **`server/rooms/GameRoom.ts`** — extend `setConfig` handler, replace three hardcoded `50`s
3. **`src/scenes/LobbyScene.ts`** — add gear scrap selector row to config panel
4. **`src/network/NetworkManager.ts`** — widen `sendSetConfig` type signature

```
┌─────────────────┐   setConfig({gearScrapSupply})   ┌──────────────┐
│  LobbyScene     │ ──────────────────────────────▶   │  GameRoom    │
│  Config Panel   │                                   │  setConfig   │
│  [50][100]      │                                   │  handler     │
│  [500][1000]    │                                   │              │
│  [2000]         │                                   │  validates   │
└─────────────────┘                                   │  & stores in │
        ▲                                             │  GameState   │
        │  state.gearScrapSupply (synced)             └──────┬───────┘
        └─────────────────────────────────────────────────────┘
```

## Components and Interfaces

### GameState (server/state/GameState.ts)

Add one field:

```typescript
@type("number") gearScrapSupply: number = 1000;
```

### GameRoom (server/rooms/GameRoom.ts)

| Location | Change |
|---|---|
| `setConfig` handler | Add `gearScrapSupply` to accepted fields with `ALLOWED_SCRAP_VALUES = [50, 100, 500, 1000, 2000]` validation |
| `startGame()` | Replace `neutralTiles[i].gearScrap = 50` with `neutralTiles[i].gearScrap = this.state.gearScrapSupply` |
| `gameTick()` step 6 | Replace `tile.gearScrap = 50` with `tile.gearScrap = this.state.gearScrapSupply` |
| `resetForNextRound()` | Replace `neutralTiles[i].gearScrap = 50` with `neutralTiles[i].gearScrap = this.state.gearScrapSupply` |

No new private fields needed — `gearScrapSupply` lives on `GameState` and persists across rounds automatically.

### NetworkManager (src/network/NetworkManager.ts)

Widen the `sendSetConfig` parameter type:

```typescript
sendSetConfig(config: { timeLimit?: number; matchFormat?: string; gearScrapSupply?: number }): void
```

### LobbyScene (src/scenes/LobbyScene.ts)

Add a "GEAR SCRAP" section to `openConfigPanel()` between the match format section and the AI players section. Uses the same button pattern as time limit and match format:

- Label: "GEAR SCRAP"
- Buttons: `50`, `100`, `500`, `1000`, `2000`
- Initial highlight reads from `this.room?.state?.gearScrapSupply ?? 1000`
- On click: `this.networkManager.sendSetConfig({ gearScrapSupply: value })`

## Data Models

### GameState Schema Change

| Field | Type | Default | Description |
|---|---|---|---|
| `gearScrapSupply` | `number` | `1000` | Scrap amount each gear tile starts with |

This is a Colyseus `@type("number")` field, automatically synced to all clients.

## Correctness Properties

### Property 1: Gear scrap value validation

*For any* integer value sent as `gearScrapSupply` in a `setConfig` message from the host during the "waiting" phase, the server SHALL update `GameState.gearScrapSupply` only if the value is in {50, 100, 500, 1000, 2000}. All other values SHALL leave the field unchanged.

**Validates: Requirements 2.1, 2.2**

### Property 2: Gear scrap authorization

*For any* player who is not the host, sending a `setConfig` message with `gearScrapSupply` SHALL NOT change `GameState.gearScrapSupply`.

**Validates: Requirements 2.3**

### Property 3: Gear tiles use configured supply

*For any* valid `gearScrapSupply` value V, all gear tiles created during `startGame()`, `gameTick()`, and `resetForNextRound()` SHALL have `gearScrap` equal to V.

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

No new error conditions. Invalid `gearScrapSupply` values are silently ignored (same pattern as existing `timeLimit` and `matchFormat` validation). Non-host senders are silently ignored (existing guard).

## Testing Strategy

### Property-Based Tests (fast-check, minimum 100 iterations each)

File: `tests/property/gearScrapConfig.prop.ts`

- **Property 1**: Generate random integers. Apply `setConfig` with `gearScrapSupply`. Assert state updates only for values in {50, 100, 500, 1000, 2000}.
- **Property 2**: Generate random non-host session IDs and valid scrap values. Assert state is unchanged.
- **Property 3**: Generate valid scrap values. Simulate gear placement. Assert all gear tiles have `gearScrap === value`.

Library: `fast-check` (already installed)
Runner: `vitest run`
