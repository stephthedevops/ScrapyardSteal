# Design — Game Logic Unit Tests

## Overview

This spec adds unit tests and property-based tests for the three untested pure-logic modules: `ConflictEngine`, `GridManager`, and `DirectionFilter`. All target functions are pure (no side effects, no I/O, no Colyseus dependency beyond the `Tile`/`Player` Schema classes), making them ideal candidates for fast, deterministic testing.

## Test Architecture

### File Layout

```
tests/unit/logic/
├── GridManager.test.ts       — unit tests for all 5 exported functions (run first — no deps)
├── ConflictEngine.test.ts    — unit tests for all 5 exported functions (depends on GridManager)
├── DirectionFilter.test.ts   — unit tests for filterByDirection
tests/property/
├── GridManager.prop.ts       — property-based tests for grid init, adjacency, bounds
├── ConflictEngine.prop.ts    — property-based tests for pressure, costs, resolution
├── DirectionFilter.prop.ts   — property-based tests for subset, direction constraints
```

Files mirror the source tree under `tests/unit/logic/` (matching the `server/logic/` and `src/logic/` paths). Property tests go in the existing `tests/property/` directory.

### Dependencies

- **Vitest** — already configured, globals enabled
- **fast-check** — already installed, used for property-based tests
- **@colyseus/schema** — `Tile` class is needed to construct test fixtures for ConflictEngine and GridManager. Import directly from source files.

### Test Fixture Patterns

**Tile creation helper**: Several tests need `Tile` objects with specific x/y/ownerId. Each test file defines its own inline helper (no shared utility file — extract later if a third file needs it):

```ts
function makeTile(x: number, y: number, ownerId = ""): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  return t;
}
```

**Grid creation**: For `findBorders` tests, build small grids (e.g., 3×3, 4×4) with known ownership patterns rather than using `initializeGrid` (to keep tests independent).

### Test Maintenance Strategy

Unit tests pin specific formula outputs (e.g., `calculateTileClaimCost(50) → 20`). When a formula changes intentionally, these tests break loudly and need updating — that's by design.

Property-based tests verify structural invariants (monotonicity, positivity, linearity) that should hold across any reasonable formula. These survive balance tweaks without modification.

Both layers together: intentional changes break unit tests (forces review), while PBTs catch unintentional structural violations regardless of the formula.

## Unit Test Design

### GridManager Tests

#[[server/logic/GridManager.ts]]

| Test | Function | Input | Expected |
|------|----------|-------|----------|
| 1.1 | `initializeGrid` | (3, 3) | 9 tiles, correct coords, empty owners |
| 1.2 | `getAdjacentTiles` | (1,1) in 3×3 | 4 neighbors |
| 1.3 | `getAdjacentTiles` | (0,0) in 3×3 | 2 neighbors |
| 1.4 | `getAdjacentTiles` | (1,0) in 3×3 | 3 neighbors |
| 1.5 | `getAdjacentTiles` | any position | all neighbors in bounds |
| 1.6 | `isAdjacent` | (1,0) with tile at (0,0) | true |
| 1.7 | `isAdjacent` | (1,1) with tile at (0,0) | false (diagonal) |
| 1.8 | `isAdjacent` | (5,5) with tile at (0,0) | false |
| 1.9 | `calculateGridSize` | 10 | 30 |
| 1.9b | `calculateGridSize` | 1 | ceil(30*sqrt(0.1)) = 10 |
| 1.10 | `assignStartingPositions` | 4 players, 20×20 | 4 positions, all in bounds |

### ConflictEngine Tests

#[[server/logic/ConflictEngine.ts]]

