# Lobby Transition Fix — Bugfix Design

## Overview

Non-host players in the Scrapyard Steal multiplayer lobby sometimes fail to transition from the lobby scene to the game scene when the host starts the game. The current implementation relies on Colyseus's `onStateChange` callback to detect the `phase` change from `"waiting"` to `"active"`, which does not reliably fire for all connected clients. A 500ms polling fallback exists as a workaround, confirming the unreliability.

The fix introduces a dedicated `"gameStarted"` broadcast message from the server immediately after the phase transition. The client listens for this explicit message to trigger the scene transition, replacing the unreliable `onStateChange`-based detection and removing the polling fallback entirely.

## Glossary

- **Bug_Condition (C)**: A non-host client in the lobby whose `onStateChange` callback does not fire when the server sets `phase` to `"active"`, causing the client to remain stuck in the lobby or transition late via polling
- **Property (P)**: When the server broadcasts `"gameStarted"`, every connected client in the lobby SHALL immediately transition to the game scene
- **Preservation**: All existing lobby behaviors — host validation, grid initialization, lobby UI updates via `onStateChange`, color selection, name management, and game loop startup — must remain unchanged
- **GameRoom.startGame()**: The private method in `server/rooms/GameRoom.ts` that initializes the grid, assigns starting positions, sets `phase` to `"active"`, and starts the game loop
- **LobbyScene.setupStateListener()**: The method in `src/scenes/LobbyScene.ts` that registers `onStateChange` and message handlers for the lobby, including the current phase-change detection logic
- **Polling fallback**: The `this.time.addEvent({ delay: 500, loop: true, ... })` timer in `LobbyScene.create()` that checks `room.state.phase` every 500ms as a backup transition mechanism

## Bug Details

### Bug Condition

The bug manifests when a non-host client is connected to a lobby room and the host starts the game. The server sets `state.phase` to `"active"`, but the Colyseus `onStateChange` callback does not reliably fire for all clients. Non-host clients either remain stuck in the lobby or transition late (up to 500ms) via the polling fallback.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type LobbyClient
  OUTPUT: boolean
  
  RETURN input.isHost = false
         AND input.room.state.phase has changed from "waiting" to "active"
         AND input.onStateChangeCallback was NOT invoked for this phase change
