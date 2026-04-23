# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Missing "gameStarted" Broadcast
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the server never broadcasts `"gameStarted"` and that non-host clients have no dedicated message handler for game start
  - **Scoped PBT Approach**: Scope the property to the concrete bug condition — a valid lobby with 2+ players where the host triggers `startGame`
  - Create `tests/property/lobbyTransition.prop.ts` using fast-check and vitest (matching existing project patterns)
  - Simulate `startGame()` logic: build a players map with 2–8 players (unique names, valid colors), call the `startGame` flow, and assert that `this.broadcast("gameStarted")` is invoked
  - Bug condition from design: `isBugCondition(X) = X.isHost = false AND room.state.phase changed from "waiting" to "active" AND onStateChangeCallback was NOT invoked`
  - Expected behavior from design: server SHALL broadcast `"gameStarted"` to all connected clients immediately after setting phase to `"active"`
  - Use a mock/spy on `broadcast` to verify the call — on UNFIXED code, `broadcast("gameStarted")` is never called, so the test will FAIL
  - Run test on UNFIXED code with `npx vitest run tests/property/lobbyTransition.prop.ts`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists: no `"gameStarted"` broadcast)
  - Document counterexamples found (e.g., "`startGame()` completes, sets phase to 'active', but never calls `broadcast('gameStarted')`")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Host Validation and Game Initialization Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create preservation tests in `tests/property/lobbyTransition.prop.ts` (same file as exploration test)
  - **Observation phase** — run UNFIXED code and observe:
    - Observe: `startGame` with empty player names → rejects with `startError` "All players must have a name"
    - Observe: `startGame` with duplicate adjectives or nouns → rejects with `startError` "Duplicate names detected"
    - Observe: `startGame` with valid players → initializes grid via `calculateGridSize`, `initializeGrid`, `assignStartingPositions`, sets `phase = "active"`, starts game loop
    - Observe: grid size is computed from player count, tiles are initialized, spawn positions are assigned, gears are placed (1 per player)
  - **Property-based tests** capturing observed behavior:
    - Generate random lobby states with 1–8 players using fast-check arbitraries (random name pairs, random valid colors from `ALLOWED_COLORS`)
    - For lobbies with empty names: assert `startGame` rejects and sends `startError` (preservation of requirement 3.1)
    - For lobbies with duplicate name parts: assert `startGame` rejects and sends `startError` (preservation of requirement 3.1)
    - For valid lobbies: assert grid is initialized with correct dimensions from `calculateGridSize(playerCount)`, each player gets a spawn tile, gear count equals player count (preservation of requirement 3.2)
    - Assert game loop interval is started after `startGame` completes (preservation of requirement 3.2)
  - Verify all preservation tests PASS on UNFIXED code with `npx vitest run tests/property/lobbyTransition.prop.ts`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for lobby-to-game transition reliability

  - [x] 3.1 Add `broadcast("gameStarted")` to `GameRoom.startGame()`
    - In `server/rooms/GameRoom.ts`, in the `startGame()` private method
    - Add `this.broadcast("gameStarted");` after the `console.log` statement at the end of `startGame()`
    - This ensures all connected clients receive an explicit notification after phase is set to `"active"` and the game loop is started
    - _Bug_Condition: isBugCondition(X) where X.isHost = false AND phase changed to "active" AND onStateChange not invoked_
    - _Expected_Behavior: server broadcasts "gameStarted" to all clients immediately after phase transition_
    - _Preservation: Grid initialization, game loop start, and all logic before the broadcast remain identical_
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Add `"gameStarted"` message handler in `LobbyScene.setupStateListener()`
    - In `src/scenes/LobbyScene.ts`, in the `setupStateListener()` method
    - Add `this.room.onMessage("gameStarted", () => { ... })` handler alongside existing `"nameRejected"` and `"startError"` handlers
    - Handler body: check `if (this.transitioned) return;`, then set `this.transitioned = true`, then call `this.scene.start("GameScene", { room: this.room, networkManager: this.networkManager, sessionId: this.localSessionId })`
    - _Bug_Condition: non-host client receives "gameStarted" message_
    - _Expected_Behavior: client immediately transitions to GameScene with correct room, networkManager, sessionId data_
    - _Preservation: nameRejected, startError, onLeave handlers remain unchanged_
    - _Requirements: 2.2, 2.3, 3.5_

  - [x] 3.3 Remove phase check from `onStateChange` in `LobbyScene.setupStateListener()`
    - In `src/scenes/LobbyScene.ts`, in the `onStateChange` callback within `setupStateListener()`
    - Remove the `if (state.phase === "active") { this.transitioned = true; this.scene.start("GameScene", ...); return; }` block
    - The `onStateChange` callback should now only handle lobby UI updates (player list, colors, room code, host/non-host status) during the `"waiting"` phase
    - Keep the `if (this.transitioned) return;` guard at the top of `onStateChange`
    - _Preservation: All lobby UI updates via onStateChange remain unchanged — player list, color swatches, room code, host status_
    - _Requirements: 3.3, 3.4_

  - [x] 3.4 Remove 500ms polling fallback from `LobbyScene.create()`
    - In `src/scenes/LobbyScene.ts`, in the `create()` method
    - Remove the `this.time.addEvent({ delay: 500, loop: true, callback: () => { ... } })` block that polls `room.state.phase`
    - The `this.transitioned` flag should remain as a safety guard
    - _Preservation: All other create() logic (UI setup, connection, initial name generation) remains unchanged_
    - _Requirements: 2.2, 2.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Server Broadcasts "gameStarted"
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `broadcast("gameStarted")` is called after `startGame()`
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `npx vitest run tests/property/lobbyTransition.prop.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — server now broadcasts "gameStarted")
    - _Requirements: 2.1, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** — Host Validation and Game Initialization Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npx vitest run tests/property/lobbyTransition.prop.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — validation, grid init, game loop all unchanged)
    - Confirm all preservation tests still pass after fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npx vitest run`
  - Ensure all existing property tests still pass (ConflictEngine, DirectionFilter, GridManager, aiPlayers, gearRespawn, lobbyState, matchFormat, nameGenerator, nameSanitization, serverConfig)
  - Ensure all existing unit tests still pass (ConflictEngine, DirectionFilter, GridManager, nameGenerator, GameState)
  - Ensure the new `lobbyTransition.prop.ts` tests all pass
  - Ask the user if questions arise
