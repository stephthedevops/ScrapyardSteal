# Implementation Plan: Scrapyard Steal

## Overview

Incremental implementation of the Scrapyard Steal multiplayer clicker/strategy game. We build server-side game logic first (state, grid, conflict engine), then wire up the client (rendering, HUD, networking). Each task builds on the previous, and testing tasks are placed close to the code they validate. All code is TypeScript; server uses Colyseus schemas, client uses Phaser 3.

## Tasks

- [ ] 1. Extend GameState schema and create GridManager
  - [x] 1.1 Extend `server/state/GameState.ts` with Tile schema, `absorbed` and `direction` fields on Player, and `tiles`, `gridWidth`, `gridHeight`, `phase` fields on GameState
    - Add `Tile` class with `@type` decorators for `x`, `y`, `ownerId`
    - Add `absorbed: boolean`, `direction: string` to `Player`
    - Add `tiles: ArraySchema<Tile>`, `gridWidth: number`, `gridHeight: number`, `phase: string` to `GameState`
    - _Requirements: 1.1, 2.1, 13.1_

  - [x] 1.2 Create `server/logic/GridManager.ts` with pure functions for grid initialization and adjacency
    - Implement `initializeGrid(width, height): Tile[]` — creates width×height neutral tiles
    - Implement `getAdjacentTiles(x, y, gridWidth, gridHeight): {x,y}[]` — returns orthogonal neighbors within bounds
    - Implement `isAdjacent(tileX, tileY, playerTiles: Tile[]): boolean` — checks if a tile neighbors any player-owned tile
    - Implement `assignStartingPositions(playerIds, gridWidth, gridHeight, minDistance): Map<string, {x,y}>` — places players with Manhattan distance ≥ 5
    - Implement `calculateGridSize(playerCount: number): number` — returns `ceil(30 * sqrt(playerCount / 10))`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 1.3 Write property tests for grid initialization (Properties 3, 4)
    - **Property 3: Grid sizing scales with player count** — for any N in [10,20], grid dimensions ≥ `ceil(30*sqrt(N/10))` and total tiles = width × height
    - **Validates: Requirements 2.1**
    - **Property 4: Starting positions maintain minimum distance** — for any set of players, all pairs have Manhattan distance ≥ 5, all non-starting tiles are neutral
    - **Validates: Requirements 2.2, 2.3**