END FUNCTION
```

### Examples

- **Non-host misses transition**: Player B joins a lobby hosted by Player A. Player A clicks START. The server sets `phase = "active"`. Player B's `onStateChange` does not fire. Player B remains on the lobby screen until the 500ms polling fallback detects the change.
- **Non-host delayed transition**: Same scenario, but the polling fallback fires after 350ms. Player B transitions to the game scene but misses the first moments of gameplay and sees tiles already claimed.
- **Multiple non-host clients**: Players B, C, and D are in the lobby. Host A starts the game. Player B transitions via `onStateChange` (lucky), Player C transitions via polling after 500ms, Player D's polling also catches it at 500ms. Inconsistent experience across clients.
- **Host always transitions**: Player A (host) clicks START, which calls `sendStartGame()`. The host's `onStateChange` fires reliably because the state mutation originates from the host's own message. Host transitions immediately.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Host validation logic in `GameRoom.startGame` message handler (name uniqueness, empty name checks, `startError` messages) must continue to work exactly as before
- Grid initialization (`initializeGrid`, `assignStartingPositions`, gear placement) in `GameRoom.startGame()` must remain unchanged
- The game loop (`gameTick` via `clock.setInterval`) must start as it does today
- Lobby UI updates via `onStateChange` (player list, color swatches, room code, host/non-host status text) must continue to work during the `"waiting"` phase
- Host client transition to `GameScene` must continue to work correctly
- The `room`, `networkManager`, and `sessionId` data must continue to be passed to `GameScene` on transition
- `nameRejected`, `startError`, and `onLeave` message handlers in `LobbyScene` must remain functional
- Color selection, name rerolling, config panel, AI player management, and public/private toggle must remain unchanged

**Scope:**
All inputs that do NOT involve the lobby-to-game phase transition should be completely unaffected by this fix. This includes:
- All lobby interactions during the `"waiting"` phase (name changes, color picks, config changes)
- All in-game interactions after the transition (tile claims, upgrades, mining, direction setting)
- Host disconnect and host migration logic
- Game end and series round logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Unreliable `onStateChange` delivery**: Colyseus's `onStateChange` callback is designed for incremental state synchronization. When the server mutates `state.phase` inside the `startGame()` method alongside many other state changes (tiles, grid dimensions, player spawn positions), the phase change may be batched or delayed in the state patch sent to non-host clients. The host client is more likely to receive it promptly because the state mutation was triggered by the host's own `"startGame"` message.

2. **No explicit notification mechanism**: The server does not send a dedicated message to clients when the game starts. It relies entirely on state synchronization, which is optimized for eventual consistency rather than guaranteed immediate delivery of specific field changes.

3. **Polling fallback confirms the problem**: The existence of the `time.addEvent({ delay: 500, loop: true })` polling fallback in `LobbyScene.create()` is evidence that the developers already knew `onStateChange` was unreliable for this transition. However, polling introduces up to 500ms of delay and is an inelegant workaround.

4. **Dual transition paths create race conditions**: Both `onStateChange` in `setupStateListener()` and the polling fallback in `create()` can trigger the transition. The `transitioned` flag prevents double-transitions, but the existence of two paths makes the behavior unpredictable and harder to reason about.

## Correctness Properties

Property 1: Bug Condition — Server broadcasts "gameStarted" to all clients on game start

_For any_ valid game start (host triggers `startGame`, validation passes, phase transitions to `"active"`), the server SHALL broadcast a `"gameStarted"` message to all connected clients immediately after setting the phase, ensuring every client receives an explicit notification of the transition.

**Validates: Requirements 2.1, 2.3**

Property 2: Bug Condition — Non-host clients transition on "gameStarted" message

_For any_ non-host client connected to a lobby room that receives a `"gameStarted"` message, the client SHALL immediately transition from the lobby scene to the game scene, passing `room`, `networkManager`, and `sessionId` to `GameScene`.

**Validates: Requirements 2.2, 2.3**

Property 3: Preservation — Host validation unchanged

_For any_ lobby state where the host attempts to start the game with invalid player names (empty or duplicate), the server SHALL continue to reject the start and send a `"startError"` message, exactly as the original code does.

**Validates: Requirements 3.1**

Property 4: Preservation — Game initialization unchanged

_For any_ valid game start, the server SHALL continue to initialize the grid, assign starting positions, place gears, and start the game loop identically to the original code. The only addition is the `"gameStarted"` broadcast after the existing `startGame()` logic.

**Validates: Requirements 3.2**

Property 5: Preservation — Lobby UI updates unchanged

_For any_ state change during the `"waiting"` phase, the lobby scene SHALL continue to update the player list, color swatches, room code, and status text via `onStateChange`, exactly as the original code does.

**Validates: Requirements 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/rooms/GameRoom.ts`

**Function**: `startGame()`

**Specific Changes**:
1. **Add broadcast after phase change**: After `this.state.phase = "active"` is set and the game loop is started, add `this.broadcast("gameStarted")` to explicitly notify all connected clients that the game has started. This is a single line addition at the end of the `startGame()` method, after the `console.log` statement.

**File**: `src/scenes/LobbyScene.ts`

**Function**: `setupStateListener()`

**Specific Changes**:
2. **Add "gameStarted" message handler**: Register a `this.room.onMessage("gameStarted", ...)` handler that sets `this.transitioned = true` and calls `this.scene.start("GameScene", { room, networkManager, sessionId })`. This handler should be registered alongside the existing `"nameRejected"` and `"startError"` handlers.

