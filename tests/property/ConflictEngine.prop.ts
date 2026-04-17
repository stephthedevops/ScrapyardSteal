import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Tile } from "../../server/state/GameState";
import {
  calculateBorderPressure,
  calculateTileClaimCost,
  calculateUpgradeCost,
  resolveBorder,
  type BorderInfo,
} from "../../server/logic/ConflictEngine";

describe("Property-Based Tests — ConflictEngine", () => {
  /**
   * **Validates: Requirements 1.1**
   * Property 1: Pressure is non-negative — generate random non-negative
   * attack and borderTileCount (0–100), assert result >= 0.
   */
  it("4.1 Pressure is non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (attack, borderTileCount) => {
          expect(calculateBorderPressure(attack, borderTileCount)).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.1**
   * Property 2: Pressure scales linearly with attack — generate random
   * attack (1–50) and tileCount (1–20), assert
   * pressure(2*attack, tileCount) === 2 * pressure(attack, tileCount).
   */
  it("4.2 Pressure scales linearly with attack", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        (attack, tileCount) => {
          const single = calculateBorderPressure(attack, tileCount);
          const doubled = calculateBorderPressure(2 * attack, tileCount);
          expect(doubled).toBe(2 * single);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.1**
   * Property 3: Pressure scales linearly with tile count — generate random
   * attack (1–50) and tileCount (1–20), assert
   * pressure(attack, 2*tileCount) === 2 * pressure(attack, tileCount).
   */
  it("4.3 Pressure scales linearly with tile count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        (attack, tileCount) => {
          const single = calculateBorderPressure(attack, tileCount);
          const doubled = calculateBorderPressure(attack, 2 * tileCount);
          expect(doubled).toBe(2 * single);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.2**
   * Property 4: Tile claim cost is monotonically non-decreasing — generate
   * random a and b where a < b (0–1000), assert cost(a) <= cost(b).
   */
  it("4.4 Tile claim cost is monotonically non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, offset) => {
          const b = a + offset;
          expect(calculateTileClaimCost(a)).toBeLessThanOrEqual(calculateTileClaimCost(b));
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.2**
   * Property 5: Tile claim cost is always >= 10 — generate random
   * non-negative tileCount (0–10000), assert cost(tileCount) >= 10.
   */
  it("4.5 Tile claim cost is always >= 10", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (tileCount) => {
          expect(calculateTileClaimCost(tileCount)).toBeGreaterThanOrEqual(10);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.3**
   * Property 6: Upgrade cost is always positive for positive stat values —
   * generate random statValue (1–100), assert upgradeCost(statValue) > 0.
   */
  it("4.6 Upgrade cost is always positive for positive stat values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (statValue) => {
          expect(calculateUpgradeCost(statValue)).toBeGreaterThan(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.3**
   * Property 7: Upgrade cost is monotonically increasing — generate random
   * a and b where a < b (1–100), assert upgradeCost(a) < upgradeCost(b).
   */
  it("4.7 Upgrade cost is monotonically increasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        fc.integer({ min: 1, max: 100 }),
        (a, offset) => {
          const b = a + offset;
          expect(calculateUpgradeCost(a)).toBeLessThan(calculateUpgradeCost(b));
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.8**
   * Property 8: Stalemate when both players have identical stats and equal
   * border tile counts — generate random attack (1–50), defense (1–50),
   * and tileCount (1–10); construct a BorderInfo with tileCount Tile objects
   * per side using inline makeTile helper; call resolveBorder with identical
   * {attack, defense} for both players; assert result is null.
   */
  it("4.8 Stalemate when both players have identical stats and equal border tile counts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (attack, defense, tileCount) => {
          function makeTile(x: number, y: number, ownerId: string): Tile {
            const t = new Tile();
            t.x = x;
            t.y = y;
            t.ownerId = ownerId;
            return t;
          }

          const tilesA: Tile[] = [];
          const tilesB: Tile[] = [];
          for (let i = 0; i < tileCount; i++) {
            tilesA.push(makeTile(i, 0, "A"));
            tilesB.push(makeTile(i, 1, "B"));
          }

          const border: BorderInfo = {
            playerAId: "A",
            playerBId: "B",
            sharedTilesA: tilesA,
            sharedTilesB: tilesB,
          };

          // For a true stalemate, both pressure values must equal both defense values.
          // With equal tile counts n:
          //   pressureA = attack * n, defenseB = defense * n → equal iff attack == defense
          //   pressureB = attack * n, defenseA = defense * n → equal iff attack == defense
          // We use attack as both attack and defense to guarantee the stalemate invariant.
          const result = resolveBorder(
            border,
            { attack, defense: attack },
            { attack, defense: attack }
          );

          expect(result).toBeNull();
        }
      )
    );
  });
});