- [ ] 2. Implement ConflictEngine with pure conflict resolution logic
  - [x] 2.1 Create `server/logic/ConflictEngine.ts` with pure functions
    - Implement `findBorders(tiles, gridWidth, gridHeight): BorderInfo[]` — finds all borders between opposing players
    - Implement `calculateBorderPressure(attack, borderTileCount): number` — returns `attack * borderTileCount`
    - Implement `resolveBorder(border, playerA, playerB): TileTransfer | null` — compares pressure vs defense, returns tile to transfer or null
    - Implement `calculateTileClaimCost(currentTileCount): number` — returns `floor(10 * (1 + 0.02 * currentTileCount))`
    - Implement `calculateUpgradeCost(currentStatValue): number` — returns `50 * currentStatValue`
    - _Requirements: 3.5, 5.2, 6.2, 7.2, 7.3, 7.4_

  - [ ] 2.2 Write property tests for tile claiming costs (Properties 5, 6)
    - **Property 5: Valid tile claim updates state correctly** — claiming a valid adjacent neutral tile deducts correct cost, sets ownerId, increments tileCount
    - **Validates: Requirements 3.1, 3.4, 3.5**
    - **Property 6: Invalid tile claims are rejected** — non-adjacent or insufficient scrap leaves state unchanged
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 2.3 Write property tests for economy (Properties 7, 8, 9, 10)
    - **Property 7: Resource income equals tile count** — after one tick, resources increase by exactly tileCount
    - **Validates: Requirements 4.1**
    - **Property 8: Attack upgrade deducts correct cost and increments stat** — deducts 50×currentAttack, increments attack by 1, other stats unchanged
    - **Validates: Requirements 5.1, 5.2**
    - **Property 9: Defense upgrade deducts correct cost and increments stat** — deducts 50×currentDefense, increments defense by 1, other stats unchanged
    - **Validates: Requirements 6.1, 6.2**
    - **Property 10: Upgrade rejection on insufficient scrap** — insufficient scrap leaves state unchanged
    - **Validates: Requirements 5.3, 6.3**

  - [ ] 2.4 Write property tests for border conflict (Properties 11, 12, 13)
    - **Property 11: Border conflict resolution transfers tiles correctly** — if attacker pressure > defender defense×borderTiles, exactly one tile transfers; equal pressure = no transfer
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
    - **Property 12: Absorption triggers at zero tiles** — player with tileCount 0 after conflict gets absorbed = true
    - **Validates: Requirements 8.1**
    - **Property 13: Absorption bonus calculation** — absorbing player receives floor(0.25 × absorbed player's total accumulated scrap)
    - **Validates: Requirements 8.2**

- [ ] 3. Implement GameRoom lifecycle and message handlers
  - [x] 3.1 Implement `onCreate`, `onJoin`, `onLeave` in `server/rooms/GameRoom.ts`
    - `onCreate`: set phase to "waiting", initialize empty state
    - `onJoin`: create Player with initial values (resources=0, attack=1, defense=1, tileCount=1, absorbed=false, direction=""), add to state; when player count ≥ 2, call `startGame()` which generates grid, assigns starting positions, sets phase to "active"
    - `onLeave`: convert all player's tiles to neutral (ownerId=""), remove player from state
    - Enforce maxClients=20
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Implement message handlers for player actions
    - `claimTile({x, y})`: validate adjacency and scrap, deduct cost, assign tile, increment tileCount
    - `upgradeAttack`: validate scrap ≥ 50×attack, deduct cost, increment attack
    - `upgradeDefense`: validate scrap ≥ 50×defense, deduct cost, increment defense
    - `setDirection({direction})`: validate direction in allowed set, update player direction
    - All handlers reject invalid actions silently (no state change)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 9.1, 10.4_

  - [x] 3.3 Implement server game loop (1-second tick)
    - Award resource income: each player gains scrap = tileCount per tick
    - Evaluate all borders using ConflictEngine.findBorders
    - Resolve each border using ConflictEngine.resolveBorder, apply tile transfers
    - Check for absorption: if any player's tileCount reaches 0, mark absorbed, award bonus scrap to absorber
    - Maintain internal TileGrid lookup (2D array) for efficient adjacency checks
    - _Requirements: 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2_

  - [ ] 3.4 Write property tests for player initialization and disconnection (Properties 1, 2)
    - **Property 1: Player initialization invariant** — joining player has resources=0, attack=1, defense=1, tileCount=1, absorbed=false
    - **Validates: Requirements 1.1**
    - **Property 2: Disconnection neutralizes territory** — after disconnect, no tile references the player's id
    - **Validates: Requirements 1.3**

- [x] 4. Checkpoint — Ensure all server logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement client NetworkManager
  - [x] 5.1 Create `src/network/NetworkManager.ts` wrapping the Colyseus client
    - Implement `joinGame(): Promise<Room>` — joins the "game" room
    - Implement `sendClaimTile(x, y)`, `sendUpgradeAttack()`, `sendUpgradeDefense()`, `sendSetDirection(direction)` — send messages to server
    - Implement `onStateChange(callback)` — register state change listener
    - Wire up to existing `colyseusClient` from `src/network/client.ts`
    - _Requirements: 10.1, 10.4, 13.2_

- [x] 6. Implement client GridRenderer
  - [x] 6.1 Create `src/rendering/GridRenderer.ts` for tile grid rendering
    - Implement constructor that creates a Phaser graphics layer for the grid
    - Implement `renderTile(x, y, ownerId, animate?)` — draws tile with player color or neutral color, optional claim animation
    - Implement `highlightClaimable(tiles, direction)` — highlights tiles the player can claim, filtered by direction
    - Implement `playAbsorptionEffect(tiles)` — visual effect when a player is absorbed
    - Use industrial/scrapyard color palette (rust tones, metallic grays)
    - Assign distinct colors per player
    - _Requirements: 2.4, 3.2, 3.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 7. Implement client HUDManager
  - [x] 7.1 Create `src/ui/HUDManager.ts` for heads-up display
    - Implement `updateStats(scrap, attack, defense, tileCount, incomeRate)` — update stat display
    - Implement `updateLeaderboard(players)` — render sorted leaderboard by tileCount descending
    - Implement `updateUpgradeCosts(attackCost, defenseCost)` — show costs on upgrade buttons
    - Implement `showNotification(message)` — display absorption and other event notifications
    - Create upgrade buttons for attack and defense with click handlers
    - _Requirements: 4.3, 5.4, 6.4, 8.3, 11.1, 11.2, 11.3, 11.4_

  - [ ] 7.2 Write property test for leaderboard sorting (Property 15)
    - **Property 15: Leaderboard sorting** — for any set of active players, leaderboard is in non-increasing order of tileCount
    - **Validates: Requirements 11.2**

- [ ] 8. Implement direction filtering on client
  - [x] 8.1 Create direction filtering logic in `src/logic/DirectionFilter.ts`
    - Implement `filterByDirection(claimableTiles, playerTiles, direction): {x,y}[]` — filters tiles by direction relative to territory centroid
    - Calculate centroid of player's territory
    - Filter tiles that lie in the selected cardinal direction from centroid
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 8.2 Write property test for direction filtering (Property 14)
    - **Property 14: Direction-based tile filtering** — filtered result contains only tiles in the selected direction and is a subset of all claimable tiles
    - **Validates: Requirements 9.1**

- [x] 9. Wire GameScene together
  - [x] 9.1 Update `src/scenes/GameScene.ts` to integrate all client components
    - In `create()`: instantiate NetworkManager, join game room
    - On state change: instantiate GridRenderer with grid dimensions, render all tiles
    - On state change: update HUDManager with local player stats and leaderboard
    - Handle tile click: determine clicked tile coordinates, send claimTile message via NetworkManager
    - Handle upgrade button clicks: send upgradeAttack/upgradeDefense via NetworkManager
    - Handle direction selection: send setDirection via NetworkManager, update GridRenderer highlights
    - On absorption event: show notification via HUDManager, play absorption effect via GridRenderer
    - _Requirements: 3.1, 5.1, 6.1, 9.1, 10.2, 10.3, 12.2, 12.3, 12.4_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Add Vitest and fast-check test infrastructure
  - [x] 11.1 Install `vitest` and `fast-check` as dev dependencies, create `vitest.config.ts`
    - Configure Vitest to find tests in `tests/` directory
    - Ensure TypeScript paths resolve correctly for server and shared code
    - _Requirements: (testing infrastructure)_

  - [ ] 11.2 Write property test for serialization round-trip (Property 16)
    - **Property 16: GameState serialization round-trip** — for any valid GameState, serialize then deserialize produces equivalent state
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Server logic is built first (tasks 1–4) so the authoritative game loop is solid before wiring the client
- The test infrastructure task (11) can be pulled earlier if you want to run property tests as you go
