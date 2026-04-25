# Implementation Plan: Economy Rebalance

## Overview

This plan implements three coordinated economy changes: (1) percentage-based upgrade cost scaling, (2) passive factory scrap income, and (3) configurable gear scrap supply. Changes span the server-side formula, game tick loop, config handling, state schema, client-side utility, HUD display, and lobby config panel. Each task builds incrementally so the system stays functional at every step.

## Tasks

- [ ] 1. Update upgrade cost formula and add client-side utility
  - [ ] 1.1 Update `calculateUpgradeCost` in `server/logic/ConflictEngine.ts`
    - Change the formula from `50 * currentStatValue` to `Math.floor(50 * Math.pow(1.10, currentStatValue))`
    - Update the JSDoc comment to reflect the new formula
    - The function signature remains unchanged — all existing call sites continue to work
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 1.2 Create `src/utils/economyUtils.ts` with client-side `calculateUpgradeCost`
    - Create a new file `src/utils/economyUtils.ts`
    - Export a `calculateUpgradeCost(currentStatValue: number): number` function mirroring the server formula exactly: `Math.floor(50 * Math.pow(1.10, currentStatValue))`
    - Add a JSDoc comment noting it must stay in sync with `server/logic/ConflictEngine.ts`
    - _Requirements: 4.1, 4.3_

  - [ ] 1.3 Write property test: formula correctness (Property 1)
    - **Property 1: Upgrade cost formula correctness**
    - Create `tests/property/economyRebalance.prop.ts`
    - Using `fast-check`, generate random stat levels (1–50) and verify `calculateUpgradeCost(level) === Math.floor(50 * Math.pow(1.10, level))` and result is a non-negative integer
    - **Validates: Requirements 1.1, 1.5**

  - [ ] 1.4 Write property test: monotonicity (Property 2)
    - **Property 2: Upgrade cost is monotonically increasing**
    - In `tests/property/economyRebalance.prop.ts`, generate pairs `(a, b)` where `1 <= a < b <= 50` and verify `calculateUpgradeCost(a) < calculateUpgradeCost(b)`
    - **Validates: Requirements 1.1**

  - [ ] 1.5 Write property test: client-server consistency (Property 5)
    - **Property 5: Client-server upgrade cost consistency**
    - In `tests/property/economyRebalance.prop.ts`, import both client (`src/utils/economyUtils.ts`) and server (`server/logic/ConflictEngine.ts`) `calculateUpgradeCost` functions
    - Generate random stat levels (1–50) and verify both return identical values
    - **Validates: Requirements 4.1, 4.3**

  - [ ] 1.6 Write unit tests for specific upgrade cost values
    - Extend `tests/unit/logic/ConflictEngine.test.ts`
    - Test `calculateUpgradeCost(1)` returns 55 (Requirement 1.2)
    - Test `calculateUpgradeCost(2)` returns 60 (Requirement 1.3)
    - Test `calculateUpgradeCost(10)` returns 129 (Requirement 1.4)
    - Test result is always a non-negative integer for levels 1–50
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Add `gearScrapSupply` to GameState and wire server config
  - [ ] 3.1 Add `gearScrapSupply` field to `GameState` in `server/state/GameState.ts`
    - Add `@type("number") gearScrapSupply: number = 1000;` to the `GameState` class
    - _Requirements: 3.3, 3.5_

  - [ ] 3.2 Update `setConfig` handler in `server/rooms/GameRoom.ts` to accept `gearScrapSupply`
    - Extend the `setConfig` message handler to accept `gearScrapSupply` in the data payload
    - Define `ALLOWED_SCRAP_SUPPLIES = [50, 200, 500, 1000]`
    - Only store the value if it is in the allowed list; ignore invalid values
    - _Requirements: 3.4, 3.5, 3.8_

  - [ ] 3.3 Update gear scrap initialization in `startGame` and `resetForNextRound`
    - In `startGame()`, replace hardcoded `neutralTiles[i].gearScrap = 50` with `this.state.gearScrapSupply`
    - In `resetForNextRound()`, replace hardcoded `neutralTiles[i].gearScrap = 50` with `this.state.gearScrapSupply`
    - _Requirements: 3.6, 3.9_

  - [ ] 3.4 Update gear respawn in `gameTick` to use `gearScrapSupply`
    - In the gear spawning section of `gameTick()`, replace hardcoded `tile.gearScrap = 50` with `this.state.gearScrapSupply`
    - _Requirements: 3.7_

  - [ ] 3.5 Write property test: config validation (Property 4)
    - **Property 4: Invalid gear scrap supply values are rejected**
    - In `tests/property/economyRebalance.prop.ts`, generate random integers NOT in `{50, 200, 500, 1000}` and verify that attempting to set them leaves `gearScrapSupply` unchanged
    - **Validates: Requirements 3.8**

  - [ ] 3.6 Write unit tests for gearScrapSupply defaults and config
    - In `tests/unit/state/GameState.test.ts`, test that a new `GameState` has `gearScrapSupply` defaulting to 1000
    - Test that each allowed value (50, 200, 500, 1000) is accepted by the config validation logic
    - _Requirements: 3.3, 3.5, 3.8_

