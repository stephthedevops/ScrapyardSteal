# Requirements: Test Coverage for Untested Server Logic

## Overview

The test suite (157 tests) covers pure utility functions well but has significant gaps in server-side game logic that was recently changed or never tested. This spec targets testable server logic that can be exercised without a live Colyseus room — focusing on pure functions, isolated handlers, and state manipulation patterns that are extracted or simulated in test harnesses.

## Coverage Gaps Identified

Current coverage: 13% statements, 6% branches, 14% functions, 15% lines.
- `server/logic/ConflictEngine.ts` — 74% statements. Missing: `resolveBorder` with `tileDefenseMap` / `pressureOverrides`, weakest-tile selection.
- `server/logic/aiNames.ts` — 22% statements. Missing: `generateAIName` when all names are taken (fallback path).
- `server/logic/sanitize.ts` — covered by property tests but not by unit tests with concrete examples.
- `server/logic/GridManager.ts` — `spawnNewGears` covered, but `calculateGridSize` unit test was stale (just fixed). No edge-case unit tests for clamping.
- Member upgrade flow (DEF/COL bots via team leader) — just implemented, zero tests.
- AI gear mining (any unclaimed gear, not just adjacent) — just changed, zero tests.

## Requirements

### 1. ConflictEngine — resolveBorder (REMOVED)

_Dropped: `resolveBorder` is imported but never called in production code. The game uses `battleTick()` with a damage-over-time model instead. The `tileDefenseMap` and `pressureOverrides` parameters are dead code. No tests needed._

### 2. ConflictEngine — calculateAttackPressure

2.1 `calculateAttackPressure(factories, attackBots, activeBattles)` SHALL return `factories + floor(attackBots / max(1, activeBattles))`.

2.2 When `activeBattles` is 0 or omitted, it SHALL default to 1.

### 3. AI Name Generation — Fallback Paths

3.1 When all adjectives are taken, `generateAIName` SHALL still return an adjective from the ADJECTIVES pool (random fallback, may duplicate).

3.2 When all nouns are taken, `generateAIName` SHALL still return a noun from the HOUSEHOLD_ROID pool (random fallback, may duplicate).

3.3 When both pools are fully exhausted, `generateAIName` SHALL return a valid `{ adj, noun }` object (no crash, no empty strings).

### 4. GridManager — calculateGridSize Edge Cases

4.1 `calculateGridSize` SHALL return 12 for playerCount ≤ 2 (lower clamp).

4.2 `calculateGridSize` SHALL return 20 for playerCount ≥ 10 (upper clamp).

4.3 `calculateGridSize` SHALL return `10 + playerCount` for values in the range [3, 9].

### 5. Member Upgrade Flow (DEF and COL Bots)

5.1 When an absorbed member sends `upgradeDefense`, the server SHALL resolve to the team leader and deduct the cost from the leader's resources.

5.2 When an absorbed member sends `upgradeCollection`, the server SHALL resolve to the team leader and deduct the cost from the leader's resources.

5.3 The leader's stat (defense or collection) SHALL increment by 1 after a successful member purchase.

5.4 All team members SHALL receive the stat increment (defense or collection) when the leader's stat increases.

5.5 If the team leader is also pending absorption, the purchase SHALL be rejected.

5.6 If the team leader has insufficient resources, the purchase SHALL be rejected.

### 6. AI Gear Mining — Unrestricted Unclaimed Access

6.1 AI players SHALL mine any unclaimed gear tile on the map, not just those adjacent to their territory.

6.2 AI players SHALL NOT mine gear tiles owned by enemy players.

6.3 AI mining extraction SHALL equal `min(5 × factoryCount, tile.gearScrap)`, with factoryCount ≥ 1.

6.4 When a gear tile's scrap reaches 0 after mining, `hasGear` SHALL be set to false.
