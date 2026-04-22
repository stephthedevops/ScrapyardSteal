# Implementation Plan: v0.5 Server Config, AI & Hints

## Overview

Incremental implementation of 11 tickets for the v0.5 release of Scrapyard Steal. Tasks are ordered to build foundational server logic first (schema changes, pure functions), then wire up message handlers, then layer client UI on top. Each task builds on the previous and ends with integration wiring. All code is TypeScript targeting the existing Colyseus 0.15 + Phaser 3 + Vite stack.

## Tasks

- [x] 1. Extend GameState and Player schemas with new fields
  - Add `matchFormat: string = "single"`, `roundNumber: number = 1`, `seriesScoresJSON: string = "{}"` to `GameState` in `server/state/GameState.ts`
  - Add `isAI: boolean = false` to `Player` in `server/state/GameState.ts`
  - Ensure all new fields have `@type` decorators for Colyseus schema sync
  - _Requirements: 6.4, 7.5_

- [x] 2. Implement name sanitization and gear respawn pure functions
  - [x] 2.1 Create `sanitizeName()` in a new `server/logic/sanitize.ts` file
    - Strip all characters outside printable ASCII range (0x20–0x7E)
    - Trim leading/trailing whitespace
    - Return the sanitized string
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Write property test for name sanitization output
    - **Property 2: Name sanitization output**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 2.3 Write property test for empty name rejection
    - **Property 3: Empty name rejection**
    - **Validates: Requirements 2.3**

  - [x] 2.4 Write property test for sanitization-aware duplicate detection
    - **Property 4: Sanitization-aware duplicate detection**
    - **Validates: Requirements 2.4**

  - [x] 2.5 Create `spawnNewGears()` pure function in `server/logic/GridManager.ts`
    - Accept tiles array, active player count; return indices of tiles to convert to gears
    - Pick random unclaimed non-spawn tiles, set `hasGear = true`, `gearScrap = 50`
    - Count = number of active players; skip if no valid tiles available
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 2.6 Write property test for gear spawn correctness
    - **Property 1: Gear spawn correctness**
    - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 3. Implement HOUSEHOLD_ROID noun pool and AI name generation
  - [x] 3.1 Add `HOUSEHOLD_ROID` array (30+ entries) and `generateAIName()` to `src/utils/nameGenerator.ts`
    - Each entry ends with "roid" suffix (e.g., "Fridgeroid", "Toasteroid")
    - `generateAIName()` draws adjectives from existing `ADJECTIVES` pool, nouns from `HOUSEHOLD_ROID`
    - Respects taken adjective/noun sets to avoid duplicates
    - _Requirements: 7.7, 7.8, 7.9_

  - [x] 3.2 Write property test for HOUSEHOLD_ROID pool validity
    - **Property 9: HOUSEHOLD_ROID pool validity**
    - **Validates: Requirements 7.7**

  - [x] 3.3 Write property test for AI player creation correctness
    - **Property 8: AI player creation correctness**
    - **Validates: Requirements 7.5, 7.8**

  - [x] 3.4 Write property test for AI and human name uniqueness
    - **Property 10: AI and human name uniqueness**
    - **Validates: Requirements 7.9**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire server message handlers for config, AI, and name sanitization
  - [x] 5.1 Add `setConfig` message handler to `server/rooms/GameRoom.ts`
    - Validate host-only, phase === "waiting"
    - Accept `timeLimit` (120, 300, 420, 600) and `matchFormat` ("single", "bo3", "bo5")
    - Update `GameState.timeRemaining` and `GameState.matchFormat` accordingly
    - Ignore messages from non-host players
    - _Requirements: 5.6, 5.7, 6.4_

  - [x] 5.2 Write property test for config value validation
    - **Property 5: Config value validation**
    - **Validates: Requirements 5.6, 6.4**

  - [x] 5.3 Write property test for config authorization
    - **Property 6: Config authorization**
    - **Validates: Requirements 5.7**

  - [x] 5.4 Add `addAI` and `removeAI` message handlers to `server/rooms/GameRoom.ts`
    - `addAI`: host-only, max 4 AI, validate color from allowed palette, generate AI name via `generateAIName()`, create Player with `isAI = true`
    - `removeAI`: host-only, validate target is AI, delete from players map
    - _Requirements: 7.1, 7.4, 7.5, 7.9, 7.10_

  - [x] 5.5 Write property test for AI removal frees color
    - **Property 11: AI removal frees color**
    - **Validates: Requirements 7.10**

  - [x] 5.6 Integrate `sanitizeName()` into the existing `setName` handler in `server/rooms/GameRoom.ts`
    - Call `sanitizeName()` on both `adj` and `noun` before the duplicate check
    - Reject with `nameRejected` if either is empty after sanitization
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.7 Add gear respawn logic to `gameTick()` in `server/rooms/GameRoom.ts`
    - Add private `gearRespawnCountdown: number = -1` field
    - Each tick: check for unclaimed gear tiles; if none, start 20s countdown; at 0, call `spawnNewGears()`
    - Reset countdown to -1 after spawning or if spawn is skipped
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 6. Implement match format series logic on the server
  - [x] 6.1 Add series tracking to `GameRoom`
    - Private `seriesScores: Map<string, number>` for win counts
    - On round end: record winner, increment score, check win threshold (2 for bo3, 3 for bo5)
    - If threshold not met: schedule `resetForNextRound()` after 5s delay
    - If threshold met: set phase to "ended", broadcast series winner and per-round scores
    - Update `seriesScoresJSON` on GameState for client sync
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 6.2 Implement `resetForNextRound()` in `GameRoom`
    - Re-initialize grid, reassign starting positions, reset player stats, set phase to "active"
    - Increment `roundNumber`
    - _Requirements: 6.6_

  - [x] 6.3 Write property test for series completion logic
    - **Property 7: Series completion logic**
    - **Validates: Requirements 6.5, 6.7**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add NetworkManager send methods for new messages
  - Add `sendSetConfig(config: { timeLimit?: number; matchFormat?: string })` to `src/network/NetworkManager.ts`
  - Add `sendAddAI(color: number)` to `src/network/NetworkManager.ts`
  - Add `sendRemoveAI(aiPlayerId: string)` to `src/network/NetworkManager.ts`
  - _Requirements: 5.5, 7.4_