| Test | Function | Input | Expected |
|------|----------|-------|----------|
| 2.1 | `calculateBorderPressure` | (3, 4) | 12 |
| 2.1b | `calculateBorderPressure` | (1, 0) | 0 |
| 2.2 | `calculateTileClaimCost` | 0 | 10 |
| 2.2b | `calculateTileClaimCost` | 50 | 20 |
| 2.2c | `calculateTileClaimCost` | 100 | 30 |
| 2.3 | `calculateUpgradeCost` | 1 | 50 |
| 2.3b | `calculateUpgradeCost` | 10 | 500 |
| 2.4 | `findBorders` | 2×2 grid, top=A, bottom=B | 1 border with correct shared tiles |
| 2.5 | `findBorders` | 2×2 grid, all same owner | empty array |
| 2.6 | `resolveBorder` | A(atk=5) vs B(def=2), 1 tile each | transfer: toId=A, fromId=B, tile ∈ B's shared tiles |
| 2.7 | `resolveBorder` | A(atk=1,def=1) vs B(atk=5,def=1), 1 tile each | transfer: toId=B, fromId=A, tile ∈ A's shared tiles |
| 2.8 | `resolveBorder` | equal stats, equal tiles | null |

### DirectionFilter Tests

#[[src/logic/DirectionFilter.ts]]

| Test | Function | Input | Expected |
|------|----------|-------|----------|
| 3.1 | `filterByDirection` | direction="" | all tiles returned |
| 3.2 | `filterByDirection` | direction="north", centroid at y=5 | only tiles with y<5 |
| 3.3 | `filterByDirection` | direction="south", centroid at y=5 | only tiles with y>5 |
| 3.4 | `filterByDirection` | direction="east", centroid at x=5 | only tiles with x>5 |
| 3.5 | `filterByDirection` | direction="west", centroid at x=5 | only tiles with x<5 |
| 3.6 | `filterByDirection` | empty playerTiles | all tiles returned |
| 3.7 | `filterByDirection` | direction="invalid" | all tiles returned |

## Property-Based Test Design

### ConflictEngine Properties

- **Pressure is non-negative**: For all `attack >= 0` and `borderTileCount >= 0`, `calculateBorderPressure` returns `>= 0`
- **Pressure scales linearly with attack**: Doubling attack doubles pressure (for fixed tile count)
- **Pressure scales linearly with tile count**: Doubling tile count doubles pressure (for fixed attack)
- **Tile claim cost is monotonically non-decreasing**: For `a < b`, `calculateTileClaimCost(a) <= calculateTileClaimCost(b)`
- **Tile claim cost is always >= 10**: The base cost floor holds for any tile count >= 0
- **Upgrade cost is always positive**: For `statValue > 0`, `calculateUpgradeCost` returns `> 0`
- **Upgrade cost is monotonically increasing**: For `a < b`, `calculateUpgradeCost(a) < calculateUpgradeCost(b)`
- **Stalemate symmetry**: When both players have identical stats and equal border tile counts, `resolveBorder` returns `null`

### GridManager Properties

- **Grid tile count**: For all `w > 0, h > 0`, `initializeGrid(w, h).length === w * h`
- **All tiles have valid coordinates**: For all tiles in `initializeGrid(w, h)`, `0 <= x < w` and `0 <= y < h`
- **All tiles start neutral**: For all tiles in `initializeGrid(w, h)`, `ownerId === ""`
- **Adjacent tiles are in bounds**: For all `(x, y)` in a grid, all results from `getAdjacentTiles` satisfy `0 <= nx < w` and `0 <= ny < h`
- **Interior tiles have 4 neighbors**: For `0 < x < w-1` and `0 < y < h-1`, `getAdjacentTiles` returns exactly 4
- **Grid size is positive**: For all `playerCount > 0`, `calculateGridSize(playerCount) > 0`
- **Starting positions are in bounds**: For all player counts and grid sizes, all positions from `assignStartingPositions` are within bounds with margin

### DirectionFilter Properties

- **Filtered tiles are a subset of input**: For any direction and tile sets, every tile in the output exists in the input `claimableTiles` array
- **North constraint**: For direction "north" with non-empty player tiles, all returned tiles have `y < centroidY`
- **South constraint**: For direction "south" with non-empty player tiles, all returned tiles have `y > centroidY`
- **East constraint**: For direction "east" with non-empty player tiles, all returned tiles have `x > centroidX`
- **West constraint**: For direction "west" with non-empty player tiles, all returned tiles have `x < centroidX`
- **Empty direction is identity**: For direction "", the output equals the input `claimableTiles` array
