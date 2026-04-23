# Implementation Plan: Rate Limiting

## Overview

Implement a server-side `RateLimiter` class that throttles gameplay messages (`claimTile`, `upgradeAttack`, `upgradeDefense`, `mineGear`) per player per action type with configurable cooldown windows. The module is integrated into `GameRoom` message handlers, with cleanup on disconnect and round reset. AI players are exempt by architecture since their actions flow through `gameTick()`, not `onMessage`.

## Tasks

- [x] 1. Create the RateLimiter class
  - [x] 1.1 Create `server/logic/RateLimiter.ts` with the `RateLimiterConfig` interface, `ActionType` type, and `RateLimiter` class
    - Export `RateLimiterConfig` interface with optional cooldown fields for each action type
    - Export `ActionType` as a union of the four rate-limited message types
    - Export `DEFAULT_COOLDOWN_MS` constant set to 200
    - Implement constructor accepting optional config and injectable `now` clock function (defaults to `Date.now`)
    - Populate `cooldowns` record from config with fallback to `DEFAULT_COOLDOWN_MS`
    - Initialize `timestamps` as `Map<string, Map<ActionType, number>>`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.2 Implement the `allow(sessionId, action)` method
    - If no entry exists for the session+action, record current timestamp and return `true`
    - If elapsed time since last accepted timestamp >= cooldown for that action, update timestamp and return `true`
    - Otherwise return `false` without modifying any state
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 1.3 Implement `removePlayer(sessionId)` and `reset()` methods
    - `removePlayer` deletes the session's entry from the timestamps map
    - `reset` clears the entire timestamps map
    - _Requirements: 4.2, 4.3_

  - [x] 1.4 Write unit tests for RateLimiter in `tests/unit/logic/RateLimiter.test.ts`
    - Test default cooldowns are 200ms for all four action types
    - Test first action of each type is always accepted
    - Test action at exactly the cooldown boundary is accepted
    - Test action 1ms before cooldown expires is rejected
    - Test different action types have independent cooldowns
    - Test `removePlayer` clears only the specified player's data
    - Test `reset` clears all players' data
    - Test custom config overrides default cooldowns
    - Use injectable clock for deterministic timing
    - _Requirements: 1.3, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Property-based tests for RateLimiter
  - [x] 2.1 Write property test for accept/reject correctness in `tests/property/RateLimiter.prop.ts`
    - **Property 1: Accept/reject correctness**
    - Generate sorted arrays of timestamps with random gaps, replay through RateLimiter with injected clock, verify each decision matches `elapsed >= cooldown || first`
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 8.1**

  - [x] 2.2 Write property test for partition conservation
    - **Property 2: Partition conservation**
    - Generate random action sequences, count accepted + throttled, assert sum equals input length
    - **Validates: Requirements 8.2**

  - [x] 2.3 Write property test for per-player isolation
    - **Property 3: Per-player isolation**
    - Generate interleaved actions for two players, run through single RateLimiter, compare results against two independent RateLimiter instances
    - **Validates: Requirements 4.1**

  - [x] 2.4 Write property test for cleanup restoring fresh state
    - **Property 4: Cleanup restores fresh state**
    - Generate action history, call `removePlayer` or `reset`, submit new action, assert accepted
    - **Validates: Requirements 4.2, 4.3**

  - [x] 2.5 Write property test for custom configuration
    - **Property 5: Custom configuration determines cooldown**
    - Generate random cooldown configs and action pairs that straddle the boundary, verify configured cooldown governs the decision
    - **Validates: Requirements 5.1**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate RateLimiter into GameRoom
  - [x] 4.1 Instantiate RateLimiter in `GameRoom.onCreate()`
    - Import `RateLimiter` from `server/logic/RateLimiter`
    - Add `private rateLimiter!: RateLimiter` field to `GameRoom`
    - Instantiate `this.rateLimiter = new RateLimiter()` in `onCreate()`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 4.2 Add rate limit checks to message handlers
    - Add `if (!this.rateLimiter.allow(client.sessionId, "claimTile")) return;` at the top of the `claimTile` handler (after phase check, before player lookup)
    - Add the same pattern for `upgradeAttack`, `upgradeDefense`, and `mineGear` handlers
    - Throttled messages return early — no error sent, no state modified
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 6.1, 6.2_

  - [x] 4.3 Add cleanup calls for disconnect and round reset
    - Call `this.rateLimiter.removePlayer(client.sessionId)` in `onLeave()`
    - Call `this.rateLimiter.reset()` in `resetForNextRound()`
    - _Requirements: 4.2, 4.3_

  - [x] 4.4 Write integration tests for GameRoom rate limiting
    - Verify throttled `claimTile` does not modify tile ownership or player resources
    - Verify throttled action does not send any message to the client
    - Verify AI actions in `gameTick()` execute without rate limiter involvement
    - Verify `onLeave` triggers `removePlayer` cleanup
    - Verify `resetForNextRound` triggers `reset`
    - _Requirements: 6.1, 6.2, 7.1_

- [x] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The RateLimiter uses an injectable clock (`now` parameter) for deterministic testing
- AI bypass is structural — AI actions flow through `gameTick()`, not `onMessage`, so no rate limiter code is needed for AI exemption
- Property tests use `fast-check` (already in devDependencies) with minimum 100 iterations per property
- All code is TypeScript, matching the existing project
