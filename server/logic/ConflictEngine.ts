import { Tile } from "../state/GameState";
import { getAdjacentTiles } from "./GridManager";

/**
 * Describes a border between two opposing players, including
 * which tiles each player has along that shared border.
 */
export interface BorderInfo {
  playerAId: string;
  playerBId: string;
  sharedTilesA: Tile[]; // A's tiles on the border
  sharedTilesB: Tile[]; // B's tiles on the border
}

/**
 * Describes a single tile transfer resulting from border conflict resolution.
 */
export interface TileTransfer {
  tile: Tile;      // the tile being transferred
  fromId: string;  // previous owner
  toId: string;    // new owner
}

/**
 * Finds all borders between opposing players on the grid.
 *
 * A border exists when two orthogonally adjacent tiles belong to different
 * non-empty owners. Borders are grouped by player pair so each unique
 * (playerA, playerB) pair appears at most once.
 */
export function findBorders(
  tiles: Tile[],
  gridWidth: number,
  gridHeight: number
): BorderInfo[] {
  // Build a 2D lookup: [y][x] → Tile
  const grid: (Tile | null)[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    grid[y] = new Array(gridWidth).fill(null);
  }
  for (const tile of tiles) {
    grid[tile.y][tile.x] = tile;
  }

  // Map keyed by "pA::pB" (sorted ids) → { tilesA: Set<Tile>, tilesB: Set<Tile> }
  const borderMap = new Map<string, { playerAId: string; playerBId: string; tilesA: Set<Tile>; tilesB: Set<Tile> }>();

  for (const tile of tiles) {
    if (tile.ownerId === "") continue;

    const neighbors = getAdjacentTiles(tile.x, tile.y, gridWidth, gridHeight);
    for (const neighbor of neighbors) {
      const neighborTile = grid[neighbor.y][neighbor.x];
      if (!neighborTile || neighborTile.ownerId === "" || neighborTile.ownerId === tile.ownerId) {
        continue;
      }

      // Two adjacent tiles with different non-empty owners → border
      const [idA, idB] = [tile.ownerId, neighborTile.ownerId].sort();
      const key = `${idA}::${idB}`;

      if (!borderMap.has(key)) {
        borderMap.set(key, {
          playerAId: idA,
          playerBId: idB,
          tilesA: new Set<Tile>(),
          tilesB: new Set<Tile>(),
        });
      }

      const entry = borderMap.get(key)!;
      if (tile.ownerId === idA) {
        entry.tilesA.add(tile);
      } else {
        entry.tilesB.add(tile);
      }
    }
  }

  const borders: BorderInfo[] = [];
  for (const entry of borderMap.values()) {
    borders.push({
      playerAId: entry.playerAId,
      playerBId: entry.playerBId,
      sharedTilesA: Array.from(entry.tilesA),
      sharedTilesB: Array.from(entry.tilesB),
    });
  }

  return borders;
}

/**
 * Calculates attack pressure (damage per battle tick).
 * Pressure = factories + floor(attackBots / activeBattles).
 * Minimum 1 if the player has any factories or bots.
 */
export function calculateAttackPressure(
  factories: number,
  attackBots: number,
  activeBattles: number = 1
): number {
  const battles = Math.max(1, activeBattles);
  return factories + Math.floor(attackBots / battles);
}

/**
 * Resolves a border conflict between two players.
 *
 * Compares A's pressure ((5 × factories) + (5 × attack bots)) against
 * B's defense (sum of per-tile defense across B's border tiles), and vice versa.
 *
 * If A's pressure > B's defense strength, one of B's border tiles transfers to A.
 * If B's pressure > A's defense strength, one of A's border tiles transfers to B.
 * If equal (stalemate), returns null.
 */
export function resolveBorder(
  border: BorderInfo,
  playerA: { attack: number; defense: number },
  playerB: { attack: number; defense: number },
  tileDefenseMap?: Map<string, number>,
  pressureOverrides?: { pressureA: number; pressureB: number }
): TileTransfer | null {
  const pressureA = pressureOverrides?.pressureA ?? (playerA.attack * border.sharedTilesA.length);

  // Sum per-tile defense for B's border tiles
  let defenseB: number;
  if (tileDefenseMap) {
    defenseB = border.sharedTilesB.reduce((sum, t) => {
      return sum + (tileDefenseMap.get(`${t.x},${t.y}`) ?? 0);
    }, 0);
  } else {
    defenseB = playerB.defense * border.sharedTilesB.length;
  }

  const pressureB = pressureOverrides?.pressureB ?? (playerB.attack * border.sharedTilesB.length);

  let defenseA: number;
  if (tileDefenseMap) {
    defenseA = border.sharedTilesA.reduce((sum, t) => {
      return sum + (tileDefenseMap.get(`${t.x},${t.y}`) ?? 0);
    }, 0);
  } else {
    defenseA = playerA.defense * border.sharedTilesA.length;
  }

  if (pressureA > defenseB) {
    // A overpowers B — transfer one of B's border tiles to A (pick the weakest)
    let weakestTile = border.sharedTilesB[0];
    if (tileDefenseMap) {
      let weakestDef = Infinity;
      for (const t of border.sharedTilesB) {
        const d = tileDefenseMap.get(`${t.x},${t.y}`) ?? 0;
        if (d < weakestDef) {
          weakestDef = d;
          weakestTile = t;
        }
      }
    }
    return {
      tile: weakestTile,
      fromId: border.playerBId,
      toId: border.playerAId,
    };
  }

  if (pressureB > defenseA) {
    // B overpowers A — transfer one of A's border tiles to B (pick the weakest)
    let weakestTile = border.sharedTilesA[0];
    if (tileDefenseMap) {
      let weakestDef = Infinity;
      for (const t of border.sharedTilesA) {
        const d = tileDefenseMap.get(`${t.x},${t.y}`) ?? 0;
        if (d < weakestDef) {
          weakestDef = d;
          weakestTile = t;
        }
      }
    }
    return {
      tile: weakestTile,
      fromId: border.playerAId,
      toId: border.playerBId,
    };
  }

  // Stalemate
  return null;
}

/**
 * Calculates the cost to claim a new tile.
 * Formula: floor(10 * (1 + 0.02 * currentTileCount))
 */
export function calculateTileClaimCost(currentTileCount: number): number {
  return Math.floor(10 * (1 + 0.02 * currentTileCount));
}

/**
 * Calculates the cost to upgrade a stat (attack or defense).
 * Formula: 50 + (5 × currentStatValue)
 */
export function calculateUpgradeCost(currentStatValue: number): number {
  return 50 + (5 * currentStatValue);
}
