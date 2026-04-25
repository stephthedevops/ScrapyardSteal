# Implementation Plan: Factory Capture Choice

## Overview

Replace the instant-absorption mechanic in `battleTick()` with a two-phase capture flow. When a player loses their last factory, they enter `pendingAbsorption` state and choose to surrender tiles to the captor or drop them as unclaimed. This eliminates three known race conditions (same-tick battles on absorbed players, post-absorption income, double-deduction on same-click). Implementation proceeds server-first (schema → guards → two-phase logic → finalization), then client (network → UI → scene wiring), then factory adjective transfer, and finally tests.

## Tasks

- [x] 1. Add pending absorption fields to Player schema
  - Add `pendingAbsorption: boolean = false` with `@type("boolean")` decorator to `Player` class in `server/state/GameState.ts`
  - Add `captorId: string = ""` with `@type("string")` decorator to `Player` class in `server/state/GameState.ts`
  - _Requirements: 1.1_

- [x] 2. Add state guards to existing server logic
  - [x] 2.1 Add pending/absorbed guards to all action message handlers
    - In `server/rooms/GameRoom.ts`, add early-return checks for `player.pendingAbsorption` in handlers: `claimTile`, `upgradeAttack`, `upgradeDefense`, `upgradeCollection`, `placeDefenseBot`, `placeCollector`, `attackTile`, `mineGear`
    - For handlers that resolve a team leader (claimTile, placeDefenseBot, placeCollector, mineGear), also check `leader.pendingAbsorption`
    - _Requirements: 1.6_

  - [x] 2.2 Add battle guards to `battleTick()`
    - At the start of each battle iteration in `battleTick()`, skip battles where the attacker has `pendingAbsorption = true` or `absorbed = true`
    - Skip battles where the defending tile's owner has `pendingAbsorption = true` or `absorbed = true`
    - Add these checks to the `toRemove` logic so skipped battles are cancelled
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.3 Add income guards to `gameTick()`
    - In the automine/collector income section of `gameTick()`, add `if (player.pendingAbsorption) return;` alongside the existing `if (player.absorbed) return;` check
    - In the AI actions section, skip AI players with `pendingAbsorption = true`
    - _Requirements: 1.5, 8.1, 8.2_

- [x] 3. Implement two-phase capture flow on server
  - [x] 3.1 Add `pendingTimers` map and `enterPendingAbsorption` method
    - Add `private pendingTimers: Map<string, ReturnType<typeof this.clock.setTimeout>> = new Map()` field to `GameRoom`
    - Implement `enterPendingAbsorption(defenderId: string, captorId: string)` that:
      - Sets `defender.pendingAbsorption = true`, `defender.captorId = captorId`, `defender.isTeamLead = false`
      - Cancels all active battles where `attackerId === defenderId`
      - For AI defenders: schedules `clock.setTimeout(() => resolveCapture(defenderId, "surrender"), 2000)`
      - For human defenders: sends `captureChoice` message to defender's client with `{ captorTeamName, timeoutSeconds: 10 }`; schedules 10s timeout calling `resolveCapture(defenderId, "drop")`
      - Stores timeout reference in `pendingTimers`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 6.1_

  - [x] 3.2 Implement `resolveCapture` method
    - Implement `resolveCapture(pendingPlayerId: string, choice: "surrender" | "drop")` that:
      - Clears the pending timer from `pendingTimers`
      - If choice is `"surrender"`: transfers all tiles to captor (`tile.ownerId = captorId`), updates captor's `tileCount += pending.tileCount`, sets pending `tileCount = 0`
      - If choice is `"drop"`: sets all pending player's tiles to unclaimed (`tile.ownerId = ""`), sets pending `tileCount = 0`
      - Awards captor `Math.floor(0.25 * pendingPlayer.resources)` bonus scrap
      - Calls `finalizeAbsorption(pendingPlayerId, captorId)`
      - Sends `captureResolved` message to the pending player's client with `{ result: choice }` (or `"timeout"` if from timeout)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 11.3_

  - [x] 3.3 Implement `finalizeAbsorption` method
    - Implement `finalizeAbsorption(pendingPlayerId: string, captorId: string)` that:
      - Sets `pendingPlayer.absorbed = true`, `pendingPlayer.pendingAbsorption = false`
      - Sets `pendingPlayer.teamId = captorId`
      - Prepends `pendingPlayer.nameAdj` to captor's `teamName`
      - Updates `teamName` for all players on the captor's team
      - Removes defense bots and collectors from tiles no longer owned by the absorbed player (clears `defenseBotsJSON` and `collectorsJSON`)
      - Cancels any remaining battles involving the pending player
      - Broadcasts `"team absorbed [adjective noun]"` notification
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.4 Replace inline absorption in `battleTick()` with `enterPendingAbsorption` call
    - In `battleTick()`, replace the existing block that sets `defender.absorbed = true`, awards bonus scrap, clears tiles, prepends adjective, moves to team, and cancels battles — with a single call to `enterPendingAbsorption(defenderId, battle.attackerId)`
    - Keep the tile-fall logic (setting `tile.ownerId = ""`, decrementing `defender.tileCount`) but remove the absorption block
    - _Requirements: 1.1_

  - [x] 3.5 Add `captureResponse` message handler
    - Register `this.onMessage("captureResponse", ...)` in `onCreate()`
    - Validate: player exists, `player.pendingAbsorption === true`, `data.choice` is `"surrender"` or `"drop"`
    - Call `resolveCapture(client.sessionId, data.choice)`
    - Ignore messages from non-pending players or with invalid choice values
    - _Requirements: 3.1, 4.1, 11.1, 11.2_

  - [x] 3.6 Handle captor disconnect during pending state
    - In `onLeave()`, check if the leaving player is a captor for any pending player (check `pendingTimers` or iterate players with `captorId === client.sessionId`)
    - If so, resolve those pending players as `"drop"`
    - _Requirements: Error handling — captor disconnect_

