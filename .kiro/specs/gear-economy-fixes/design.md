# Gear Economy Fixes — Bugfix Design

## Overview

Three interrelated bugs in the gear economy system cause broken gear spawning, a resource double-deduction exploit, and a wrong upgrade pricing curve. The fix targets three isolated code paths:

1. **Gear spawning** — `gameTick()` calls `spawnNewGears(this.state.tiles.toArray(), 1)`. The Colyseus `ArraySchema.toArray()` may not return a plain `Array` compatible with the function's index-based iteration, and the hardcoded `1` ignores active player count. Fix: convert to a plain array via spread or `Array.from`, and pass the active player count.
2. **Same-click claim + mine** — The client sends both `claimTile` and `mineGear` in the same frame for unclaimed gear tiles. The server's `mineGear` handler allows mining on tiles owned by the player, so after `claimTile` assigns ownership the subsequent `mineGear` succeeds. Fix: the `mineGear` handler should reject requests on tiles that have `ownerId === ""` (unclaimed), requiring the player to already own the tile before mining.
3. **Upgrade cost formula** — `calculateUpgradeCost` returns `50 * currentStatValue` instead of `50 + (5 * currentStatValue)`. Fix: change the formula.

## Glossary

- **Bug_Condition (C)**: The set of inputs/states that trigger one of the three bugs — ArraySchema incompatibility in gear spawning, simultaneous claim+mine on unclaimed gear tiles, or upgrade cost calculation with the wrong formula
- **Property (P)**: The desired correct behavior — gears spawn on valid tiles, mining requires prior ownership, upgrade cost follows `50 + (5 × level)`
- **Preservation**: Existing behaviors that must remain unchanged — countdown suppression, mining owned tiles, standard tile claiming, stat increment mechanics, max caps, initial gear placement
- **`spawnNewGears(tiles, count)`**: Pure function in `server/logic/GridManager.ts` that selects random unclaimed non-spawn tiles without existing gears to become new gear tiles
- **`calculateUpgradeCost(statValue)`**: Pure function in `server/logic/ConflictEngine.ts` that computes the resource cost to upgrade a stat
- **`gameTick()`**: Server method in `GameRoom.ts` that runs once per second, handling income, AI actions, gear spawning, and win-condition checks
- **`mineGear` handler**: Server message handler in `GameRoom.ts` that extracts scrap from a gear tile when a player clicks it
- **`claimTile` handler**: Server message handler in `GameRoom.ts` that assigns an unclaimed tile to a player's territory

## Bug Details

### Bug Condition

The bugs manifest under three distinct conditions that together break the gear economy:

**Bug 1 — Gear Spawning Failure**: After the 20-second countdown expires, `gameTick()` calls `spawnNewGears(this.state.tiles.toArray(), 1)`. If `ArraySchema.toArray()` returns an object that doesn't support standard array indexing or iteration as expected by `spawnNewGears`, the function silently returns an empty array and no gears spawn. Additionally, the hardcoded `1` means at most one gear spawns per tick regardless of player count.

**Bug 2 — Double-Deduction on Claim+Mine**: When a player clicks an unclaimed tile that has a gear, the client sends both `claimTile` and `mineGear` in the same frame. The server processes `claimTile` first (deducting claim cost, assigning ownership), then `mineGear` fires on the now-owned tile and succeeds because `tile.ownerId === leader.id`. The player pays the claim cost AND extracts gear scrap in a single click.