- [x] 9. Implement LobbyScene UI additions
  - [x] 9.1 Add "⚙ CONFIG" button visible only to host in `src/scenes/LobbyScene.ts`
    - Show next to START button when local player is host and phase is "waiting"
    - On click, open config panel overlay
    - _Requirements: 5.1, 5.2_

  - [x] 9.2 Implement Server Config Panel overlay in `src/scenes/LobbyScene.ts`
    - Dark background overlay (0x000000, 0.7 alpha), centered panel box
    - Time limit selector: buttons for 2, 5, 7, 10 minutes; highlight selected; default 5 min
    - Match format selector: buttons for Single Match, Best of 3, Best of 5; default Single
    - AI Players section: "+" / "−" buttons, max 4, color picker per AI, 🤖 icon per entry
    - "DONE" button to dismiss overlay
    - Send `setConfig` on time/format change, `addAI`/`removeAI` on AI changes
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.8, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [x] 9.3 Add "BACK" button to LobbyScene
    - Visible to all players (host and non-host), positioned at bottom of lobby
    - On click: disconnect from room, transition to MenuScene
    - Server handles host migration via existing `onLeave` logic
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.4 Add "reroll" label next to ♻ button in `src/scenes/LobbyScene.ts`
    - Non-interactive text, 11px font, AMBER color, positioned to the right of ♻
    - _Requirements: 10.1, 10.2_

  - [x] 9.5 Display AI players with 🤖 prefix in lobby player list
    - In the state change callback, prefix AI player names with "🤖 " in the display string
    - _Requirements: 7.6_

  - [x] 9.6 Implement connection error popup in `src/scenes/LobbyScene.ts`
    - Replace plain status text with styled error popup overlay on connection failure
    - Show "Connection failed" + error reason; styled with dark overlay, centered box, AMBER/GOLD text
    - "BACK TO MENU" button for immediate return
    - Auto-transition to MenuScene after 5 seconds
    - Listen for `room.onLeave` for mid-lobby disconnects: show "Disconnected from server" popup
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 10. Implement in-game UI additions
  - [x] 10.1 Add `playMineFlash()` method to `src/rendering/GridRenderer.ts`
    - Gold flash (0xffd700, 0.6 opacity), scale to 1.3×, fade to 0 alpha over 300ms
    - Consistent with existing `playClaimAnimation` style
    - _Requirements: 4.1, 4.2_

  - [x] 10.2 Trigger mine flash in `GameScene.handleTileClick()`
    - Call `playMineFlash()` immediately on gear tile click, before sending network message
    - Optimistic feedback — no corrective animation on server rejection
    - _Requirements: 4.3, 4.4_

  - [x] 10.3 Add 💡 hint button and popup to `src/scenes/GameScene.ts`
    - Button in lower-left corner, above identity text, depth 100
    - Popup: dark overlay, centered box with controls summary, "✕" close button
    - Game continues rendering behind popup (no pause)
    - Controls: click to claim/mine, arrow keys for direction, same arrow to clear, Escape to clear, upgrade buttons
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.4 Add series score display to HUDManager
    - When `matchFormat !== "single"`, prepend series scores to leaderboard title
    - Format: `"LEADERBOARD [1-0]  4:32"`
    - _Requirements: 6.8_

- [x] 11. Wire lobby disconnect and color picker sync
  - [x] 11.1 Verify color picker updates on disconnect in `LobbyScene`
    - Ensure the existing `onStateChange` callback correctly removes ✕ overlay when a player is removed from state
    - The current implementation rebuilds `takenColors` each state change — verify this path handles disconnect
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 11.2 Write property test for disconnect removes player from lobby
    - **Property 12: Disconnect removes player from lobby**
    - **Validates: Requirements 3.1**

  - [x] 11.3 Write property test for host migration on disconnect
    - **Property 13: Host migration on disconnect**
    - **Validates: Requirements 9.3**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks (including property tests) are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All property tests use fast-check with vitest (minimum 100 iterations)
- Test files: `*.prop.ts` for property tests, `*.test.ts` for unit tests in `tests/` directory
