import { describe, it, expect } from "vitest";
import { Tile } from "../../../server/state/GameState";
import {
  initializeGrid,
  getAdjacentTiles,
  isAdjacent,
  calculateGridSize,
  assignStartingPositions,
} from "../../../server/logic/GridManager";

function makeTile(x: number, y: number, ownerId = ""): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  return t;
}

describe("initializeGrid", () => {
  it("1.1 returns correct tile count with valid coordinates and empty owners", () => {
    const tiles = initializeGrid(3, 3);
    expect(tiles).toHaveLength(9);

    const coords = tiles.map((t) => ({ x: t.x, y: t.y }));
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(coords).toContainEqual({ x, y });
      }
    }

    for (const tile of tiles) {
      expect(tile.ownerId).toBe("");
    }
  });
});

describe("getAdjacentTiles", () => {
  it("1.2 returns 4 neighbors for an interior tile", () => {
    const neighbors = getAdjacentTiles(1, 1, 3, 3);
    expect(neighbors).toHaveLength(4);
  });

  it("1.3 returns 2 neighbors for a corner tile", () => {
    const neighbors = getAdjacentTiles(0, 0, 3, 3);
    expect(neighbors).toHaveLength(2);
  });

  it("1.4 returns 3 neighbors for an edge (non-corner) tile", () => {
    const neighbors = getAdjacentTiles(1, 0, 3, 3);
    expect(neighbors).toHaveLength(3);
  });

  it("1.5 returns only in-bounds neighbors", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    for (const pos of positions) {
      const neighbors = getAdjacentTiles(pos.x, pos.y, 3, 3);
      for (const n of neighbors) {
        expect(n.x).toBeGreaterThanOrEqual(0);
        expect(n.x).toBeLessThan(3);
        expect(n.y).toBeGreaterThanOrEqual(0);
        expect(n.y).toBeLessThan(3);
      }
    }
  });
});

describe("isAdjacent", () => {
  it("1.6 returns true for orthogonally adjacent tiles", () => {
    const playerTiles = [makeTile(0, 0)];
    expect(isAdjacent(1, 0, playerTiles)).toBe(true);
    expect(isAdjacent(0, 1, playerTiles)).toBe(true);
  });

  it("1.7 returns false for diagonally adjacent tiles", () => {
    const playerTiles = [makeTile(0, 0)];
    expect(isAdjacent(1, 1, playerTiles)).toBe(false);
  });

  it("1.8 returns false for non-adjacent tiles", () => {
    const playerTiles = [makeTile(0, 0)];
    expect(isAdjacent(5, 5, playerTiles)).toBe(false);
  });
});

describe("calculateGridSize", () => {
  it("1.9 returns ceil(30 * sqrt(playerCount / 10)) for several values", () => {
    // playerCount=10 → ceil(30 * sqrt(1)) = 30
    expect(calculateGridSize(10)).toBe(30);
    // playerCount=1 → ceil(30 * sqrt(0.1)) = ceil(9.4868...) = 10
    expect(calculateGridSize(1)).toBe(10);
    // playerCount=40 → ceil(30 * sqrt(4)) = ceil(60) = 60
    expect(calculateGridSize(40)).toBe(60);
    // playerCount=5 → ceil(30 * sqrt(0.5)) = ceil(21.213...) = 22
    expect(calculateGridSize(5)).toBe(22);
  });
});

describe("assignStartingPositions", () => {
  it("1.10 returns one position per player, all within grid bounds", () => {
    const playerIds = ["p1", "p2", "p3", "p4"];
    const gridWidth = 20;
    const gridHeight = 20;
    const positions = assignStartingPositions(playerIds, gridWidth, gridHeight, 5);

    expect(positions.size).toBe(4);

    for (const [id, pos] of positions) {
      expect(playerIds).toContain(id);
      expect(pos.x).toBeGreaterThanOrEqual(2);
      expect(pos.x).toBeLessThanOrEqual(gridWidth - 3);
      expect(pos.y).toBeGreaterThanOrEqual(2);
      expect(pos.y).toBeLessThanOrEqual(gridHeight - 3);
    }
  });
});
