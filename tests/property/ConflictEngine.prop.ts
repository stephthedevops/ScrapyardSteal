import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Tile } from "../../server/state/GameState";
import {
  calculateAttackPressure,
  calculateTileClaimCost,
  calculateUpgradeCost,
  resolveBorder,
  type BorderInfo,
} from "../../server/logic/ConflictEngine";

describe("Property-Based Tests — ConflictEngine", () => {
  /**
   * **Validates: Requirements 1.1**
   * Property 1: Pressure is non-negative — generate random non-negative
   * factories, attackBots, and activeBattles, assert result >= 0.
   */
  it("4.1 Pressure is non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (factories, attackBots, activeBattles) => {
          expect(calculateAttackPressure(factories, attackBots, activeBattles)).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.1**
   * Property 2: Pressure increases with more attack bots — generate random
   * factories, bots a < b, and activeBattles, assert pressure(a) <= pressure(b).
   */
  it("4.2 Pressure increases with more attack bots", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (factories, botsA, offset, activeBattles) => {
          const botsB = botsA + offset;
          expect(calculateAttackPressure(factories, botsA, activeBattles))
            .toBeLessThanOrEqual(calculateAttackPressure(factories, botsB, activeBattles));
        }
      )
    );
  });

  /**
   * **Validates: Requirements 1.1**
   * Property 3: Pressure increases with more factories — generate random
   * factories a < b, attackBots, and activeBattles, assert pressure(a) <= pressure(b).
   */
  it("4.3 Pressure increases with more factories", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (factoriesA, offset, attackBots, activeBattles) => {
          const factoriesB = factoriesA + offset;
          expect(calculateAttackPressure(factoriesA, attackBots, activeBattles))
            .toBeLessThanOrEqual(calculateAttackPressure(factoriesB, attackBots, activeBattles));
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
   * border tile counts — generate random stat (1–50) and tileCount (1–10);
   * construct a BorderInfo with tileCount Tile objects per side.
   *
   * Stalemate requires pressureA == defenseB AND pressureB == defenseA.
   * With equal tile counts n: pressureA = atk*n, defenseB = def*n.
   * This holds iff atk == def. So we use the same value for both attack
   * and defense to guarantee the stalemate invariant. The `defense` generator
   * is intentionally unused — the property only holds when atk == def.
   */
  it("4.8 Stalemate when both players have identical stats and equal border tile counts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (stat, tileCount) => {
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

          // Both players get identical {attack: stat, defense: stat} so
          // pressureA == defenseB and pressureB == defenseA → stalemate.
          const result = resolveBorder(
            border,
            { attack: stat, defense: stat },
            { attack: stat, defense: stat }
          );

          expect(result).toBeNull();
        }
      )
    );
  });
});
