# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Gear Economy Bug Exploration
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist
  - **File**: `tests/property/gearEconomyBugCondition.prop.ts`
  - **Scoped PBT Approach**: Scope properties to the concrete failing cases for each bug
  - **Bug 1 — Upgrade Cost Formula**: For all `statValue` in 0–50, assert `calculateUpgradeCost(statValue) === 50 + (5 * statValue)`. At level 0 this should return 50 (not 0), at level 10 should return 100 (not 500). Use `fc.integer({ min: 0, max: 50 })` to generate stat values. The bug condition from design: `isBugCondition({ bugType: "upgradeCost" })` is always true — the formula is wrong for ALL stat values.
  - **Bug 2 — mineGear Rejects Unclaimed Tiles**: Simulate the mineGear logic on tiles where `ownerId === ""` and `hasGear === true` and `gearScrap > 0`. Assert that mining is rejected (player resources unchanged). The current code allows mining unclaimed tiles because the guard `if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;` passes when `ownerId === ""`. Test the guard condition directly: for any unclaimed gear tile, the condition `tile.ownerId !== leader.id` should cause rejection.
  - **Bug 3 — Gear Spawning with Plain Array**: Call `spawnNewGears` with a plain array of valid candidate tiles and `activePlayerCount > 1`. Assert that the result length can be greater than 1. Currently the call site hardcodes `1`, so this tests the call-site bug by verifying the function itself supports multi-spawn (function is correct, call site is wrong). Also verify that spreading `ArraySchema`-like objects into plain arrays produces valid input.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL for upgrade cost (returns wrong values) and mineGear guard (allows unclaimed mining). Gear spawning function test may pass since the function itself is correct — the bug is at the call site.
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Gear Economy Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - **File**: `tests/property/gearEconomyPreservation.prop.ts`
  - **Observe on UNFIXED code first, then write properties:**
  - **Preservation A — Upgrade Cost Monotonicity**: For all pairs `a < b` in 1–50, observe that `calculateUpgradeCost(a) < calculateUpgradeCost(b)` (strictly increasing). This holds on unfixed code (`50*a < 50*b`). Write property: for all `a, b` where `0 <= a < b <= 50`, `calculateUpgradeCost(a) < calculateUpgradeCost(b)`. Use `fc.integer({ min: 0, max: 49 })` for `a` and `fc.integer({ min: 1, max: 50 })` for offset.
  - **Preservation B — Upgrade Cost Positivity for Non-Zero Stats**: For all `statValue` in 1–50, observe that `calculateUpgradeCost(statValue) > 0`. This holds on unfixed code (`50*n > 0` for `n > 0`). Write property asserting positivity.
  - **Preservation C — Mining Owned Gear Tiles Allowed**: For any tile where `ownerId === leader.id` and `hasGear === true` and `gearScrap > 0`, the mineGear guard `tile.ownerId !== "" && tile.ownerId !== leader.id` evaluates to false (mining proceeds). Observe this on unfixed code. Write property: for all owned gear tiles, the guard does NOT reject.
  - **Preservation D — Gear Spawning Candidate Selection**: For any plain array of tiles passed to `spawnNewGears`, all returned indices point to tiles where `ownerId === ""`, `isSpawn === false`, and `hasGear === false`. Observe on unfixed code with `fc.array()` of generated tile objects. Write property asserting all returned indices are valid candidates.
  - **Preservation E — Max Cap Rejection**: For `statValue === 50`, the upgrade handler rejects (cap check). Observe on unfixed code. Write property: upgrade at cap 50 is always rejected regardless of resources.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for gear economy bugs (upgrade cost, mineGear guard, gear spawning, AI mining)

  - [x] 3.1 Fix upgrade cost formula in ConflictEngine.ts
    - In `server/logic/ConflictEngine.ts`, function `calculateUpgradeCost`
    - Change `return 50 * currentStatValue;` to `return 50 + (5 * currentStatValue);`
    - This produces: level 0 → 50, level 1 → 55, level 10 → 100, level 50 → 300
    - Update the JSDoc comment to reflect the new formula: `50 + (5 × currentStatValue)`
    - _Bug_Condition: isBugCondition({ bugType: "upgradeCost" }) — formula is always wrong for all stat values_
    - _Expected_Behavior: calculateUpgradeCost(statValue) === 50 + (5 * statValue) for all statValue 0–50_
    - _Preservation: Monotonicity and positivity must be maintained; max cap at 50 still rejects_
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.4, 3.5_

  - [x] 3.2 Tighten mineGear ownership guard in GameRoom.ts
    - In `server/rooms/GameRoom.ts`, in the `mineGear` message handler
    - Change `if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;` to `if (tile.ownerId !== leader.id) return;`
    - This rejects mining on unclaimed tiles (`ownerId === ""`), requiring prior ownership
    - Eliminates the same-click claim+mine double-deduction exploit
    - _Bug_Condition: isBugCondition({ bugType: "doubleMine" }) — tile.ownerId === "" AND hasGear AND actionType === "mineGear"_
    - _Expected_Behavior: mineGear rejects when tile.ownerId !== leader.id (including unclaimed tiles)_
    - _Preservation: Mining owned gear tiles (tile.ownerId === leader.id) continues to work normally_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.3 Fix gear spawning in gameTick() in GameRoom.ts
    - In `server/rooms/GameRoom.ts`, in the `gameTick()` method, gear spawning section (~line 1197)
    - Replace `spawnNewGears(this.state.tiles.toArray(), 1)` with:
      - Convert ArraySchema to plain array: `[...this.state.tiles]` or `Array.from(this.state.tiles)`
      - Calculate active player count: `const activePlayers = Array.from(this.state.players.values()).filter(p => !p.absorbed).length;`
      - Pass active count: `spawnNewGears([...this.state.tiles], activePlayers)`
    - _Bug_Condition: isBugCondition({ bugType: "spawn" }) — ArraySchema.toArray() incompatibility AND hardcoded 1_
    - _Expected_Behavior: spawnNewGears receives a plain Array and spawns up to activePlayerCount gears per tick_
    - _Preservation: 20-second countdown suppression unchanged; initial gear placement in startGame()/resetForNextRound() unchanged_
    - _Requirements: 1.1, 2.1, 3.1, 3.6_

  - [x] 3.4 Align AI mining with new ownership guard in GameRoom.ts
    - In `server/rooms/GameRoom.ts`, in the `gameTick()` AI player actions section
    - Change `if (t.ownerId !== "" && t.ownerId !== leader.id) continue;` to `if (t.ownerId !== leader.id) continue;`
    - This makes AI mining consistent with the human player mineGear fix — AI can only mine tiles they own
    - _Bug_Condition: Same as Bug 2 — AI could also mine unclaimed tiles_
    - _Expected_Behavior: AI only mines gear tiles owned by their team leader_
    - _Preservation: AI claiming, upgrading, and attacking behavior unchanged_
    - _Requirements: 2.2_

  - [x] 3.5 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Gear Economy Bug Fixes Validated
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all three bugs
    - When these tests pass, it confirms: upgrade cost formula is correct, mineGear rejects unclaimed tiles, gear spawning works with plain arrays
    - Run bug condition exploration tests from step 1: `npx vitest run tests/property/gearEconomyBugCondition.prop.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Gear Economy Preservation Validated
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2: `npx vitest run tests/property/gearEconomyPreservation.prop.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation properties still hold: monotonicity, positivity, owned-tile mining, candidate selection, max cap rejection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest run`
  - Ensure all existing property tests in `tests/property/` still pass (especially `ConflictEngine.prop.ts`, `gearRespawn.prop.ts`, `GridManager.prop.ts`)
  - Ensure all existing unit tests in `tests/unit/` still pass (especially `ConflictEngine.test.ts`, `GridManager.test.ts`)
  - Ensure the new bug condition and preservation tests both pass
  - Ask the user if questions arise
