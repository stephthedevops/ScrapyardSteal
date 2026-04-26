import { Tile } from "../state/GameState";
import {
  GRID_SIZE_MIN,
  GRID_SIZE_MAX,
  GRID_SIZE_OFFSET,
  SPAWN_MARGIN,
} from "../config/gameConfig";

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
  // Radius: place players close to edges but at least 2 tiles in
  const margin = SPAWN_MARGIN;
  const radius = Math.floor(Math.min(gridWidth, gridHeight) / 2) - margin;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2; // start from top
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));

    // Clamp: at least 2 from edge, within bounds
    const clampedX = Math.max(margin, Math.min(gridWidth - 1 - margin, x));
    const clampedY = Math.max(margin, Math.min(gridHeight - 1 - margin, y));

    result.set(playerIds[i], { x: clampedX, y: clampedY });
  }

  return result;
}

/**
 * Calculates the grid size (both width and height) for a given player count.
 * Formula: 10 + playerCount, clamped to [12, 20].
 */
export function calculateGridSize(playerCount: number): number {
  return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, GRID_SIZE_OFFSET + playerCount));
}

/**
 * Pure function: selects random unclaimed, non-spawn tiles without existing gears
 * to become new gear tiles. Returns the indices into the tiles array.
 *
 * @param tiles - The flat array of Tile objects representing the grid
 * @param activePlayerCount - Number of active (non-absorbed) players; determines how many gears to spawn
 * @returns Array of tile indices to convert to gears
 */
export function spawnNewGears(
  tiles: { ownerId: string; isSpawn: boolean; hasGear: boolean }[],
  activePlayerCount: number
): number[] {
  // Find all valid candidate indices: unclaimed, not spawn, no existing gear
  const candidates: number[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.ownerId === "" && !t.isSpawn && !t.hasGear) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) return [];

  // Shuffle candidates using Fisher-Yates and pick up to activePlayerCount
  const count = Math.min(activePlayerCount, candidates.length);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count);
}