**Bug 3 — Wrong Upgrade Cost**: `calculateUpgradeCost(currentStatValue)` returns `50 * currentStatValue`. At level 0 this produces cost 0 (free upgrade), and at higher levels costs are far too steep (level 10 → 500 instead of intended 100).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { bugType: "spawn" | "doubleMine" | "upgradeCost", context: any }
  OUTPUT: boolean

  IF input.bugType == "spawn" THEN
    RETURN input.context.gearRespawnCountdown <= 0
           AND input.context.tilesArgument IS ArraySchema (not plain Array)
  END IF

  IF input.bugType == "doubleMine" THEN
    RETURN input.context.tile.ownerId == ""
           AND input.context.tile.hasGear == true
           AND input.context.tile.gearScrap > 0
           AND input.context.actionType == "mineGear"
  END IF

  IF input.bugType == "upgradeCost" THEN
    RETURN true  // formula is always wrong for all stat values
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Gear spawning**: Game has 4 active players, countdown reaches 0, `spawnNewGears(this.state.tiles.toArray(), 1)` is called. If `toArray()` returns an incompatible object, zero gears spawn. Even if it works, only 1 gear spawns instead of 4.
- **Double-deduction**: Player clicks unclaimed tile at (3, 5) with 100 gearScrap. Server deducts ~10 claim cost, assigns tile, then extracts 5 scrap — player gets the tile AND scrap in one click instead of requiring two separate actions.
- **Upgrade cost at level 0**: Player with attack=0 upgrades. Cost = `50 * 0 = 0`. Player gets a free attack upgrade.
- **Upgrade cost at level 10**: Player with attack=10 upgrades. Cost = `50 * 10 = 500`. Intended cost = `50 + (5 * 10) = 100`. Player is overcharged by 400.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The 20-second gear respawn countdown at round start must continue to suppress spawning (requirement 3.1)
- Players clicking tiles they already own that contain gears must continue to mine normally (requirement 3.2)
- Claiming unclaimed tiles without gears must continue to work with the standard claim cost formula (requirement 3.3)
- Successful upgrades must continue to increment the stat by 1 and deduct the calculated cost (requirement 3.4)
- Attack and defense upgrades at the maximum cap of 50 must continue to be rejected (requirement 3.5)
- Initial gear placement during `startGame()` and `resetForNextRound()` must continue to place exactly one gear per player on neutral tiles (requirement 3.6)

**Scope:**
All inputs that do NOT involve the three bug conditions should be completely unaffected by this fix. This includes:
- Mouse clicks on already-owned tiles (mining, placing bots)
- Tile claims on non-gear tiles
- All battle mechanics (attack, defense bots, absorption)
- AI player behavior (except they will benefit from corrected upgrade costs)
- Configuration settings (time limit, match format, gear scrap supply)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Gear Spawning — ArraySchema.toArray() Incompatibility**: In `GameRoom.ts` line ~1197, `this.state.tiles.toArray()` is called on a Colyseus `ArraySchema<Tile>`. The `toArray()` method may return a proxy or schema-wrapped array that doesn't behave identically to a plain `Array` when accessed by index in `spawnNewGears`. The function iterates with `for (let i = 0; i < tiles.length; i++)` and accesses `tiles[i]`, which may fail on the schema object. Additionally, the second argument is hardcoded to `1` instead of the active player count.

2. **Double-Deduction — No Ownership Guard in mineGear**: In the `mineGear` handler (GameRoom.ts), the check `if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;` allows mining when `tile.ownerId === ""` (unclaimed). This was likely intended to let players mine unclaimed adjacent gear tiles, but combined with the client sending both `claimTile` and `mineGear` in the same frame, it creates a double-deduction exploit. The `claimTile` handler runs first and assigns ownership, then `mineGear` succeeds because the tile is now owned by the player.

3. **Upgrade Cost — Wrong Formula**: In `ConflictEngine.ts`, `calculateUpgradeCost` returns `50 * currentStatValue` instead of `50 + (5 * currentStatValue)`. This is a straightforward formula error — multiplication instead of addition with a different coefficient.

## Correctness Properties

Property 1: Bug Condition — Upgrade Cost Formula Correctness

_For any_ non-negative integer `statValue` (0–50), the fixed `calculateUpgradeCost(statValue)` SHALL return exactly `50 + (5 * statValue)`, producing a base cost of 50 at level 0 and scaling linearly by 5 per level.

**Validates: Requirements 2.3, 2.4**

Property 2: Preservation — Upgrade Cost Monotonicity and Positivity

