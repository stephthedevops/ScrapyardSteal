import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterByDirection } from "../../src/logic/DirectionFilter";

// --- Generators ---

/** Arbitrary {x, y} tile with integer coordinates in a reasonable range. */
const tileArb = fc.record({
  x: fc.integer({ min: -100, max: 100 }),
  y: fc.integer({ min: -100, max: 100 }),
});

/** Non-empty array of tiles (for playerTiles that need a centroid). */
const nonEmptyTilesArb = fc.array(tileArb, { minLength: 1, maxLength: 30 });

/** Array of tiles (may be empty, for claimableTiles). */
const tilesArb = fc.array(tileArb, { minLength: 0, maxLength: 30 });

/** One of the four cardinal directions or empty string. */
const directionArb = fc.constantFrom("north", "south", "east", "west", "");

// --- Helpers ---

function centroid(tiles: { x: number; y: number }[]) {
  const cx = tiles.reduce((s, t) => s + t.x, 0) / tiles.length;
  const cy = tiles.reduce((s, t) => s + t.y, 0) / tiles.length;
  return { cx, cy };
}

describe("Property-Based Tests — DirectionFilter", () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   * Property 1: Filtered tiles are always a subset of input claimableTiles.
   * For any direction and tile sets, every tile in the output exists in the input.
   */
  it("Property 1: Filtered tiles are always a subset of input tiles", () => {
    fc.assert(
      fc.property(tilesArb, tilesArb, directionArb, (claimable, player, dir) => {
        const result = filterByDirection(claimable, player, dir);
        for (const tile of result) {
          expect(claimable).toContainEqual(tile);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.2**
   * Property 2: All "north" results have y < centroid y.
   * For non-empty playerTiles, every returned tile satisfies y < centroidY.
   */
  it('Property 2: All "north" results have y < centroid y', () => {
    fc.assert(
      fc.property(tilesArb, nonEmptyTilesArb, (claimable, player) => {
        const result = filterByDirection(claimable, player, "north");
        const { cy } = centroid(player);
        for (const tile of result) {
          expect(tile.y).toBeLessThan(cy);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   * Property 3: All "south" results have y > centroid y.
   */
  it('Property 3: All "south" results have y > centroid y', () => {
    fc.assert(
      fc.property(tilesArb, nonEmptyTilesArb, (claimable, player) => {
        const result = filterByDirection(claimable, player, "south");
        const { cy } = centroid(player);
        for (const tile of result) {
          expect(tile.y).toBeGreaterThan(cy);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.4**
   * Property 4: All "east" results have x > centroid x.
   */
  it('Property 4: All "east" results have x > centroid x', () => {
    fc.assert(
      fc.property(tilesArb, nonEmptyTilesArb, (claimable, player) => {
        const result = filterByDirection(claimable, player, "east");
        const { cx } = centroid(player);
        for (const tile of result) {
          expect(tile.x).toBeGreaterThan(cx);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.5**
   * Property 5: All "west" results have x < centroid x.
   */
  it('Property 5: All "west" results have x < centroid x', () => {
    fc.assert(
      fc.property(tilesArb, nonEmptyTilesArb, (claimable, player) => {
        const result = filterByDirection(claimable, player, "west");
        const { cx } = centroid(player);
        for (const tile of result) {
          expect(tile.x).toBeLessThan(cx);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * Property 6: Empty direction returns input unchanged.
   * For direction "", the output equals the input claimableTiles array.
   */
  it("Property 6: Empty direction returns input unchanged", () => {
    fc.assert(
      fc.property(tilesArb, tilesArb, (claimable, player) => {
        const result = filterByDirection(claimable, player, "");
        expect(result).toEqual(claimable);
      }),
      { numRuns: 200 }
    );
  });
});