- [x] 4. Checkpoint — Ensure server-side logic compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement client-side network and UI changes
  - [x] 5.1 Add `sendCaptureResponse` method to `NetworkManager`
    - Add `sendCaptureResponse(choice: "surrender" | "drop"): void` method to `src/network/NetworkManager.ts`
    - Implementation: `this.room?.send("captureResponse", { choice })`
    - _Requirements: 11.1, 11.2_

  - [x] 5.2 Add capture choice modal to `HUDManager`
    - Add `showCaptureChoice(captorTeamName: string, timeoutSeconds: number, onChoice: (choice: "surrender" | "drop") => void): void` method
    - Create full-screen overlay (depth 300) with dark semi-transparent background
    - Add title "YOUR FACTORY HAS FALLEN", captor name display, two buttons ("⚔ Surrender Tiles" and "💀 Drop Tiles"), and countdown timer text
    - Countdown timer updates every second using `scene.time.addEvent` with repeat
    - Button clicks invoke `onChoice` callback and dismiss the dialog
    - Add `dismissCaptureChoice(): void` method that destroys all modal elements (idempotent)
    - Add `isCaptureChoiceVisible(): boolean` getter for input blocking
    - _Requirements: 2.2, 2.3, 6.3, 11.1, 11.2, 11.4_

  - [x] 5.3 Wire capture messages in `GameScene`
    - In `setupStateListener()`, add listeners for:
      - `captureChoice` → call `hudManager.showCaptureChoice()` with callback that calls `networkManager.sendCaptureResponse()`
      - `captureResolved` → call `hudManager.dismissCaptureChoice()`
      - `factoryCaptured` → call `hudManager.showNotification()` with the broadcast message
    - In `handleTileClick()`, add early return if `hudManager.isCaptureChoiceVisible()` to block game input during choice
    - Guard all three listeners with `if (this.gameEnded) return;` check
    - _Requirements: 2.2, 2.3, 10.2, 11.3, 11.4_