- [ ] 4. Implement passive factory income in gameTick
  - [ ] 4.1 Add passive factory income step to `gameTick` in `server/rooms/GameRoom.ts`
    - Insert a new step after the timer countdown and before border conflict resolution
    - Iterate over all non-absorbed players, count their owned factories (`isSpawn` tiles), and add that count to `player.resources`
    - This applies equally to human and AI players
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1_

  - [ ] 4.2 Write property test: passive income proportionality (Property 3)
    - **Property 3: Passive factory income is proportional to factory count**
    - In `tests/property/economyRebalance.prop.ts`, generate random factory counts (0–10) and initial resource amounts (0–10000), simulate one tick of passive income logic, and verify `resources_after === resources_before + factoryCount`
    - **Validates: Requirements 2.1, 2.2, 2.3, 5.1**

  - [ ] 4.3 Write unit tests for passive factory income
    - Extend `tests/unit/logic/ConflictEngine.test.ts` or create a new test file
    - Test that a player with 3 factories gains 3 scrap per tick
    - Test that a player with 0 factories gains 0 scrap per tick
    - Test that an absorbed player receives no passive income
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update client-side cost display and config panel
  - [ ] 6.1 Update `GameScene.ts` to use `calculateUpgradeCost` from `economyUtils`
    - Import `calculateUpgradeCost` from `src/utils/economyUtils`
    - Replace `const attackCost = 50 * effectivePlayer.attack` with `calculateUpgradeCost(effectivePlayer.attack)`
    - Replace `const defenseCost = 50 * effectivePlayer.defense` with `calculateUpgradeCost(effectivePlayer.defense)`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 6.2 Update `NetworkManager.ts` to accept `gearScrapSupply` in `sendSetConfig`
    - Add `gearScrapSupply?: number` to the config type in `sendSetConfig`
    - _Requirements: 3.4_

  - [ ] 6.3 Add SCRAP SUPPLY section to config panel in `LobbyScene.ts`
    - Add a "SCRAP SUPPLY" section to `openConfigPanel()` between the AI PLAYERS section and the DONE button
    - Display four selectable buttons: 50, 200, 500, 1000
    - Default selection is 1000 (read from `this.room?.state?.gearScrapSupply ?? 1000`)
    - On selection, call `this.networkManager.sendSetConfig({ gearScrapSupply: value })`
    - Follow the same button-group highlight pattern as TIME LIMIT and MATCH FORMAT sections
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases from requirements
- AI player economy compatibility (Requirement 5) is satisfied by the shared `calculateUpgradeCost` function (tasks 1.1), the passive income loop covering all non-absorbed players (task 4.1), and the shared `gearScrapSupply` config (tasks 3.3, 3.4)
