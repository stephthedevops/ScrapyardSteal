import { describe, it, expect } from "vitest";
import { Tile } from "../../../server/state/GameState";
import {
  calculateBorderPressure,
  calculateTileClaimCost,
  calculateUpgradeCost,
  findBorders,
  resolveBorder,
  type BorderInfo,
} from "../../../server/logic/ConflictEngine";

/**
 * Inline helper to create Tile fixtures with specific x, y, and ownerId.
 */
function makeTile(x: number, y: number, ownerId = ""): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  return t;
}

describe("calculateBorderPressure", () => {
  /**
   * **Validates: Requirements 1.1**
   */
  it("3.1 returns attack * borderTileCount for several input pairs", () => {
    expect(calculateBorderPressure(3, 4)).toBe(12);
    expect(calculateBorderPressure(1, 0)).toBe(0);
    expect(calculateBorderPressure(0, 5)).toBe(0);
    expect(calculateBorderPressure(10, 10)).toBe(100);
    expect(calculateBorderPressure(7, 3)).toBe(21);
  });
});

describe("calculateTileClaimCost", () => {
  /**
   * **Validates: Requirements 1.2**
   */
  it("3.2 returns floor(10 * (1 + 0.02 * currentTileCount)) for 0, 50, and 100 tiles", () => {
    // 0 tiles: floor(10 * (1 + 0)) = 10
    expect(calculateTileClaimCost(0)).toBe(10);
    // 50 tiles: floor(10 * (1 + 1)) = 20
    expect(calculateTileClaimCost(50)).toBe(20);
    // 100 tiles: floor(10 * (1 + 2)) = 30
    expect(calculateTileClaimCost(100)).toBe(30);
  });
});

describe("calculateUpgradeCost", () => {
  /**
   * **Validates: Requirements 1.3**
   */
  it("3.3 returns 50 * currentStatValue for values 1 and 10", () => {
    expect(calculateUpgradeCost(1)).toBe(50);
    expect(calculateUpgradeCost(10)).toBe(500);
  });
});

describe("findBorders", () => {
  /**
   * **Validates: Requirements 1.4**
   */
  it("3.4 detects a border between two players on a 2x2 grid", () => {
    // 2x2 grid: top row owned by A, bottom row owned by B
    //  A A
    //  B B
    const tiles = [
      makeTile(0, 0, "A"),
      makeTile(1, 0, "A"),
      makeTile(0, 1, "B"),
      makeTile(1, 1, "B"),
    ];

    const borders = findBorders(tiles, 2, 2);
    expect(borders).toHaveLength(1);

    const border = borders[0];
    // Player IDs are sorted, so A comes first
    expect(border.playerAId).toBe("A");
    expect(border.playerBId).toBe("B");
    // Both A tiles border B tiles, and vice versa
    expect(border.sharedTilesA.length).toBeGreaterThanOrEqual(1);
    expect(border.sharedTilesB.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * **Validates: Requirements 1.5**
   */
  it("3.5 returns empty array when no opposing adjacent tiles exist", () => {
    // 2x2 grid: all owned by same player
    const tiles = [
      makeTile(0, 0, "A"),
      makeTile(1, 0, "A"),
      makeTile(0, 1, "A"),
      makeTile(1, 1, "A"),
    ];

    const borders = findBorders(tiles, 2, 2);
    expect(borders).toHaveLength(0);
  });

  it("3.5b returns empty array when all tiles are unowned", () => {
    const tiles = [
      makeTile(0, 0),
      makeTile(1, 0),
      makeTile(0, 1),
      makeTile(1, 1),
    ];

    const borders = findBorders(tiles, 2, 2);
    expect(borders).toHaveLength(0);
  });
});

describe("resolveBorder", () => {
  /**
   * **Validates: Requirements 1.6**
   */
  it("3.6 returns transfer toId=A, fromId=B when A's pressure exceeds B's defense", () => {
    const tileA = makeTile(0, 0, "A");
    const tileB = makeTile(1, 0, "B");

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: [tileA],
      sharedTilesB: [tileB],
    };

    // A: attack=5, defense=1; B: attack=1, defense=2
    // pressureA = 5 * 1 = 5, defenseB = 2 * 1 = 2 → A wins
    const result = resolveBorder(border, { attack: 5, defense: 1 }, { attack: 1, defense: 2 });

    expect(result).not.toBeNull();
    expect(result!.toId).toBe("A");
    expect(result!.fromId).toBe("B");
    // tile should be from B's shared tiles
    expect(border.sharedTilesB).toContain(result!.tile);
  });

  /**
   * **Validates: Requirements 1.7**
   */
  it("3.7 returns transfer toId=B, fromId=A when B's pressure exceeds A's defense", () => {
    const tileA = makeTile(0, 0, "A");
    const tileB = makeTile(1, 0, "B");

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: [tileA],
      sharedTilesB: [tileB],
    };

    // A: attack=1, defense=1; B: attack=5, defense=1
    // pressureB = 5 * 1 = 5, defenseA = 1 * 1 = 1 → B wins
    const result = resolveBorder(border, { attack: 1, defense: 1 }, { attack: 5, defense: 1 });

    expect(result).not.toBeNull();
    expect(result!.toId).toBe("B");
    expect(result!.fromId).toBe("A");
    // tile should be from A's shared tiles
    expect(border.sharedTilesA).toContain(result!.tile);
  });

  /**
   * **Validates: Requirements 1.8**
   */
  it("3.8 returns null on stalemate (equal stats and tile counts)", () => {
    const tileA = makeTile(0, 0, "A");
    const tileB = makeTile(1, 0, "B");

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: [tileA],
      sharedTilesB: [tileB],
    };

    // Equal stats: attack=3, defense=3 for both
    // pressureA = 3*1 = 3, defenseB = 3*1 = 3 → stalemate
    // pressureB = 3*1 = 3, defenseA = 3*1 = 3 → stalemate
    const result = resolveBorder(border, { attack: 3, defense: 3 }, { attack: 3, defense: 3 });

    expect(result).toBeNull();
  });
});
