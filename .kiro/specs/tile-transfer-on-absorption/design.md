# Tile Transfer on Absorption — Bugfix Design

## Overview

When a player is absorbed during a border conflict in Scrapyard Steal (their `tileCount` reaches 0), the absorbing player should inherit all of the absorbed player's tiles. Currently, the absorption block in `GameRoom.gameTick()` marks the player as absorbed, transfers team membership, and awards bonus scrap, but never reassigns the absorbed player's tiles to the absorber. This leaves orphaned tiles still carrying the absorbed player's `ownerId`, breaking territory continuity and causing downstream issues with border detection and tile count accuracy.

The fix adds a tile reassignment loop inside the existing absorption block of `gameTick()`. After `fromPlayer.absorbed = true` is set, the loop iterates over all tiles, transfers any tile with `ownerId === fromPlayer.id` to the absorber, and increments the absorber's `tileCount` accordingly. This is a minimal, targeted change — a single loop insertion — that preserves all existing absorption side effects (bonus scrap, team name, team membership).

## Glossary

- **Bug_Condition (C)**: A player is absorbed (tileCount reaches 0 via border conflict) and their tiles are not reassigned to the absorber, leaving orphaned tiles with the absorbed player's ownerId
- **Property (P)**: When a player is absorbed, all tiles with `ownerId === absorbedPlayer.id` SHALL be reassigned to the absorber's id, and the absorber's `tileCount` SHALL increase by the number of transferred tiles
- **Preservation**: Existing absorption side effects (absorbed flag, bonus scrap, team name prepend, team membership updates) and non-absorption border conflict behavior (single tile transfer per border per tick) must remain unchanged
- **gameTick()**: The private method in `server/rooms/GameRoom.ts` that runs once per second, awarding income, resolving border conflicts, handling absorption, running AI actions, and spawning gears
- **resolveBorder()**: The function in `server/logic/ConflictEngine.ts` that compares border pressure between two players and returns a `TileTransfer` (or null for stalemate)
- **findBorders()**: The function in `server/logic/ConflictEngine.ts` that detects all borders between opposing players on the grid
- **Absorption**: When a player's `tileCount` reaches 0 after losing a border conflict tile, they are marked `absorbed = true` and merged into the absorber's team

## Bug Details

### Bug Condition

The bug manifests when a border conflict causes a player to lose their last tile (`tileCount` reaches 0). The `gameTick()` method correctly detects this condition and runs the absorption block — setting `absorbed = true`, awarding bonus scrap, updating team membership, and prepending the name adjective. However, it never iterates over the grid to reassign tiles that still carry the absorbed player's `ownerId` to the absorber. These orphaned tiles remain on the grid under a "dead" owner.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { gameState: GameState, absorbedPlayerId: string, absorberId: string }
  OUTPUT: boolean
  
  LET absorbedPlayer = gameState.players.get(absorbedPlayerId)
  LET absorber = gameState.players.get(absorberId)
  
  RETURN absorbedPlayer.tileCount <= 0
         AND absorbedPlayer.absorbed = true
         AND EXISTS tile IN gameState.tiles WHERE tile.ownerId = absorbedPlayerId
         AND absorber.tileCount does NOT include the orphaned tiles
