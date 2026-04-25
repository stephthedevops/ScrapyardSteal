# Implementation Plan: Name Sanitization Wiring

## Overview

Wire `sanitizeName()` calls into the three unsanitized write sites in `GameRoom.ts` (addAI handler, absorption in gameTick, resetForNextRound), then add property-based and unit tests to verify the invariant holds across all code paths. The `"setName"` handler is already correct and needs no changes.

## Tasks

- [ ] 1. Sanitize AI player names in the `"addAI"` handler
  - [ ] 1.1 Apply `sanitizeName()` to AI name fields before storing in Player schema
    - In the `"addAI"` message handler in `server/rooms/GameRoom.ts`, wrap `aiName.adj` and `aiName.noun` with `sanitizeName()` before assigning to `player.nameAdj` and `player.nameNoun`
    - Compose `player.teamName` from the already-sanitized `player.nameAdj` and `player.nameNoun`, then apply `sanitizeName()` to the composed result
    - `sanitizeName` is already imported in `GameRoom.ts` — no new imports needed
    - _Requirements: 2.1, 2.2_

  - [ ]* 1.2 Write property test: Name_Fields invariant on addAI path
    - **Property 1: Name_Fields invariant — all stored names are printable ASCII and trimmed**
    - Create `tests/property/nameSanitizationWiring.prop.ts`
    - Generate arbitrary Unicode strings as AI name inputs, pass through `sanitizeName`, compose teamName, verify all three fields contain only printable ASCII (0x20–0x7E) with no leading/trailing whitespace
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 2.1, 2.2, 5.1, 5.2, 5.3**

- [ ] 2. Sanitize composed team names during absorption in `gameTick()`
  - [ ] 2.1 Apply `sanitizeName()` to the composed `teamName` after prepending absorbed adjective
    - In the absorption block inside `gameTick()` in `server/rooms/GameRoom.ts`, wrap the composed `teamName` (`\`${absorbedAdj} ${toPlayer.teamName}\``) with `sanitizeName()` before assigning to `toPlayer.teamName`
    - The subsequent loop that copies `toPlayer.teamName` to other team members already propagates the sanitized value — no additional change needed there
    - _Requirements: 3.1, 3.2_

  - [ ]* 2.2 Write property test: Name_Fields invariant on absorption path
    - **Property 1: Name_Fields invariant — all stored names are printable ASCII and trimmed (absorption scenario)**
    - In `tests/property/nameSanitizationWiring.prop.ts`, add a test that generates arbitrary Unicode adjective strings, composes them via the absorption pattern (prepend adjective to existing teamName), applies `sanitizeName()`, and verifies the result contains only printable ASCII with no leading/trailing whitespace
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 3.1, 3.2, 5.3**

- [ ] 3. Sanitize recomposed team names in `resetForNextRound()`
  - [ ] 3.1 Apply `sanitizeName()` to the recomposed `teamName` in the round reset loop
    - In `resetForNextRound()` in `server/rooms/GameRoom.ts`, wrap the composed `teamName` (`\`${player.nameAdj} ${player.nameNoun}\``) with `sanitizeName()` before assigning to `player.teamName`
    - _Requirements: 4.1_

  - [ ]* 3.2 Write property test: Sanitization idempotence on composition
    - **Property 2: Sanitization is idempotent on composed names**
    - In `tests/property/nameSanitizationWiring.prop.ts`, generate random printable-ASCII trimmed strings (simulating already-sanitized name parts), compose them with space separators, verify `sanitizeName(composed) === composed`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 2.2, 3.1, 4.1**

- [ ] 4. Checkpoint — Verify all changes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Add unit tests for sanitization wiring
  - [ ]* 5.1 Write unit tests for addAI, absorption, and round reset sanitization
    - Create `tests/unit/rooms/GameRoom.sanitize.test.ts`
    - Test addAI sanitization: verify `nameAdj`, `nameNoun`, and `teamName` are sanitized after adding an AI player
    - Test absorption sanitization: set up two players, trigger absorption, verify composed `teamName` on absorber and team members is sanitized
    - Test absorption propagation: verify all team members share the same sanitized `teamName` as the leader
    - Test round reset sanitization: verify all players' `teamName` values are sanitized after `resetForNextRound()`
    - Test setName truncation order (regression): send a name longer than 16 characters and verify truncation happens before sanitization
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 5.2, 5.3_

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The core implementation is just 3 lines of code changed across 3 sites in `GameRoom.ts`
- `sanitizeName` is already imported in `GameRoom.ts` — no new imports needed
- The `"setName"` handler is already correct and requires no changes
- Property tests go in `tests/property/nameSanitizationWiring.prop.ts` (new file)
- Unit tests go in `tests/unit/rooms/GameRoom.sanitize.test.ts` (new file)
- Existing property tests in `tests/property/nameSanitization.prop.ts` cover the `sanitizeName` function itself — new tests focus on wiring
