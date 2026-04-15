import { Tile } from "../state/GameState";

/**
 * Creates a flat array of width×height neutral tiles with x,y coordinates.
 */
export function initializeGrid(width: number, height: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = new Tile();
      tile.x = x;
      tile.y = y;
      tile.ownerId = "";
      tiles.push(tile);
    }
  }
  return tiles;
}

/**
 * Returns orthogonal neighbors (up/down/left/right) of (x, y) that are within grid bounds.
 */
export function getAdjacentTiles(
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number
): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x < gridWidth - 1) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y < gridHeight - 1) neighbors.push({ x, y: y + 1 });
  return neighbors;
}

/**
 * Checks if the tile at (tileX, tileY) is orthogonally adjacent to any tile in playerTiles.
 */
export function isAdjacent(
  tileX: number,
  tileY: number,
  playerTiles: Tile[]
): boolean {
  for (const pt of playerTiles) {
    const dx = Math.abs(tileX - pt.x);
    const dy = Math.abs(tileY - pt.y);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Assigns starting positions for players on the grid such that every pair
 * of starting positions has a Manhattan distance >= minDistance.
 *
 * Uses a greedy approach: shuffle candidate positions and pick the first
 * valid one for each player.
 */
export function assignStartingPositions(
  playerIds: string[],
  gridWidth: number,
  gridHeight: number,
  minDistance: number
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  // Build candidate positions (all grid cells)
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      candidates.push({ x, y });
    }
  }

  // Shuffle candidates for randomness
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const chosen: { x: number; y: number }[] = [];

  for (const playerId of playerIds) {
    let placed = false;
    for (const candidate of candidates) {
      const valid = chosen.every(
        (pos) =>
          Math.abs(candidate.x - pos.x) + Math.abs(candidate.y - pos.y) >=
          minDistance
      );
      if (valid) {
        result.set(playerId, { x: candidate.x, y: candidate.y });
        chosen.push(candidate);
        placed = true;
        break;
      }
    }
    if (!placed) {
      throw new Error(
        `Could not place player ${playerId} with minDistance=${minDistance} on a ${gridWidth}x${gridHeight} grid`
      );
    }
  }

  return result;
}

/**
 * Calculates the grid size (both width and height) for a given player count.
 * Formula: ceil(30 * sqrt(playerCount / 10))
 */
export function calculateGridSize(playerCount: number): number {
  return Math.ceil(30 * Math.sqrt(playerCount / 10));
}
