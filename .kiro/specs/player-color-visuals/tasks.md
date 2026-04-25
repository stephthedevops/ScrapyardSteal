# Implementation Plan: Player Color Visuals

## Overview

Replace hardcoded gold/yellow colors in claimable tile highlighting and gear mine flash animations with the local player's chosen color. All changes are client-side, touching `GridRenderer.ts` (renderer) and `GameScene.ts` (caller). A new static `brightenColor()` utility handles direction-matched tile brightening for any palette color.

## Tasks

- [x] 1. Add `brightenColor()` static utility to GridRenderer
  - [x] 1.1 In `src/rendering/GridRenderer.ts`, add a `static brightenColor(color: number, amount: number = 0.3): number` method to the `GridRenderer` class. Extract R, G, B channels from the numeric hex color, compute `newChannel = channel + (255 - channel) * amount`, clamp each to [0, 255], floor to integer, and recombine into a single numeric hex value.
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 1.2 [PBT] In `tests/property/playerColorVisuals.prop.ts`, write Property 1: Channel-bounded brightening invariant. For any hex color in [0x000000, 0xFFFFFF] and any amount in [0.0, 1.0], each output RGB channel satisfies `inputChannel ≤ outputChannel ≤ 255`. Use `fast-check` with min 100 iterations. Tag: `Feature: player-color-visuals, Property 1: Channel-bounded brightening invariant`.
    - **Property 1: Channel-bounded brightening invariant**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 2. Update `highlightClaimable()` to accept and use player color
  - [x] 2.1 In `src/rendering/GridRenderer.ts`, add an optional `playerColor?: number` parameter to `highlightClaimable()`. When provided, use `playerColor` for non-direction-matched outlines (replacing `HIGHLIGHT_COLOR`), use `GridRenderer.brightenColor(playerColor)` for direction-matched outlines (replacing `HIGHLIGHT_DIRECTION_COLOR`), and use the hex string of `playerColor` for cost label text color (replacing `#ffcc44`). When `playerColor` is `undefined`, preserve existing hardcoded defaults.
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

- [x] 3. Update `playMineFlash()` to accept and use player color
  - [x] 3.1 In `src/rendering/GridRenderer.ts`, add an optional `playerColor?: number` parameter to `playMineFlash()`. When provided, use `playerColor` for the flash rectangle color instead of hardcoded `0xffd700`. When `playerColor` is `undefined`, preserve the existing gold default. All animation parameters (opacity 0.6, scale 1.3x, fade 300ms, Power2 easing) remain unchanged.
    - _Requirements: 5.1, 5.2_

- [x] 4. Checkpoint — Verify GridRenderer changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Pass player color from GameScene to GridRenderer
  - [x] 5.1 In `src/scenes/GameScene.ts`, in the `highlightClaimableTiles()` method, read `localPlayer.color` from room state. If `color >= 0`, pass it as the `playerColor` argument to `gridRenderer.highlightClaimable()`. If `color < 0`, pass `0xffcc44` (the existing default gold).
    - _Requirements: 1.1, 1.2_
  - [x] 5.2 In `src/scenes/GameScene.ts`, in the `handleTileClick()` method, read `localPlayer.color` from room state. If `color >= 0`, pass it as the `playerColor` argument to `gridRenderer.playMineFlash()`. If `color < 0`, pass `0xffd700` (the existing default gold).
    - _Requirements: 4.1, 4.2_

- [x] 6. Unit tests for wiring and integration
  - [x] 6.1 In `tests/unit/rendering/GridRenderer.test.ts`, write unit tests covering: highlight color passthrough (2.1), direction-matched brightening (2.2), opacity preservation (2.3), cost label color (3.1), mine flash color passthrough (5.1), mine flash animation parameters (5.2), highlight fallback when color omitted (1.2), mine flash fallback when color omitted (4.2), and `brightenColor` specific examples for Tungsten and Chromium (6.2, 6.3).
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 3.1, 4.2, 5.1, 5.2, 6.2, 6.3_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the `brightenColor()` pure function across the full color space
- Unit tests validate wiring, fallback behavior, and specific color examples
