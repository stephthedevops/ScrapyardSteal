# Tasks: Test Coverage for Untested Server Logic

## Overview

Add unit and property-based tests for untested or recently modified server logic. All tasks are test-only — no production code changes.

## Tasks

- [ ] 1. ConflictEngine — calculateAttackPressure edge cases
  - [ ] 1.1 Add unit tests for `calculateAttackPressure` edge cases
    - In `tests/unit/logic/ConflictEngine.test.ts`, extend the existing `calculateAttackPressure` describe block
    - Test: `calculateAttackPressure(0, 0, 0)` returns 0 (activeBattles=0 treated as 1)
    - Test: `calculateAttackPressure(2, 7, 3)` returns `2 + floor(7/3)` = 4
    - Test: `calculateAttackPressure(1, 0, 5)` returns 1 (factories only, no bots)
    - Test: `calculateAttackPressure(0, 10, 3)` returns `floor(10/3)` = 3 (bots only, no factories)
    - _Requirements: 2.1, 2.2_

- [ ] 2. AI Name Generation — Fallback Paths
  - [ ] 2.1 Create `tests/unit/logic/aiNames.test.ts` with fallback tests
    - Test: All adjectives taken → still returns a valid adjective string (non-empty, from ADJECTIVES)
    - Test: All nouns taken → still returns a valid noun string (non-empty, from HOUSEHOLD_ROID)
    - Test: Both pools fully exhausted → returns valid `{ adj, noun }` with non-empty strings
    - Test: Empty taken sets → returns valid names from pools
    - Import ADJECTIVES and HOUSEHOLD_ROID from `server/logic/aiNames.ts` (add exports if needed)
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Add property test for AI name generation robustness
    - In `tests/property/aiPlayers.prop.ts`, add test `"Property 11: generateAIName never returns empty strings even with full exhaustion"`
    - Generate arbitrary subsets of ADJECTIVES (0 to all) as taken, arbitrary subsets of HOUSEHOLD_ROID (0 to all) as taken
    - Assert result.adj is non-empty and result.noun is non-empty
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. GridManager — calculateGridSize Clamping
  - [ ] 3.1 Add unit tests for `calculateGridSize` boundary values
    - In `tests/unit/logic/GridManager.test.ts`, extend the existing describe block
    - Test: `calculateGridSize(0)` returns 12 (below lower clamp)
    - Test: `calculateGridSize(2)` returns 12 (at lower clamp)
    - Test: `calculateGridSize(3)` returns 13 (just above lower clamp)
    - Test: `calculateGridSize(9)` returns 19 (just below upper clamp)
    - Test: `calculateGridSize(10)` returns 20 (at upper clamp)
    - Test: `calculateGridSize(100)` returns 20 (well above upper clamp)
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 3.2 Add property test for calculateGridSize clamping
    - In `tests/property/GridManager.prop.ts`, add test `"2.8 calculateGridSize always returns value in [12, 20]"`
    - Generate random playerCount (0–200), assert result is in [12, 20] and equals `min(20, max(12, 10 + playerCount))`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Member Upgrade Flow — DEF and COL Bots
  - [ ] 4.1 Create `tests/unit/logic/memberUpgrade.test.ts`
    - Import `Player` from `server/state/GameState` and `calculateUpgradeCost` from `server/logic/ConflictEngine`
    - Simulate the upgrade handler pattern (resolve leader from absorbed member, check cost, apply)
    - Test: Absorbed member triggers DEF upgrade → leader's resources decrease by `calculateUpgradeCost(leader.defense)`, leader's defense increments by 1
    - Test: Absorbed member triggers COL upgrade → leader's resources decrease by `calculateUpgradeCost(leader.collection)`, leader's collection increments by 1
    - Test: Team member also receives the stat increment (defense or collection +1)
    - Test: Rejected when leader has insufficient resources (resources unchanged, stat unchanged)
    - Test: Rejected when leader is pending absorption (resources unchanged, stat unchanged)
    - Test: Rejected when member's team leader is also absorbed (no valid leader chain)
    - Test: Non-absorbed player (team lead) can still upgrade normally (self-purchase path)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 5. AI Gear Mining — Unrestricted Unclaimed Access
  - [ ] 5.1 Create `tests/unit/logic/aiMining.test.ts`
    - Import `Player`, `Tile` from `server/state/GameState`
    - Simulate the AI mining logic from gameTick (iterate tiles, find minable gear, extract)
    - Test: AI mines an unclaimed gear tile that is NOT adjacent to territory → succeeds, scrap transferred
    - Test: AI mines an unclaimed gear tile adjacent to territory → succeeds (still works)
    - Test: AI mines a gear tile it owns → succeeds
    - Test: AI skips gear tiles owned by enemies → not mined
    - Test: Extraction amount = `min(5 × factoryCount, tile.gearScrap)` with 1 factory → extracts min(5, gearScrap)
    - Test: Extraction amount with 3 factories → extracts min(15, gearScrap)
    - Test: Gear tile with gearScrap=3 and 1 factory → extracts 3, hasGear set to false
    - Test: AI with no factories → factoryCount defaults to 1, extracts min(5, gearScrap)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Checkpoint — Run full test suite
  - Run `npm run test` and verify all new and existing tests pass
  - Run `npm run test:coverage` and confirm coverage improvements
  - Ensure no regressions in the existing 157 tests