3. **Remove phase check from onStateChange**: Remove the `if (state.phase === "active")` block from the `onStateChange` callback in `setupStateListener()`. The transition is now handled by the dedicated message handler, so the `onStateChange` callback should only handle lobby UI updates during the `"waiting"` phase.

**Function**: `create()`

**Specific Changes**:
4. **Remove polling fallback**: Remove the `this.time.addEvent({ delay: 500, loop: true, ... })` block that polls `room.state.phase` every 500ms. This fallback is no longer needed because the dedicated `"gameStarted"` message provides reliable notification.

5. **Guard retained**: The `this.transitioned` flag should remain as a safety guard to prevent any edge-case double transitions, even though there will now be only one transition path.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the `startGame` flow and verify whether a `"gameStarted"` broadcast is sent. Run these tests on the UNFIXED code to observe failures (no broadcast exists yet) and confirm the root cause.

**Test Cases**:
1. **No broadcast on unfixed code**: Call `startGame()` logic and assert that `broadcast("gameStarted")` is invoked — this will fail on unfixed code because the broadcast does not exist
2. **Polling fallback exists**: Verify that the unfixed `LobbyScene` contains the `time.addEvent` polling fallback — confirms the workaround is present
3. **onStateChange phase check exists**: Verify that the unfixed `LobbyScene.setupStateListener` checks `state.phase === "active"` inside `onStateChange` — confirms the unreliable path

**Expected Counterexamples**:
- `startGame()` completes without broadcasting any `"gameStarted"` message
- Non-host clients have no dedicated message handler for game start notification
- Possible causes: missing broadcast call, reliance on state sync only

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := lobbyTransition_fixed(input)
  ASSERT result.transitioned = true
    AND result.trigger = "gameStarted message"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT startGame_original(input) = startGame_fixed(input)
  // Host validation, grid init, game loop, lobby UI all unchanged
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many lobby configurations (varying player counts, names, colors) to verify validation logic is unchanged
- It catches edge cases in host validation that manual unit tests might miss
- It provides strong guarantees that the `startGame` initialization sequence is identical except for the added broadcast

**Test Plan**: Observe behavior on UNFIXED code first for host validation and game initialization, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Host validation preservation**: Generate random lobby states with invalid names and verify `startGame` still rejects them with `startError`
2. **Grid initialization preservation**: Verify that for any valid player count, the grid size, tile count, and spawn positions are computed identically
3. **Game loop preservation**: Verify that the game loop interval is started after `startGame` completes
4. **Lobby UI preservation**: Verify that `onStateChange` still updates player list, colors, and status during `"waiting"` phase

### Unit Tests

- Test that `GameRoom.startGame()` calls `this.broadcast("gameStarted")` after setting phase to `"active"`
- Test that `LobbyScene` registers a `"gameStarted"` message handler
- Test that the `"gameStarted"` handler triggers `scene.start("GameScene", ...)` with correct data
- Test that the polling fallback (`time.addEvent`) is no longer present in `LobbyScene.create()`
- Test that the `onStateChange` callback no longer checks `state.phase === "active"` for transition
- Test edge case: `"gameStarted"` received when `transitioned` is already `true` (no double transition)

### Property-Based Tests

- Generate random lobby configurations (1–20 players, various name/color combinations) and verify that `startGame` validation logic produces identical accept/reject decisions before and after the fix
- Generate random valid lobby states and verify that the `startGame` initialization sequence (grid size, tile count, gear placement count) is identical, with the only addition being the broadcast call
- Generate random non-host client states and verify that receiving `"gameStarted"` always triggers a transition with the correct `room`, `networkManager`, and `sessionId` payload

### Integration Tests

- Test full lobby-to-game flow: host creates room, non-host joins, host starts game, both clients transition to `GameScene`
- Test that multiple non-host clients all receive the `"gameStarted"` broadcast and transition simultaneously
- Test that the transition passes correct data to `GameScene` and the game renders properly after transition
