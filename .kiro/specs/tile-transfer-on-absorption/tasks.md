# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Orphaned Tiles After Absorption
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate tiles remain orphaned under the absorbed player's ownerId after absorption, and the absorber's tileCount does not reflect the transferred tiles
  - **Scoped PBT Approach**: Scope the property to the concrete bug condition — a 2-player game state where Player A's attack overpowers Player B's defense, and B loses their last tile via border conflict triggering absorption
  - Create `tests/property/tileTransferAbsorption.prop.ts` using fast-check and vitest (matching existing project patterns in `tests/property/`)
  - Simulate the absorption scenario by constructing a game state with a small grid (4x4 to 6x6), two players with adjacent territories, where Player A's `attack * borderTilesA > Player B's defense * borderTilesB` and B has few enough tiles that the border conflict causes `tileCount` to reach 0
  - Extract and call the absorption logic from `gameTick()` — build a `tileGrid`, call `findBorders()` and `resolveBorder()`, then apply the tile transfer and absorption block
  - Bug condition from design: `isBugCondition(input) = absorbedPlayer.tileCount <= 0 AND absorbedPlayer.absorbed = true AND EXISTS tile IN tiles WHERE tile.ownerId = absorbedPlayerId AND absorber.tileCount does NOT include orphaned tiles`
  - Expected behavior from design: after absorption, `tiles.filter(t => t.ownerId === absorbedPlayer.id).length === 0` AND `absorber.tileCount === preAbsorptionCount + transferredTileCount`
  - Generate random attack/defense stats (A.attack in 5–20, A.defense in 1–10, B.attack in 1–3, B.defense in 1–3) to guarantee A overpowers B
  - Generate random tile layouts where B owns 1–3 tiles adjacent to A's territory so absorption is triggered within one tick
  - Assert: no tiles remain with `ownerId === absorbedPlayer.id` after the absorption block
  - Assert: absorber's `tileCount` equals pre-absorption count plus all of B's former tiles
  - Run test on UNFIXED code with `npx vitest run tests/property/tileTransferAbsorption.prop.ts`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists: tiles remain orphaned under absorbed player's ownerId)
  - Document counterexamples found (e.g., "After absorption, 2 tiles still have ownerId === 'B' instead of being reassigned to 'A'. Absorber tileCount is 5 but should be 7.")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Non-Absorption Border Conflicts and Absorption Side Effects Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create preservation tests in `tests/property/tileTransferAbsorption.prop.ts` (same file as exploration test)
  - **Observation phase** — run UNFIXED code and observe:
    - Observe: border conflict where loser retains at least 1 tile → exactly one tile transfers from loser to winner, no bulk reassignment
    - Observe: stalemate border conflict (equal pressure and defense) → no tiles transfer, null result from `resolveBorder()`
    - Observe: absorption event → `absorbed = true` is set, `floor(0.25 * absorbedPlayer.resources)` bonus scrap awarded, absorbed player's name adjective prepended to absorber's team name, team membership updated (`teamId`, `isTeamLead`, `teamName`)
    - Observe: tile properties (`x`, `y`, `isSpawn`, `hasGear`, `gearScrap`) are unchanged after single-tile border transfer
  - **Property-based tests** capturing observed behavior:
    - **Single tile transfer preservation**: Generate random 2-player border conflicts using fast-check (attack 1–20, defense 1–20, border tile counts 1–5) where the loser retains at least 1 tile after transfer. Assert exactly one tile changes ownership per border resolution. Assert loser's tileCount decreases by 1 and winner's increases by 1. (Preservation of requirement 3.1)
    - **Stalemate preservation**: Generate random equal-stat border conflicts (same attack and defense values, same border tile counts). Assert `resolveBorder()` returns null and no tiles change ownership. (Preservation of requirement 3.1)
    - **Absorption side effects preservation**: Generate absorption scenarios and verify: `absorbed = true` is set on absorbed player, absorber receives `floor(0.25 * absorbedPlayer.resources)` bonus scrap, absorbed player's `nameAdj` is prepended to absorber's `teamName`, absorbed player's `teamId` is set to absorber's id, absorbed player's `isTeamLead` is set to false. (Preservation of requirements 3.2, 3.3, 3.4, 3.5)
    - **Tile property preservation**: Generate tiles with random `isSpawn` (true/false), `hasGear` (true/false), `gearScrap` (0–100) values. After a single-tile border transfer, assert `x`, `y`, `isSpawn`, `hasGear`, `gearScrap` are unchanged — only `ownerId` changes. (Preservation of requirement 3.6)
  - Verify all preservation tests PASS on UNFIXED code with `npx vitest run tests/property/tileTransferAbsorption.prop.ts`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for tile transfer on absorption

  - [x] 3.1 Add tile reassignment loop in the absorption block of `gameTick()`
    - In `server/rooms/GameRoom.ts`, in the `gameTick()` private method
    - Locate the absorption block: `if (fromPlayer && fromPlayer.tileCount <= 0)` inside the border conflict resolution loop
    - Inside the `if (toPlayer)` block, after `toPlayer.resources += Math.floor(0.25 * fromPlayer.resources);` and before the team name prepend logic, add:
    ```typescript
    // Transfer all absorbed player's tiles to the absorber
    this.state.tiles.forEach((tile) => {
      if (tile.ownerId === fromPlayer.id) {
        tile.ownerId = toPlayer.id;
        toPlayer.tileCount += 1;
      }
    });
    ```
    - This loop iterates all tiles, reassigns any tile still owned by the absorbed player to the absorber, and increments the absorber's `tileCount` for each transferred tile
    - No changes to `ConflictEngine.ts`, `GameState.ts`, or any client code
    - _Bug_Condition: isBugCondition(input) where absorbedPlayer.tileCount <= 0 AND EXISTS tile with ownerId = absorbedPlayer.id_
    - _Expected_Behavior: after absorption, tiles.filter(t => t.ownerId === absorbedPlayer.id).length = 0 AND absorber.tileCount includes all transferred tiles_
    - _Preservation: absorbed flag, bonus scrap, team name prepend, team membership updates, AI actions, gear spawning, timer, end-game detection all remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Tiles Reassigned After Absorption
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: after absorption, no tiles remain with the absorbed player's ownerId, and the absorber's tileCount reflects all transferred tiles
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `npx vitest run tests/property/tileTransferAbsorption.prop.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — tiles are now reassigned on absorption)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** — Non-Absorption Border Conflicts and Absorption Side Effects Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npx vitest run tests/property/tileTransferAbsorption.prop.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — single tile transfers, stalemates, absorption side effects, tile properties all unchanged)
    - Confirm all preservation tests still pass after fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npx vitest run`
  - Ensure all existing property tests still pass (ConflictEngine, DirectionFilter, GridManager, aiPlayers, gearRespawn, lobbyState, lobbyTransition, matchFormat, nameGenerator, nameSanitization, serverConfig)
  - Ensure all existing unit tests still pass (ConflictEngine, DirectionFilter, GridManager, nameGenerator, GameState)
  - Ensure the new `tileTransferAbsorption.prop.ts` tests all pass (both bug condition and preservation)
  - Ask the user if questions arise
