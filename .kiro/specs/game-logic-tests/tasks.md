# Tasks — Game Logic Unit Tests

## Wave 1 — Parallel (3 agents, each owns one module's full test coverage)

### Agent A: GridManager Tests
- [x] 1. Create unit tests for GridManager (`tests/unit/logic/GridManager.test.ts`)
  - [x] 1.1 Test `initializeGrid` returns correct tile count with valid coordinates and empty owners
  - [x] 1.2 Test `getAdjacentTiles` returns 4 neighbors for an interior tile
  - [x] 1.3 Test `getAdjacentTiles` returns 2 neighbors for a corner tile
  - [x] 1.4 Test `getAdjacentTiles` returns 3 neighbors for an edge (non-corner) tile
  - [x] 1.5 Test `getAdjacentTiles` returns only in-bounds neighbors
  - [x] 1.6 Test `isAdjacent` returns true for orthogonally adjacent tiles
  - [x] 1.7 Test `isAdjacent` returns false for diagonally adjacent tiles
  - [x] 1.8 Test `isAdjacent` returns false for non-adjacent tiles
  - [x] 1.9 Test `calculateGridSize` returns `ceil(30 * sqrt(playerCount / 10))` for several values
  - [x] 1.10 Test `assignStartingPositions` returns one position per player, all within grid bounds
- [x] 2. Create property-based tests for GridManager (`tests/property/GridManager.prop.ts`)
  - [x] 2.1 Grid always has `width * height` tiles — generate random width/height (1–50), call `initializeGrid`, assert length equals `w * h`
  - [x] 2.2 All tiles have valid coordinates — for random grids, assert every tile satisfies `0 <= x < width` and `0 <= y < height`
  - [x] 2.3 All tiles start with empty ownerId — for random grids, assert every tile has `ownerId === ""`
  - [x] 2.4 All adjacent tile results are within grid bounds — generate random `(x, y)` within random grid dimensions, assert all neighbors satisfy `0 <= nx < width` and `0 <= ny < height`
  - [x] 2.5 Interior tiles always have exactly 4 neighbors — generate random grid (min 3×3) and random interior position (`0 < x < w-1`, `0 < y < h-1`), assert `getAdjacentTiles` returns exactly 4
  - [x] 2.6 Grid size is always positive for positive player counts — generate random `playerCount` (1–100), assert `calculateGridSize` returns > 0
  - [x] 2.7 All starting positions are within grid bounds with margin — generate random player count (1–20), compute grid size, call `assignStartingPositions`, assert all positions satisfy `2 <= x <= gridWidth - 3` and `2 <= y <= gridHeight - 3`

### Agent B: ConflictEngine Tests
- [x] 3. Create unit tests for ConflictEngine (`tests/unit/logic/ConflictEngine.test.ts`)
  - [x] 3.1 Test `calculateBorderPressure` returns `attack * borderTileCount` for several input pairs
  - [x] 3.2 Test `calculateTileClaimCost` returns `floor(10 * (1 + 0.02 * currentTileCount))` for 0, 50, and 100 tiles
  - [x] 3.3 Test `calculateUpgradeCost` returns `50 * currentStatValue` for values 1 and 10
  - [x] 3.4 Test `findBorders` detects a border between two players on a small grid (2×2 or 3×3)
  - [x] 3.5 Test `findBorders` returns empty array when no opposing adjacent tiles exist
  - [x] 3.6 Test `resolveBorder` returns a transfer with `toId`=A, `fromId`=B, and `tile` from B's shared tiles when A's pressure exceeds B's defense
  - [x] 3.7 Test `resolveBorder` returns a transfer with `toId`=B, `fromId`=A, and `tile` from A's shared tiles when B's pressure exceeds A's defense
  - [x] 3.8 Test `resolveBorder` returns null on stalemate (equal stats and tile counts)
- [x] 4. Create property-based tests for ConflictEngine (`tests/property/ConflictEngine.prop.ts`)
  - [x] 4.1 Pressure is non-negative — generate random non-negative `attack` and `borderTileCount` (0–100), assert result >= 0
  - [x] 4.2 Pressure scales linearly with attack — generate random `attack` (1–50) and `tileCount` (1–20), assert `pressure(2*attack, tileCount) === 2 * pressure(attack, tileCount)`
  - [x] 4.3 Pressure scales linearly with tile count — generate random `attack` (1–50) and `tileCount` (1–20), assert `pressure(attack, 2*tileCount) === 2 * pressure(attack, tileCount)`
  - [x] 4.4 Tile claim cost is monotonically non-decreasing — generate random `a` and `b` where `a < b` (0–1000), assert `cost(a) <= cost(b)`
  - [x] 4.5 Tile claim cost is always >= 10 — generate random non-negative `tileCount` (0–10000), assert `cost(tileCount) >= 10`
  - [x] 4.6 Upgrade cost is always positive for positive stat values — generate random `statValue` (1–100), assert `upgradeCost(statValue) > 0`
  - [x] 4.7 Upgrade cost is monotonically increasing — generate random `a` and `b` where `a < b` (1–100), assert `upgradeCost(a) < upgradeCost(b)`
  - [x] 4.8 Stalemate when both players have identical stats and equal border tile counts — generate random `attack` (1–50), `defense` (1–50), and `tileCount` (1–10); construct a `BorderInfo` with `tileCount` Tile objects per side using inline `makeTile` helper; call `resolveBorder` with identical `{attack, defense}` for both players; assert result is `null`

### Agent C: DirectionFilter Tests
- [x] 5. Create unit tests for DirectionFilter (`tests/unit/logic/DirectionFilter.test.ts`)
  - [x] 5.1 Test empty direction returns all claimable tiles
  - [x] 5.2 Test "north" returns only tiles with y < centroid y
  - [x] 5.3 Test "south" returns only tiles with y > centroid y
  - [x] 5.4 Test "east" returns only tiles with x > centroid x
  - [x] 5.5 Test "west" returns only tiles with x < centroid x
  - [x] 5.6 Test empty playerTiles returns all claimable tiles
  - [x] 5.7 Test unrecognized direction returns all claimable tiles
- [x] 6. Create property-based tests for DirectionFilter (`tests/property/DirectionFilter.prop.ts`)
  - [x] 6.1 Filtered tiles are always a subset of input tiles — generate random claimable tiles, player tiles, and valid direction; assert every returned tile exists in the input array
  - [x] 6.2 All "north" results have y < centroid y — generate random player tiles (non-empty) and claimable tiles; compute centroid; assert all returned tiles satisfy `y < centroidY`
  - [x] 6.3 All "south" results have y > centroid y — same approach, assert `y > centroidY`
  - [x] 6.4 All "east" results have x > centroid x — same approach, assert `x > centroidX`
  - [x] 6.5 All "west" results have x < centroid x — same approach, assert `x < centroidX`
  - [x] 6.6 Empty direction returns input unchanged — generate random tiles and empty direction, assert output equals input array

## Wave 2 — Sequential (after all Wave 1 agents complete)

- [x] 7. Run all tests and verify they pass
  - [x] 7.1 Run `npm test` and confirm all new and existing tests pass
  - [x] 7.2 Fix any test failures
