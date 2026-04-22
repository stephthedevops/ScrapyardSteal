import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { spawnNewGears } from "../../server/logic/GridManager";

/**
 * Generator for a single tile-like object with ownerId, isSpawn, hasGear fields.
 */
const tileArb = fc.record({
  ownerId: fc.oneof(fc.constant(""), fc.constant("player1"), fc.constant("player2")),
  isSpawn: fc.boolean(),
  hasGear: fc.boolean(),
});

/**
 * Generator for a grid of tiles (1–100 tiles).
 */
const gridArb = fc.array(tileArb, { minLength: 1, maxLength: 100 });

/**
 * Generator for active player count (1–10).
 */
const playerCountArb = fc.integer({ min: 1, max: 10 });

describe("Feature: v05-server-config-ai-hints, Property 1: Gear spawn correctness", () => {
  /**
   * Property 1: Gear spawn correctness
   *
   * For any grid state where no unclaimed gear tiles exist, and there are
   * N active players, calling spawnNewGears should produce exactly N new
   * gear tile indices (or fewer if not enough valid tiles), each placed on
   * an unclaimed tile where isSpawn === false and hasGear === false.
   *
   * **Validates: Requirements 1.1, 1.3, 1.4**
   */
  it("returned indices are valid: within bounds, pointing to unclaimed non-spawn non-gear tiles", () => {
    fc.assert(
      fc.property(gridArb, playerCountArb, (tiles, activePlayerCount) => {
        const result = spawnNewGears(tiles, activePlayerCount);

        for (const idx of result) {
          // Index must be within bounds
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(tiles.length);

          const tile = tiles[idx];
          // Must be unclaimed
          expect(tile.ownerId).toBe("");
          // Must not be a spawn tile
          expect(tile.isSpawn).toBe(false);
          // Must not already have a gear
          expect(tile.hasGear).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("returned count equals min(activePlayerCount, availableCandidates)", () => {
    fc.assert(
      fc.property(gridArb, playerCountArb, (tiles, activePlayerCount) => {
        // Count available candidates: unclaimed, not spawn, no gear
        const availableCandidates = tiles.filter(
          (t) => t.ownerId === "" && !t.isSpawn && !t.hasGear
        ).length;

        const result = spawnNewGears(tiles, activePlayerCount);
        const expectedCount = Math.min(activePlayerCount, availableCandidates);

        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it("returned indices contain no duplicates", () => {
    fc.assert(
      fc.property(gridArb, playerCountArb, (tiles, activePlayerCount) => {
        const result = spawnNewGears(tiles, activePlayerCount);

        const unique = new Set(result);
        expect(unique.size).toBe(result.length);
      }),
      { numRuns: 100 }
    );
  });
});