- [x] 6. Implement factory adjective transfer and broadcast
  - [x] 6.1 Add adjective transfer logic to `claimTile` handler
    - In the `claimTile` message handler, after a successful claim, check if the claimed tile `isSpawn`
    - If so, look up the original owner by matching `spawnX`/`spawnY` across all players
    - If the original owner is absorbed and their adjective is on another team's name, remove it from that team and update all team members' `teamName`
    - Prepend the original owner's `nameAdj` to the claiming player's (leader's) `teamName` and update all team members
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.2 Add factory capture broadcast
    - After adjective transfer in `claimTile`, broadcast a `factoryCaptured` message to all clients: `{ claimingTeamName, factoryAdj }`
    - Message format: `"{claiming team name} claimed the {original adjective} Factory"`
    - _Requirements: 10.1, 10.2_

- [x] 7. Checkpoint — Ensure full build compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write property-based tests for capture choice logic
  - [x] 8.1 Write property test: entering pending absorption sets correct state
    - **Property 1: Entering pending absorption sets correct state and cancels battles**
    - Generate random player state and active battles; call `enterPendingAbsorption`; assert `pendingAbsorption = true`, `captorId` set, `isTeamLead = false`, attacker battles cancelled
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 8.2 Write property test: battles involving pending/absorbed players are skipped
    - **Property 2: Battles involving pending or absorbed players are skipped**
    - Generate random battle sets with some pending/absorbed players; assert those battles are filtered out
    - **Validates: Requirements 1.4, 7.1, 7.2, 7.3**

  - [x] 8.3 Write property test: pending and absorbed players receive no income
    - **Property 3: Pending and absorbed players receive no income**
    - Generate random player with `pendingAbsorption = true` or `absorbed = true`; process income; assert `resources` unchanged
    - **Validates: Requirements 1.5, 8.1, 8.2**

  - [x] 8.4 Write property test: pending players cannot perform actions
    - **Property 4: Pending players cannot perform any game actions**
    - Generate random pending player and any action; assert game state unchanged after action attempt
    - **Validates: Requirements 1.6**

  - [x] 8.5 Write property test: surrender transfers all tiles correctly
    - **Property 5: Surrender transfers all tiles to captor with correct counts**
    - Generate random pending player with N tiles and captor with M tiles; resolve as surrender; assert captor has M+N tiles, pending has 0
    - **Validates: Requirements 3.1, 3.2**

  - [x] 8.6 Write property test: drop sets all tiles to unclaimed
    - **Property 6: Drop sets all tiles to unclaimed with correct counts**
    - Generate random pending player with N tiles; resolve as drop; assert all N tiles have `ownerId = ""`, pending `tileCount = 0`
    - **Validates: Requirements 4.1, 4.2**

  - [x] 8.7 Write property test: captor receives 25% bonus scrap
    - **Property 7: Captor receives 25% bonus scrap on either choice**
    - Generate random resources R and choice; assert captor receives exactly `Math.floor(0.25 * R)` bonus
    - **Validates: Requirements 3.3, 4.3**

  - [x] 8.8 Write property test: finalization sets correct state
    - **Property 8: Finalization sets correct absorption state and team membership**
    - Generate random resolved capture; assert `absorbed = true`, `pendingAbsorption = false`, `teamId = captorId`
    - **Validates: Requirements 5.1, 5.2**

  - [x] 8.9 Write property test: finalization propagates team name
    - **Property 9: Finalization prepends adjective and propagates team name**
    - Generate random adjective A and team name T; assert captor's team name is `"A T"` and all team members match
    - **Validates: Requirements 5.3, 5.4**

  - [x] 8.10 Write property test: finalization cleans up bots and collectors
    - **Property 10: Finalization removes bots and collectors from transferred tiles**
    - Generate random absorbed player with bots/collectors; assert `defenseBotsJSON` and `collectorsJSON` contain no entries for tiles no longer owned
    - **Validates: Requirements 5.6**

- [x] 9. Write unit tests for capture choice logic
  - [x] 9.1 Write unit tests for surrender and drop flows
    - Test concrete surrender scenario: 5 tiles transfer to captor, tile counts update, bonus scrap awarded
    - Test concrete drop scenario: 5 tiles become unclaimed, tile counts update, bonus scrap awarded
    - Test 0-tile edge case: player with no tiles enters pending, resolves cleanly
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

  - [x] 9.2 Write unit tests for AI auto-surrender and timeout
    - Test AI player auto-surrenders after 2s delay
    - Test human player timeout auto-resolves as "drop" after 10s
    - Test double `captureResponse` is ignored (second message no-op)
    - _Requirements: 2.4, 6.1, 6.2_

  - [x] 9.3 Write unit tests for captor disconnect and edge cases
    - Test captor disconnect resolves pending player as "drop"
    - Test `captureResponse` from non-pending player is ignored
    - Test `captureResponse` with invalid choice value is ignored
    - Test multiple players entering pending state in same battle tick
    - _Requirements: Error handling_

  - [x] 9.4 Write unit tests for factory adjective transfer
    - Test claiming unclaimed spawn tile transfers adjective to claiming team
    - Test adjective removal from previous team when factory changes hands
    - Test team name propagation to all team members on both teams
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.5 Write unit tests for factory capture broadcast
    - Test broadcast message format: `"{team name} claimed the {adjective} Factory"`
    - Test client receives `factoryCaptured` message and displays notification
    - _Requirements: 10.1, 10.2_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after server-side and client-side phases
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and error handling
- The server is implemented first so that client changes can be tested against working server logic
- The existing inline absorption block in `battleTick()` (lines ~1050-1090 of GameRoom.ts) is the primary code being replaced
