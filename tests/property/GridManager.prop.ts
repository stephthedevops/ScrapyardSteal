import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  initializeGrid,
  getAdjacentTiles,
  calculateGridSize,
  assignStartingPositions,
} from "../../server/logic/GridManager";

describe("Property-Based Tests — GridManager", () => {
  /**
   * **Validates: Requirements 2.1**
   * Property 1: Grid always has width * height tiles —
   * generate random width/height (1–50), call initializeGrid, assert length equals w * h.
   */
  it("Property 1: Grid always has width * height tiles", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (width, height) => {
          const tiles = initializeGrid(width, height);
          expect(tiles).toHaveLength(width * height);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.1**
   * Property 2: All tiles have valid coordinates —
   * for random grids, assert every tile satisfies 0 <= x < width and 0 <= y < height.
   */
  it("Property 2: All tiles have valid coordinates", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (width, height) => {
          const tiles = initializeGrid(width, height);
          for (const tile of tiles) {
            expect(tile.x).toBeGreaterThanOrEqual(0);
            expect(tile.x).toBeLessThan(width);
            expect(tile.y).toBeGreaterThanOrEqual(0);
            expect(tile.y).toBeLessThan(height);
          }
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.1**
   * Property 3: All tiles start with empty ownerId —
   * for random grids, assert every tile has ownerId === "".
   */
  it("Property 3: All tiles start with empty ownerId", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (width, height) => {
          const tiles = initializeGrid(width, height);
          for (const tile of tiles) {
            expect(tile.ownerId).toBe("");
          }
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.5**
   * Property 4: All adjacent tile results are within grid bounds —
   * generate random (x, y) within random grid dimensions, assert all neighbors
   * satisfy 0 <= nx < width and 0 <= ny < height.
   *
   * Note: x/y are generated as separate property arguments (not fc.sample inside
   * the callback) so fast-check can shrink them independently on failure.
   */
  it("Property 4: All adjacent tile results are within grid bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 49 }),
        fc.integer({ min: 0, max: 49 }),
        (width, height, xRaw, yRaw) => {
          const x = xRaw % width;
          const y = yRaw % height;
          const neighbors = getAdjacentTiles(x, y, width, height);
          for (const n of neighbors) {
            expect(n.x).toBeGreaterThanOrEqual(0);
            expect(n.x).toBeLessThan(width);
            expect(n.y).toBeGreaterThanOrEqual(0);
            expect(n.y).toBeLessThan(height);
          }
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.2**
   * Property 5: Interior tiles always have exactly 4 neighbors —
   * generate random grid (min 3×3) and random interior position
   * (0 < x < w-1, 0 < y < h-1), assert getAdjacentTiles returns exactly 4.
   *
   * Note: x/y are generated as separate property arguments (not fc.sample inside
   * the callback) so fast-check can shrink them independently on failure.
   */
  it("Property 5: Interior tiles always have exactly 4 neighbors", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 50 }),
        fc.integer({ min: 3, max: 50 }),
        fc.integer({ min: 1, max: 48 }),
        fc.integer({ min: 1, max: 48 }),
        (width, height, xRaw, yRaw) => {
          const x = (xRaw % (width - 2)) + 1;
          const y = (yRaw % (height - 2)) + 1;
          const neighbors = getAdjacentTiles(x, y, width, height);
          expect(neighbors).toHaveLength(4);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.9**
   * Property 6: Grid size is always positive for positive player counts —
   * generate random playerCount (1–100), assert calculateGridSize returns > 0.
   */
  it("Property 6: Grid size is always positive for positive player counts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (playerCount) => {
          expect(calculateGridSize(playerCount)).toBeGreaterThan(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.10**
   * Property 7: All starting positions are within grid bounds with margin —
   * generate random player count (1–20), compute grid size, call assignStartingPositions,
   * assert all positions satisfy 2 <= x <= gridWidth - 3 and 2 <= y <= gridHeight - 3.
   */
  it("Property 7: All starting positions are within grid bounds with margin", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (playerCount) => {
          const gridSize = calculateGridSize(playerCount);
          const playerIds = Array.from({ length: playerCount }, (_, i) => `p${i}`);
          const positions = assignStartingPositions(playerIds, gridSize, gridSize, 5);

          expect(positions.size).toBe(playerCount);

          for (const [, pos] of positions) {
            expect(pos.x).toBeGreaterThanOrEqual(2);
            expect(pos.x).toBeLessThanOrEqual(gridSize - 3);
            expect(pos.y).toBeGreaterThanOrEqual(2);
            expect(pos.y).toBeLessThanOrEqual(gridSize - 3);
          }
        }
      )
    );
  });
});
