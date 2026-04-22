# Requirements — Game Logic Unit Tests

## Introduction

The core game logic in `server/logic/ConflictEngine.ts`, `server/logic/GridManager.ts`, and `src/logic/DirectionFilter.ts` currently has no test coverage. These modules contain pure functions that drive the game's most critical mechanics: combat resolution, tile costs, grid management, and directional filtering. Adding comprehensive unit and property-based tests will catch regressions early and document the expected behavior of these systems.

## Requirements

### ConflictEngine Tests

1.1 WHEN `calculateBorderPressure(attack, borderTileCount)` is called THEN it SHALL return `attack * borderTileCount`

1.2 WHEN `calculateTileClaimCost(currentTileCount)` is called THEN it SHALL return `floor(10 * (1 + 0.02 * currentTileCount))`

1.3 WHEN `calculateUpgradeCost(currentStatValue)` is called THEN it SHALL return `50 * currentStatValue`

1.4 WHEN `findBorders(tiles, gridWidth, gridHeight)` is called with tiles owned by different players sharing an edge THEN it SHALL return a `BorderInfo` for each unique player pair with the correct shared tiles for each side

1.5 WHEN `findBorders` is called with no adjacent opposing tiles THEN it SHALL return an empty array

1.6 WHEN `resolveBorder` is called and player A's pressure exceeds player B's defense THEN it SHALL return a `TileTransfer` where `toId` is player A, `fromId` is player B, and `tile` belongs to B's shared border tiles

1.7 WHEN `resolveBorder` is called and player B's pressure exceeds player A's defense THEN it SHALL return a `TileTransfer` where `toId` is player B, `fromId` is player A, and `tile` belongs to A's shared border tiles

1.8 WHEN `resolveBorder` is called and both sides have equal pressure and defense THEN it SHALL return `null` (stalemate)

### Future Scope (Parked)

1.9 (DEFERRED) Integration tests chaining `findBorders` → `resolveBorder` on a realistic grid to verify composition

1.10 (DEFERRED) GameRoom message handler tests verifying validation logic, stat caps, phase guards, host-only actions, and team delegation

### GridManager Tests

2.1 WHEN `initializeGrid(width, height)` is called THEN it SHALL return `width * height` tiles, each with correct x/y coordinates and empty ownerId

2.2 WHEN `getAdjacentTiles(x, y, gridWidth, gridHeight)` is called for an interior tile THEN it SHALL return exactly 4 neighbors (up, down, left, right)

2.3 WHEN `getAdjacentTiles` is called for a corner tile THEN it SHALL return exactly 2 neighbors

2.4 WHEN `getAdjacentTiles` is called for an edge (non-corner) tile THEN it SHALL return exactly 3 neighbors

2.5 WHEN `getAdjacentTiles` is called THEN all returned neighbors SHALL be within grid bounds

2.6 WHEN `isAdjacent(tileX, tileY, playerTiles)` is called with a tile orthogonally adjacent to a player tile THEN it SHALL return `true`

2.7 WHEN `isAdjacent` is called with a tile diagonally adjacent (but not orthogonally) THEN it SHALL return `false`

2.8 WHEN `isAdjacent` is called with a tile not adjacent to any player tile THEN it SHALL return `false`

2.9 WHEN `calculateGridSize(playerCount)` is called THEN it SHALL return `ceil(30 * sqrt(playerCount / 10))`

2.10 WHEN `assignStartingPositions(playerIds, gridWidth, gridHeight, minDistance)` is called THEN it SHALL return a position for every player, all within grid bounds (at least 2 from each edge)

### DirectionFilter Tests

3.1 WHEN `filterByDirection` is called with direction `""` THEN it SHALL return all claimable tiles unfiltered

3.2 WHEN `filterByDirection` is called with direction `"north"` THEN it SHALL return only tiles with y less than the centroid y of the player's territory

3.3 WHEN `filterByDirection` is called with direction `"south"` THEN it SHALL return only tiles with y greater than the centroid y

3.4 WHEN `filterByDirection` is called with direction `"east"` THEN it SHALL return only tiles with x greater than the centroid x

3.5 WHEN `filterByDirection` is called with direction `"west"` THEN it SHALL return only tiles with x less than the centroid x

3.6 WHEN `filterByDirection` is called with an empty `playerTiles` array THEN it SHALL return all claimable tiles unfiltered

3.7 WHEN `filterByDirection` is called with an unrecognized direction string THEN it SHALL return all claimable tiles unfiltered (default case)
