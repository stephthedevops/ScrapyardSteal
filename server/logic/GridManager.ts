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
 * Assigns starting positions for players equally spaced around a circle
 * centered on the grid. Falls back to greedy placement if circular
 * positions land out of bounds.
 */
export function assignStartingPositions(
  playerIds: string[],
  gridWidth: number,
  gridHeight: number,
  _minDistance: number
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  const count = playerIds.length;

  const centerX = gridWidth / 2;
  const centerY = gridHeight / 2;
  // Radius: 40% of the smaller dimension to keep positions away from edges
  const radius = Math.floor(Math.min(gridWidth, gridHeight) * 0.4);

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2; // start from top
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));

    // Clamp to grid bounds
    const clampedX = Math.max(0, Math.min(gridWidth - 1, x));
    const clampedY = Math.max(0, Math.min(gridHeight - 1, y));

    result.set(playerIds[i], { x: clampedX, y: clampedY });
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