END FUNCTION
```

### Examples

- **2-player absorption**: Player A (attack=5, defense=1) borders Player B (attack=1, defense=1) who owns 3 tiles. A wins the border conflict, B loses a tile each tick. When B's tileCount reaches 0, B is absorbed. B's remaining tiles (e.g., 2 tiles with `ownerId = "B"`) are never reassigned to A. A's `tileCount` does not increase by 2. `findBorders()` may still detect borders against B's orphaned tiles.
- **Chain absorption**: Player A absorbs Player B, gaining B's tiles. Player A now borders Player C with a larger territory. If A then absorbs C, C's tiles should also transfer. Without the fix, both B's and C's tiles could be orphaned.
- **Absorption with spawn tile**: Player B owns a spawn tile (`isSpawn = true`). When B is absorbed by A, the spawn tile should transfer to A with `isSpawn` preserved, but currently it remains under B's ownerId.
- **Absorption with gear tile**: Player B owns a tile with `hasGear = true` and `gearScrap = 30`. On absorption, the tile should transfer to A preserving gear properties, but currently it stays orphaned.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single tile transfers from border conflicts (no absorption) must continue to transfer exactly one tile per border per tick
- The `absorbed = true` flag must continue to be set on the absorbed player
- The absorber must continue to receive `floor(0.25 * absorbedPlayer.resources)` as bonus scrap
- Team membership updates (`teamId`, `isTeamLead`, `teamName`) must continue to work as before
- The absorbed player's name adjective must continue to be prepended to the absorber's team name
- Borders involving already-absorbed players must continue to be skipped (`if (playerA.absorbed || playerB.absorbed) continue`)
- AI player actions, gear spawning, timer countdown, and end-game detection must remain unchanged

**Scope:**
All inputs that do NOT involve an absorption event (tileCount reaching 0) should be completely unaffected by this fix. This includes:
- Normal border conflicts where the loser retains at least 1 tile
- Tile claiming, upgrading, mining, and direction setting
- Stalemate border resolutions (no tile transfer)
- Game initialization, round resets, and lobby interactions

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing tile reassignment loop**: The absorption block in `gameTick()` (lines ~330–350 of `GameRoom.ts`) handles team membership, bonus scrap, and name updates, but contains no loop to iterate over `this.state.tiles` and reassign tiles from the absorbed player to the absorber. This is a straightforward omission — the single-tile transfer from `resolveBorder()` is applied (the tile that triggered absorption), but the absorbed player's remaining tiles are never touched.

2. **tileCount not updated for bulk transfer**: The absorption block does not increment `toPlayer.tileCount` by the count of remaining tiles owned by the absorbed player. The only tileCount adjustment is the single `+1` / `-1` from the border conflict transfer itself.

3. **No downstream guard**: `findBorders()` does not filter out tiles owned by absorbed players. It only checks `tile.ownerId === ""` to skip unowned tiles. So orphaned tiles (owned by an absorbed player) still participate in border detection, potentially creating phantom borders.

4. **The fix location is clear**: The tile reassignment loop should be inserted inside the `if (fromPlayer && fromPlayer.tileCount <= 0)` block, after `fromPlayer.absorbed = true` is set and before (or after) the team membership updates. The loop needs to: (a) iterate all tiles, (b) reassign any tile with `ownerId === fromPlayer.id` to `toPlayer.id`, and (c) increment `toPlayer.tileCount` for each reassigned tile.

## Correctness Properties

Property 1: Bug Condition - No orphaned tiles after absorption

_For any_ game state where a player is absorbed (tileCount reaches 0 via border conflict), the fixed `gameTick` function SHALL reassign all tiles with `ownerId === absorbedPlayer.id` to the absorber's id, leaving zero tiles owned by the absorbed player.

**Validates: Requirements 2.1, 2.3**

Property 2: Bug Condition - Absorber tileCount reflects transferred tiles

_For any_ game state where a player is absorbed, the fixed `gameTick` function SHALL increase the absorber's `tileCount` by exactly the number of tiles that were reassigned from the absorbed player, so that `absorber.tileCount` equals the sum of their pre-absorption count plus all transferred tiles.

**Validates: Requirements 2.2**

Property 3: Preservation - Single tile transfer without absorption unchanged

_For any_ border conflict where the losing player retains at least 1 tile after the transfer (no absorption occurs), the fixed `gameTick` function SHALL produce exactly the same result as the original function: one tile transfers from loser to winner, and no additional tiles are reassigned.

**Validates: Requirements 3.1**

Property 4: Preservation - Tile properties preserved on transfer

_For any_ tile reassigned during absorption, the fixed code SHALL preserve the tile's grid position (`x`, `y`), spawn status (`isSpawn`), and gear properties (`hasGear`, `gearScrap`). Only `ownerId` changes.

**Validates: Requirements 3.6**

Property 5: Preservation - Existing absorption side effects unchanged

_For any_ absorption event, the fixed code SHALL continue to set `absorbed = true`, award `floor(0.25 * absorbedPlayer.resources)` bonus scrap, prepend the absorbed player's name adjective to the absorber's team name, and update team membership (`teamId`, `isTeamLead`, `teamName`) identically to the original code.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/rooms/GameRoom.ts`

**Function**: `gameTick()`

**Specific Changes**:
1. **Add tile reassignment loop**: Inside the `if (fromPlayer && fromPlayer.tileCount <= 0)` block, after `fromPlayer.absorbed = true` is set, add a loop that iterates over `this.state.tiles`. For each tile where `tile.ownerId === fromPlayer.id`, set `tile.ownerId = toPlayer.id` and increment `toPlayer.tileCount` by 1. This must happen before the team membership updates (or after — order doesn't matter for correctness since team updates don't depend on tile ownership).

2. **Exact insertion point**: The loop goes inside the existing `if (toPlayer)` block, after the `toPlayer.resources += Math.floor(0.25 * fromPlayer.resources)` line and before the team name prepend logic. The pseudocode:

