import { describe, it, expect } from "vitest";
import { filterByDirection } from "../../../src/logic/DirectionFilter";

describe("filterByDirection", () => {
  // Shared fixtures: playerTiles with centroid at (5, 5)
  const playerTiles = [
    { x: 4, y: 4 },
    { x: 6, y: 6 },
  ];
  // centroidX = (4+6)/2 = 5, centroidY = (4+6)/2 = 5

  const claimableTiles = [
    { x: 5, y: 2 }, // north of centroid
    { x: 5, y: 8 }, // south of centroid
    { x: 8, y: 5 }, // east of centroid
    { x: 2, y: 5 }, // west of centroid
    { x: 5, y: 5 }, // exactly at centroid
  ];

  it("5.1 empty direction returns all claimable tiles", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "");
    expect(result).toEqual(claimableTiles);
  });

  it("5.2 'north' returns only tiles with y < centroid y", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "north");
    expect(result).toEqual([{ x: 5, y: 2 }]);
    for (const tile of result) {
      expect(tile.y).toBeLessThan(5);
    }
  });

  it("5.3 'south' returns only tiles with y > centroid y", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "south");
    expect(result).toEqual([{ x: 5, y: 8 }]);
    for (const tile of result) {
      expect(tile.y).toBeGreaterThan(5);
    }
  });

  it("5.4 'east' returns only tiles with x > centroid x", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "east");
    expect(result).toEqual([{ x: 8, y: 5 }]);
    for (const tile of result) {
      expect(tile.x).toBeGreaterThan(5);
    }
  });

  it("5.5 'west' returns only tiles with x < centroid x", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "west");
    expect(result).toEqual([{ x: 2, y: 5 }]);
    for (const tile of result) {
      expect(tile.x).toBeLessThan(5);
    }
  });

  it("5.6 empty playerTiles returns all claimable tiles", () => {
    const result = filterByDirection(claimableTiles, [], "north");
    expect(result).toEqual(claimableTiles);
  });

  it("5.7 unrecognized direction returns all claimable tiles", () => {
    const result = filterByDirection(claimableTiles, playerTiles, "northeast");
    expect(result).toEqual(claimableTiles);
  });
});
