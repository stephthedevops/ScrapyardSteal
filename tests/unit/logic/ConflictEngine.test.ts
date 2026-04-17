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

  /**
   * Larger grid: 3×3 with three players forming distinct borders.
   *
   *   A A B
   *   A C B
   *   C C B
   *
   * Expected borders: A-B (column 1↔2 top), A-C (interior), B-C (column 2↔row 2)
   */
  it("3.5c detects multiple borders on a 3×3 grid with 3 players", () => {
    const tiles = [
      makeTile(0, 0, "A"), makeTile(1, 0, "A"), makeTile(2, 0, "B"),
      makeTile(0, 1, "A"), makeTile(1, 1, "C"), makeTile(2, 1, "B"),
      makeTile(0, 2, "C"), makeTile(1, 2, "C"), makeTile(2, 2, "B"),
    ];

    const borders = findBorders(tiles, 3, 3);
    // Should have 3 unique borders: A-B, A-C, B-C
    expect(borders).toHaveLength(3);

    const pairKeys = borders.map((b) => `${b.playerAId}::${b.playerBId}`).sort();
    expect(pairKeys).toEqual(["A::B", "A::C", "B::C"]);
  });

  /**
   * 4×4 grid with L-shaped territory for player A.
   *
   *   A A B B
   *   A . B .
   *   A A . .
   *   . . . .
   *
   * (. = unowned)
   * Only one border: A-B along column 1↔2 (rows 0-1) and row 0 (col 1↔2).
   */
  it("3.5d detects border with L-shaped territory on a 4×4 grid", () => {
    const tiles = [
      makeTile(0, 0, "A"), makeTile(1, 0, "A"), makeTile(2, 0, "B"), makeTile(3, 0, "B"),
      makeTile(0, 1, "A"), makeTile(1, 1, ""),   makeTile(2, 1, "B"), makeTile(3, 1, ""),
      makeTile(0, 2, "A"), makeTile(1, 2, "A"),  makeTile(2, 2, ""),  makeTile(3, 2, ""),
      makeTile(0, 3, ""),  makeTile(1, 3, ""),   makeTile(2, 3, ""),  makeTile(3, 3, ""),
    ];

    const borders = findBorders(tiles, 4, 4);
    expect(borders).toHaveLength(1);
    expect(borders[0].playerAId).toBe("A");
    expect(borders[0].playerBId).toBe("B");
    // A's border tiles: (1,0) is adjacent to (2,0)=B; (0,1) is not adjacent to B
    // B's border tiles: (2,0) is adjacent to (1,0)=A; (2,1) is not adjacent to A
    expect(borders[0].sharedTilesA.length).toBeGreaterThanOrEqual(1);
    expect(borders[0].sharedTilesB.length).toBeGreaterThanOrEqual(1);
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

describe("resolveBorder — edge cases", () => {
  /**
   * Edge case: zero attack and zero defense for both players.
   * pressureA = 0*1 = 0, defenseB = 0*1 = 0 → not greater → no transfer
   * pressureB = 0*1 = 0, defenseA = 0*1 = 0 → not greater → stalemate
   */
  it("3.9 returns null when both players have 0 attack and 0 defense", () => {
    const tileA = makeTile(0, 0, "A");
    const tileB = makeTile(1, 0, "B");

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: [tileA],
      sharedTilesB: [tileB],
    };

    const result = resolveBorder(border, { attack: 0, defense: 0 }, { attack: 0, defense: 0 });
    expect(result).toBeNull();
  });

  /**
   * Edge case: asymmetric tile counts. A has 5 border tiles, B has 1.
   * A: attack=2, defense=1; B: attack=10, defense=2
   * pressureA = 2*5 = 10, defenseB = 2*1 = 2 → A wins (10 > 2)
   * pressureB = 10*1 = 10, defenseA = 1*5 = 5 → B also wins (10 > 5)
   * But A is checked first, so A wins.
   */
  it("3.10 with asymmetric tile counts, first winning condition takes priority", () => {
    const tilesA = [
      makeTile(0, 0, "A"),
      makeTile(1, 0, "A"),
      makeTile(2, 0, "A"),
      makeTile(3, 0, "A"),
      makeTile(4, 0, "A"),
    ];
    const tilesB = [makeTile(0, 1, "B")];

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: tilesA,
      sharedTilesB: tilesB,
    };

    const result = resolveBorder(border, { attack: 2, defense: 1 }, { attack: 10, defense: 2 });
    // A's pressure (2*5=10) > B's defense (2*1=2) → A wins, checked first
    expect(result).not.toBeNull();
    expect(result!.toId).toBe("A");
    expect(result!.fromId).toBe("B");
  });

  /**
   * Edge case: one player has 0 attack, other has positive attack.
   * A: attack=0, defense=5; B: attack=3, defense=1
   * pressureA = 0*1 = 0, defenseB = 1*1 = 1 → 0 > 1 is false
   * pressureB = 3*1 = 3, defenseA = 5*1 = 5 → 3 > 5 is false → stalemate
   */
  it("3.11 zero attack player cannot win even against low defense", () => {
    const tileA = makeTile(0, 0, "A");
    const tileB = makeTile(1, 0, "B");

    const border: BorderInfo = {
      playerAId: "A",
      playerBId: "B",
      sharedTilesA: [tileA],
      sharedTilesB: [tileB],
    };

    const result = resolveBorder(border, { attack: 0, defense: 5 }, { attack: 3, defense: 1 });
    // pressureA=0 not > defenseB=1, pressureB=3 not > defenseA=5 → stalemate
    expect(result).toBeNull();
  });
});
