# Implementation Plan: Pre-Ship Polish

## Overview

Three independent polish items for the Scrapyard Steal game jam submission: (1) remove the growth direction feature entirely, (2) auto-assign colors when players join the lobby, and (3) shrink the gear icon in scrap cost labels. All changes use TypeScript and modify existing files — no new modules are introduced.

## Tasks

- [x] 1. Remove DirectionFilter module and associated tests
  - Delete `src/logic/DirectionFilter.ts`
  - Delete `tests/property/DirectionFilter.prop.ts`
  - Delete `tests/unit/logic/DirectionFilter.test.ts`
  - _Requirements: 1.1, 7.1_

- [x] 2. Remove direction references from GameScene
  - [x] 2.1 Strip direction imports, state, and key listeners from GameScene
    - Remove `import { filterByDirection } from "../logic/DirectionFilter"` from `src/scenes/GameScene.ts`
    - Remove the `currentDirection` field and its initialization in `create()`
    - Delete the entire `setupDirectionKeys()` method
    - Remove the `setupDirectionKeys()` call in `create()`
    - In `highlightClaimableTiles()`, remove the `filterByDirection()` call — pass `claimable` directly to `highlightClaimable()`
    - Remove the `this.currentDirection` argument from the `highlightClaimable()` call
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 6.1_

- [x] 3. Remove direction references from server and network layer
  - [x] 3.1 Remove `sendSetDirection` method from NetworkManager
    - Delete the `sendSetDirection(direction: string)` method from `src/network/NetworkManager.ts`
    - _Requirements: 5.1_

  - [x] 3.2 Remove `setDirection` message handler from GameRoom
    - Delete the `this.onMessage("setDirection", ...)` handler block in `server/rooms/GameRoom.ts`
    - Remove `player.direction = ""` from `onJoin()`
    - Leave the `direction` field on the Player schema in `server/state/GameState.ts` to avoid Colyseus deserialization errors
    - _Requirements: 3.1, 3.2_

- [x] 4. Remove direction parameter from GridRenderer highlight rendering
  - [x] 4.1 Simplify `highlightClaimable()` in GridRenderer
    - Remove the `direction` parameter from the `highlightClaimable()` method signature in `src/rendering/GridRenderer.ts`
    - Delete the `isTileInDirection()` private method
    - Remove the `HIGHLIGHT_DIRECTION_COLOR` constant
    - In `highlightClaimable()`, use `baseColor` with full opacity (1.0) for all tile outlines instead of branching on direction
    - _Requirements: 4.1, 4.2_

- [x] 5. Checkpoint — Verify direction removal compiles and tests pass
  - Run `npx tsc --noEmit` to confirm no TypeScript errors remain after direction removal
  - Run `vitest run` to confirm the test suite passes without the deleted test files
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.1, 7.2_

- [x] 6. Auto-assign colors on lobby join
  - [x] 6.1 Add `getNextAvailableColor()` helper and wire into `onJoin` and `addAI`
    - Promote `BASE_COLORS`, `EXTENDED_COLORS`, `ALL_COLORS`, and `getAllowedColors` from inside `onCreate()` to module-level or class-level constants in `server/rooms/GameRoom.ts`
    - Add a private `getNextAvailableColor(): number` method that iterates the allowed palette and returns the first color not taken by any player, or -1 if all taken
    - In `onJoin()`, after creating the player, call `player.color = this.getNextAvailableColor()` instead of leaving it at -1
    - In the `addAI` handler, replace the client-provided color with `this.getNextAvailableColor()` and skip adding the AI if the result is -1
    - Keep the existing `selectColor` handler unchanged so players can still manually swap colors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2_

  - [x] 6.2 Write property tests for auto-assign color logic
    - Create `tests/property/autoAssignColor.prop.ts`
    - **Property 1: Auto-assigned colors are unique and from the allowed palette** — generate random join sequences of 1–11 players (10-player mode) or 1–21 players (20-player mode), simulate the auto-assignment logic, assert all assigned colors are unique, from the palette, and that the (palette_size + 1)th player gets -1
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - **Property 2: Auto-assigned colors respect maxPlayers palette bounds** — generate random join sequences parameterized on maxPlayers ∈ {10, 20}, assert every assigned color belongs to the correct palette subset
    - **Validates: Requirements 9.1, 9.2**
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2_

  - [x] 6.3 Write unit tests for auto-assign color logic
    - Add tests in `tests/unit/state/GameState.test.ts` or a new file verifying: first player gets first palette color, second player gets second palette color, manual `selectColor` still works after auto-assignment, AI players get auto-assigned colors, palette exhaustion returns -1
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Shrink gear icon in scrap cost label
  - [x] 7.1 Split cost label into number + icon text objects in GridRenderer
    - In `highlightClaimable()` in `src/rendering/GridRenderer.ts`, replace the single cost label `this.scene.add.text(..., \`-${tileCost}⚙️\`, ...)` with two Phaser text objects:
      1. Cost number: `-{tileCost}` at the current font size (`Math.max(8, Math.floor(tileSize * 0.385))`)
      2. Gear icon: `⚙️` at ~70% of the cost number font size (`Math.max(6, Math.floor(fontSize * 0.7))`)
    - Position the gear icon immediately to the right of the cost number
    - Add both text objects to `this.costLabels` for cleanup
    - _Requirements: 10.1, 10.2_

  - [x] 7.2 Write unit tests for gear icon font size
    - Add tests in `tests/unit/rendering/GridRenderer.test.ts` verifying: the cost number font size formula is unchanged, the gear icon font size is smaller than the cost number font size, both are clamped to their minimum values
    - _Requirements: 10.1, 10.2_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Run `vitest run` to confirm all unit and property tests pass
  - Run `npx tsc --noEmit` to confirm no TypeScript errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required — no optional markers
- The `direction` field remains in the Player Colyseus schema to avoid deserialization errors for connected clients during the jam
- Property tests use `fast-check` with minimum 100 iterations, following the project's existing pattern
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major change area