_For any_ two non-negative integers `a < b` (0–50), the fixed `calculateUpgradeCost` SHALL satisfy `calculateUpgradeCost(a) < calculateUpgradeCost(b)` (strictly increasing), and for any non-negative integer `statValue`, `calculateUpgradeCost(statValue) >= 50` (always at least the base cost).

**Validates: Requirements 3.4, 3.5**

Property 3: Bug Condition — mineGear Rejects Unclaimed Tiles

_For any_ tile where `ownerId === ""` (unclaimed) and `hasGear === true` and `gearScrap > 0`, the fixed `mineGear` handler SHALL reject the mining request and the player's resources SHALL remain unchanged.

**Validates: Requirements 2.2**

Property 4: Preservation — mineGear Allows Mining Owned Gear Tiles

_For any_ tile where `ownerId === leader.id` (owned by the player's team leader) and `hasGear === true` and `gearScrap > 0`, the fixed `mineGear` handler SHALL extract scrap normally, producing the same result as the original function.

**Validates: Requirements 3.2**

Property 5: Bug Condition — Gear Spawning With Plain Array

_For any_ grid of tiles passed as a plain `Array` (not an `ArraySchema`) with at least one valid candidate tile (unclaimed, non-spawn, no existing gear), `spawnNewGears` SHALL return at least one valid index pointing to a candidate tile.

**Validates: Requirements 2.1**

Property 6: Preservation — Initial Gear Placement Unchanged

_For any_ player count N (1–10), the initial gear placement in `startGame()` and `resetForNextRound()` SHALL continue to produce exactly N gear tiles on neutral tiles with `gearScrap` set to the configured supply value.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/logic/ConflictEngine.ts`

**Function**: `calculateUpgradeCost`

**Specific Changes**:
1. **Fix the formula**: Change `return 50 * currentStatValue;` to `return 50 + (5 * currentStatValue);`. This produces a base cost of 50 at level 0 and increases by 5 per level (level 0 → 50, level 1 → 55, level 10 → 100, level 50 → 300).

---

**File**: `server/rooms/GameRoom.ts`

**Function**: `mineGear` message handler

**Specific Changes**:
2. **Add ownership guard**: Change the condition `if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;` to `if (tile.ownerId !== leader.id) return;`. This rejects mining on unclaimed tiles (`ownerId === ""`), requiring the player to own the tile before mining. This eliminates the double-deduction exploit because `claimTile` and `mineGear` can no longer both succeed on the same unclaimed tile.

---

**File**: `server/rooms/GameRoom.ts`

**Function**: `gameTick()` — gear spawning section

**Specific Changes**:
3. **Convert ArraySchema to plain array**: Replace `this.state.tiles.toArray()` with `[...this.state.tiles]` (spread into a plain array) or `Array.from(this.state.tiles)`. This ensures `spawnNewGears` receives a standard JavaScript array with proper index-based access.
4. **Pass active player count**: Replace the hardcoded `1` with the count of non-absorbed players. Calculate as: `const activePlayers = Array.from(this.state.players.values()).filter(p => !p.absorbed).length;` and pass `activePlayers` as the second argument to `spawnNewGears`.

---

**File**: `server/rooms/GameRoom.ts`

**Function**: `gameTick()` — AI player mine logic

**Specific Changes**:
5. **Align AI mining with new ownership guard**: The AI mine logic in `gameTick()` currently mines unclaimed adjacent gear tiles (`if (t.ownerId !== "" && t.ownerId !== leader.id) continue;`). After the fix, AI should also only mine tiles they own: change to `if (t.ownerId !== leader.id) continue;`. This keeps AI behavior consistent with the human player fix.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that exercise the three buggy code paths on the UNFIXED code to observe failures and confirm root causes.

**Test Cases**:
1. **Upgrade Cost at Level 0**: Call `calculateUpgradeCost(0)` and assert it returns 50. Will fail on unfixed code (returns 0).
2. **Upgrade Cost at Level 10**: Call `calculateUpgradeCost(10)` and assert it returns 100. Will fail on unfixed code (returns 500).
3. **mineGear on Unclaimed Tile**: Simulate a `mineGear` call on an unclaimed gear tile and assert resources are unchanged. Will fail on unfixed code (resources increase).
4. **Gear Spawning with ArraySchema-like Object**: Call `spawnNewGears` with a proxy/schema-like object and verify it returns valid indices. May fail on unfixed code depending on ArraySchema behavior.

**Expected Counterexamples**:
- `calculateUpgradeCost(0)` returns 0 instead of 50
- `calculateUpgradeCost(10)` returns 500 instead of 100
- `mineGear` on unclaimed tile succeeds and adds resources
- Possible causes: wrong formula operator, missing ownership guard, ArraySchema incompatibility

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL statValue IN [0..50] DO
  result := calculateUpgradeCost_fixed(statValue)
  ASSERT result == 50 + (5 * statValue)
END FOR

FOR ALL tile WHERE tile.ownerId == "" AND tile.hasGear AND tile.gearScrap > 0 DO
  resourcesBefore := player.resources
  mineGear_fixed(player, tile)
  ASSERT player.resources == resourcesBefore  // mining rejected
END FOR

FOR ALL tileArray WHERE tileArray IS plain Array AND hasCandidates(tileArray) DO
  result := spawnNewGears(tileArray, activePlayerCount)
  ASSERT result.length > 0
  FOR EACH idx IN result DO
    ASSERT tileArray[idx].ownerId == "" AND NOT tileArray[idx].isSpawn AND NOT tileArray[idx].hasGear
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL statValue IN [1..50] DO
  // Both old and new formulas produce positive values; verify new formula properties
  ASSERT calculateUpgradeCost_fixed(statValue) > 0
  ASSERT calculateUpgradeCost_fixed(statValue) >= 50
  ASSERT calculateUpgradeCost_fixed(statValue) is strictly increasing
END FOR

FOR ALL tile WHERE tile.ownerId == leader.id AND tile.hasGear AND tile.gearScrap > 0 DO
  // Mining owned tiles should work identically
  result_fixed := mineGear_fixed(player, tile)
  ASSERT result_fixed extracts scrap normally
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for owned-tile mining and non-zero upgrade costs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Owned Tile Mining Preservation**: Verify that mining a tile the player already owns continues to extract scrap correctly after the fix
2. **Upgrade Cost Positivity Preservation**: Verify that upgrade costs are always positive (>= 50) for all stat values 0–50
3. **Upgrade Cost Monotonicity Preservation**: Verify that upgrade costs are strictly increasing as stat values increase
4. **Gear Spawning Candidate Selection Preservation**: Verify that `spawnNewGears` continues to select only valid candidates (unclaimed, non-spawn, no existing gear)

### Unit Tests

- Test `calculateUpgradeCost` with specific values: 0 → 50, 1 → 55, 10 → 100, 50 → 300
- Test `mineGear` handler rejects unclaimed tiles (resources unchanged)
- Test `mineGear` handler accepts owned tiles (resources increase)
- Test gear spawning with a plain array produces valid indices
- Test gear spawning with active player count > 1 produces multiple gears

### Property-Based Tests

- Generate random stat values (0–50) and verify `calculateUpgradeCost` returns `50 + (5 * statValue)` (fix checking)
- Generate random stat value pairs `a < b` and verify `calculateUpgradeCost(a) < calculateUpgradeCost(b)` (preservation — monotonicity)
- Generate random tile grids and verify `spawnNewGears` returns valid indices pointing to candidate tiles (preservation — spawn correctness)
- Generate random player/tile states and verify `mineGear` rejects unclaimed tiles but accepts owned tiles (fix + preservation)

### Integration Tests

- Test full game tick with gear spawning after countdown expires — verify gears appear on the grid
- Test click on unclaimed gear tile — verify only claim cost is deducted, no scrap extracted
- Test click on owned gear tile — verify scrap is extracted normally
- Test upgrade flow from level 0 — verify 50 resources are deducted (not 0)
- Test AI player behavior with corrected upgrade costs and mining restrictions
