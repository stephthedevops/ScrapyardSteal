# Design: Test Coverage for Untested Server Logic

## Overview

This spec adds targeted tests for server logic that is currently untested or was recently modified. All tests use the existing vitest + fast-check infrastructure. Tests are organized into unit tests (concrete examples) and property-based tests (randomized invariant checking).

## Testing Strategy

### Pure Function Tests (Unit + Property)

Functions in `ConflictEngine.ts`, `GridManager.ts`, and `aiNames.ts` are pure and can be tested directly by importing and calling them with constructed inputs.

### Simulated Handler Tests (Unit)

The member upgrade flow and AI mining logic live inside `GameRoom.ts` message handlers and `gameTick()`. Since we can't instantiate a live Colyseus room in unit tests, we test these by **extracting the logic pattern** into test harnesses that replicate the handler's decision flow using `Player` and `Tile` schema objects directly.

This approach mirrors the existing pattern used in `tests/property/factoryCaptureChoice.prop.ts` and `tests/property/tileTransferAbsorption.prop.ts`, which simulate GameRoom logic without a running server.

## Test File Organization

| File | Covers |
|------|--------|
| `tests/unit/logic/ConflictEngine.test.ts` | Extend: calculateAttackPressure edge cases (Req 2.x) |
| `tests/unit/logic/aiNames.test.ts` | New: generateAIName fallback paths (Req 3.x) |
| `tests/unit/logic/GridManager.test.ts` | Extend: calculateGridSize clamping (Req 4.x) |
| `tests/unit/logic/memberUpgrade.test.ts` | New: member DEF/COL upgrade flow (Req 5.x) |
| `tests/unit/logic/aiMining.test.ts` | New: AI gear mining unrestricted access (Req 6.x) |

## Note on resolveBorder

`resolveBorder` is imported but never called in production code. The game uses `battleTick()` with a damage-over-time model instead. The `tileDefenseMap` and `pressureOverrides` parameters are dead code exercised only by existing tests. No new tests are needed for these paths — they could be candidates for removal in a future cleanup.

## Correctness Properties

### Property P1: calculateAttackPressure formula

_For any_ non-negative factories (0–10), attackBots (0–50), and activeBattles (1–10), `calculateAttackPressure` SHALL return `factories + floor(attackBots / activeBattles)`.

### Property P4: AI name generation never crashes

_For any_ subset of ADJECTIVES as taken and any subset of HOUSEHOLD_ROID as taken (including full exhaustion), `generateAIName` SHALL return an object with non-empty `adj` and `noun` strings.

### Property P5: calculateGridSize clamping

_For any_ playerCount (1–100), `calculateGridSize` SHALL return a value in [12, 20] equal to `min(20, max(12, 10 + playerCount))`.

## Simulated Handler Patterns

### Member Upgrade Simulation

Replicate the upgrade handler logic:
```
1. Create a Player (absorbed=true, teamId=leaderId)
2. Create a leader Player (absorbed=false, isTeamLead=true, resources=X)
3. Simulate: resolve leader from member, check cost, deduct, increment stat
4. Assert: leader.resources decreased, leader.stat increased, member.stat increased
```

### AI Mining Simulation

Replicate the AI mining logic from gameTick:
```
1. Create tiles with various ownerId and hasGear/gearScrap values
2. Create an AI player with owned tiles (for factory count)
3. Simulate: iterate tiles, find first minable gear (unclaimed or owned), extract scrap
4. Assert: correct tile was mined, scrap transferred, hasGear cleared when depleted
```
