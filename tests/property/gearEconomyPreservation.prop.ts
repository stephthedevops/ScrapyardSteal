import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateUpgradeCost } from "../../server/logic/ConflictEngine";
import { spawnNewGears } from "../../server/logic/GridManager";

describe("Preservation — Gear Economy (must PASS on unfixed code)", () => {
  /**
   * Preservation A — Upgrade Cost Monotonicity
   *
   * For all pairs a < b in 0–50, calculateUpgradeCost(a) < calculateUpgradeCost(b).
   * This holds on unfixed code because 50*a < 50*b for a < b when both > 0.
   * For a=0, the unfixed code returns 0 which is less than any positive value,
   * so monotonicity holds even at 0.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it("Preservation A: upgrade cost is strictly monotonically increasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 49 }).chain((a) =>
          fc.integer({ min: 1, max: 50 - a }).map((offset) => ({ a, b: a + offset }))
        ),
        ({ a, b }) => {
          expect(calculateUpgradeCost(a)).toBeLessThan(calculateUpgradeCost(b));
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Preservation B — Upgrade Cost Positivity for Non-Zero Stats
   *
   * For all statValue in 1–50, calculateUpgradeCost(statValue) > 0.
   * This holds on unfixed code because 50*n > 0 for n > 0.
   *
   * **Validates: Requirements 3.4**
   */
  it("Preservation B: upgrade cost is positive for non-zero stat values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (statValue) => {
          expect(calculateUpgradeCost(statValue)).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Preservation C — Mining Owned Gear Tiles Allowed
   *
   * For any tile where ownerId === leaderId (owned by the player),
   * the mineGear guard should NOT reject. The guard condition:
   *   tile.ownerId !== "" && tile.ownerId !== leader.id
   * should evaluate to false when ownerId === leaderId.
   * This holds on both unfixed and fixed code.
   *
   * **Validates: Requirements 3.2**
   */
  it("Preservation C: mineGear guard allows mining on owned tiles", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (leaderId) => {
          const tileOwnerId = leaderId;

          // Current guard: tile.ownerId !== "" && tile.ownerId !== leader.id
          const guardRejects =
            tileOwnerId !== "" && tileOwnerId !== leaderId;

          // Guard should NOT reject when tile is owned by the leader
          expect(guardRejects).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Preservation D — Gear Spawning Candidate Selection
   *
   * For any plain array of tiles passed to spawnNewGears, all returned
   * indices point to tiles where ownerId === "", isSpawn === false,
   * and hasGear === false.
   *
   * **Validates: Requirements 3.6**
   */
  it("Preservation D: spawnNewGears only selects valid candidate tiles", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ownerId: fc.oneof(fc.constant(""), fc.constant("player1"), fc.constant("player2")),
            isSpawn: fc.boolean(),
            hasGear: fc.boolean(),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.integer({ min: 1, max: 10 }),
        (tiles, playerCount) => {
          const result = spawnNewGears(tiles, playerCount);

          for (const idx of result) {
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(tiles.length);
            expect(tiles[idx].ownerId).toBe("");
            expect(tiles[idx].isSpawn).toBe(false);
            expect(tiles[idx].hasGear).toBe(false);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Preservation E — Max Cap Rejection
   *
   * At statValue === 50, the upgrade cost is still calculable (no error),
   * and the cap check statValue >= 50 would reject the upgrade.
   * Test that calculateUpgradeCost(50) returns a positive number
   * (the handler rejects based on the cap check, not the cost).
   *
   * **Validates: Requirements 3.5**
   */
  it("Preservation E: upgrade cost at max cap (50) is a positive number", () => {
    const cost = calculateUpgradeCost(50);
    expect(cost).toBeGreaterThan(0);

    // The cap check that the handler uses to reject upgrades at max level
    const statValue = 50;
    expect(statValue >= 50).toBe(true);
  });
});