```
// Transfer all absorbed player's tiles to the absorber
this.state.tiles.forEach((tile) => {
  if (tile.ownerId === fromPlayer.id) {
    tile.ownerId = toPlayer.id;
    toPlayer.tileCount += 1;
  }
});
```

3. **No changes to ConflictEngine**: The `findBorders()` and `resolveBorder()` functions remain unchanged. The fix is entirely within `gameTick()`'s absorption handling.

4. **No changes to GameState schema**: No new fields or schema changes are needed. The fix only modifies runtime behavior within the existing data model.

5. **No changes to client code**: The client already renders tiles based on `ownerId` from the synchronized state. Once the server correctly reassigns tiles, the client will display them under the absorber's color automatically.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the absorption scenario by constructing a game state where a border conflict causes a player's tileCount to reach 0, then check whether tiles are reassigned. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Orphaned tiles after absorption**: Set up a 4x4 grid with Player A and Player B. Configure stats so A wins the border conflict and B's tileCount reaches 0. Assert that no tiles remain with `ownerId === B.id` after the absorption block. (Will fail on unfixed code — tiles remain orphaned.)
2. **Absorber tileCount not updated**: Same setup. Assert that A's `tileCount` includes B's former tiles. (Will fail on unfixed code — A's tileCount only reflects the single border transfer.)
3. **findBorders detects phantom borders**: After absorption on unfixed code, run `findBorders()` and check if any border references the absorbed player. (May fail — orphaned tiles create phantom borders.)

**Expected Counterexamples**:
- After absorption, `tiles.filter(t => t.ownerId === absorbedPlayer.id).length > 0` (orphaned tiles exist)
- `absorber.tileCount` is less than expected (missing bulk transfer)
- Possible cause: missing tile reassignment loop in the absorption block of `gameTick()`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := gameTick_fixed(input)
  ASSERT tiles.filter(t => t.ownerId === absorbedPlayer.id).length = 0
  ASSERT absorber.tileCount = preAbsorptionCount + transferredTileCount
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT gameTick_original(input) = gameTick_fixed(input)
  // Single tile transfers, stalemates, and non-conflict ticks unchanged
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many game state configurations (varying grid sizes, player stats, tile distributions) to verify non-absorption behavior is unchanged
- It catches edge cases like stalemates, zero-attack players, and asymmetric tile counts
- It provides strong guarantees that the fix only affects the absorption path

**Test Plan**: Observe behavior on UNFIXED code first for non-absorption border conflicts, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single tile transfer preservation**: Generate random border conflicts where the loser retains tiles. Verify exactly one tile transfers per border, same as unfixed code.
2. **Stalemate preservation**: Generate random equal-stat border conflicts. Verify no tiles transfer, same as unfixed code.
3. **Absorption side effects preservation**: Verify that `absorbed = true`, bonus scrap, team name prepend, and team membership updates still occur identically after the fix.
4. **Tile property preservation**: Generate tiles with various `isSpawn`, `hasGear`, `gearScrap` values. Verify these properties are unchanged after tile reassignment — only `ownerId` changes.

### Unit Tests

- Test that after absorption, no tiles remain with the absorbed player's `ownerId`
- Test that after absorption, the absorber's `tileCount` equals pre-absorption count plus transferred tiles
- Test that tile properties (`x`, `y`, `isSpawn`, `hasGear`, `gearScrap`) are preserved after transfer
- Test absorption with spawn tiles — spawn tile transfers to absorber with `isSpawn = true`
- Test absorption with gear tiles — gear tile transfers with `hasGear` and `gearScrap` intact
- Test that `absorbed = true` is still set, bonus scrap is still awarded, team name is still updated
- Test edge case: player absorbed with 0 remaining tiles (only the conflict tile) — no extra tiles to transfer

### Property-Based Tests

- Generate random 2-player game states on small grids (3x3 to 6x6) where one player's stats guarantee absorption. Verify that after the absorption block, zero tiles remain with the absorbed player's ownerId and the absorber's tileCount is correct.
- Generate random border conflicts where the loser retains at least 1 tile. Verify that exactly one tile transfers and no bulk reassignment occurs (preservation).
- Generate random tile configurations with mixed `isSpawn` and `hasGear` properties. Trigger absorption and verify all tile properties except `ownerId` are preserved.

### Integration Tests

- Test a full multi-tick game scenario where Player A gradually takes Player B's tiles until absorption, then verify the final state has all tiles under A's ownership
- Test chain absorption: A absorbs B, then A absorbs C. Verify all tiles end up under A's ownership with correct tileCount
- Test that after absorption, `findBorders()` does not detect any borders referencing the absorbed player
