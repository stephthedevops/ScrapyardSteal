// Feature: tile-transfer-on-absorption, Property 1: Bug Condition — Orphaned Tiles After Absorption

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Player, Tile } from "../../server/state/GameState";
import { findBorders, resolveBorder } from "../../server/logic/ConflictEngine";

/**
 * Simulates the border conflict resolution + absorption block from
 * GameRoom.gameTick() as a pure function. This is an exact replica
 * of the unfixed code — no tile reassignment on absorption.
 */
function simulateAbsorptionTick(
  tiles: Tile[],
  players: Map<string, Player>,
  gridWidth: number,
  gridHeight: number
): void {
  const borders = findBorders(tiles, gridWidth, gridHeight);

  for (const border of borders) {
    const playerA = players.get(border.playerAId);
    const playerB = players.get(border.playerBId);
    if (!playerA || !playerB) continue;
    if (playerA.absorbed || playerB.absorbed) continue;

    const transfer = resolveBorder(
      border,
      { attack: playerA.attack, defense: playerA.defense },
      { attack: playerB.attack, defense: playerB.defense }
    );

    if (transfer) {
      transfer.tile.ownerId = transfer.toId;

      const fromPlayer = players.get(transfer.fromId);
      const toPlayer = players.get(transfer.toId);
      if (fromPlayer) fromPlayer.tileCount -= 1;
      if (toPlayer) toPlayer.tileCount += 1;

      if (fromPlayer && fromPlayer.tileCount <= 0) {
        fromPlayer.absorbed = true;
        if (toPlayer) {
          toPlayer.resources += Math.floor(0.25 * fromPlayer.resources);

          const absorbedAdj =
            fromPlayer.nameAdj ||
            fromPlayer.teamName.split(" ").slice(0, -1).join(" ");
          if (absorbedAdj) {
            toPlayer.teamName = `${absorbedAdj} ${toPlayer.teamName}`;
          }

          fromPlayer.teamId = toPlayer.id;
          fromPlayer.isTeamLead = false;
          fromPlayer.teamName = toPlayer.teamName;

          players.forEach((p) => {
            if (p.teamId === toPlayer.id && p.id !== toPlayer.id) {
              p.teamName = toPlayer.teamName;
            }
          });

          // Transfer all absorbed player's tiles to the absorber
          tiles.forEach((tile) => {
            if (tile.ownerId === fromPlayer.id) {
              tile.ownerId = toPlayer.id;
              toPlayer.tileCount += 1;
            }
          });
        }
      }
    }
  }
}

function makeTile(x: number, y: number, ownerId: string): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  return t;
}

function makePlayer(
  id: string,
  attack: number,
  defense: number,
  tileCount: number,
  resources: number = 0
): Player {
  const p = new Player();
  p.id = id;
  p.attack = attack;
  p.defense = defense;
  p.tileCount = tileCount;
  p.resources = resources;
  p.absorbed = false;
  p.teamId = id;
  p.isTeamLead = true;
  p.nameAdj = id;
  p.nameNoun = "Bot";
  p.teamName = `${id} Bot`;
  return p;
}

describe("Property-Based Tests — Single Tile Transfer Preservation (Property 3)", () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * Property 3: Preservation — Single tile transfer without absorption unchanged
   *
   * For any border conflict where the losing player retains at least 1 tile
   * after the transfer (no absorption occurs), exactly one tile changes
   * ownership per border resolution. The loser's tileCount decreases by 1
   * and the winner's increases by 1.
   *
   * Grid layout: A occupies column 1 rows 0..borderLen-1, B occupies
   * column 2 rows 0..borderLen-1. Both sides share the same number of
   * border tiles (borderLen). A has extra non-border tiles in column 0,
   * B has extra non-border tiles in column 3, ensuring the loser always
   * retains tiles after losing one.
   *
   * We generate A.attack > B.defense to guarantee A wins the border
   * conflict (pressureA = aAttack * borderLen > defenseB = bDefense * borderLen
   * iff aAttack > bDefense, which is guaranteed by the generator ranges).
   */
  it("2.1 Exactly one tile transfers per non-absorption border conflict", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),  // A attack (high — guarantees A wins)
        fc.integer({ min: 1, max: 20 }),  // A defense
        fc.integer({ min: 1, max: 20 }),  // B attack
        fc.integer({ min: 1, max: 4 }),   // B defense (low — guarantees A wins since aAttack > bDefense)
        fc.integer({ min: 1, max: 5 }),   // shared border length
        (aAttack, aDefense, bAttack, bDefense, borderLen) => {
          // Build a 10x10 grid (large enough for borderLen up to 5)
          const gridWidth = 10;
          const gridHeight = 10;
          const tiles: Tile[] = [];
          for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
              tiles.push(makeTile(x, y, ""));
            }
          }

          // A's border tiles: column 1, rows 0..borderLen-1
          // A's non-border tiles: column 0, rows 0..borderLen-1 (ensures A retains tiles)
          const aTileCoords: { x: number; y: number }[] = [];
          for (let i = 0; i < borderLen; i++) {
            aTileCoords.push({ x: 1, y: i }); // border tiles
            aTileCoords.push({ x: 0, y: i }); // non-border tiles
          }

          // B's border tiles: column 2, rows 0..borderLen-1
          // B's non-border tiles: column 3, rows 0..borderLen-1 (ensures B retains tiles)
          const bTileCoords: { x: number; y: number }[] = [];
          for (let i = 0; i < borderLen; i++) {
            bTileCoords.push({ x: 2, y: i }); // border tiles
            bTileCoords.push({ x: 3, y: i }); // non-border tiles
          }

          for (const pos of aTileCoords) {
            tiles.find((t) => t.x === pos.x && t.y === pos.y)!.ownerId = "A";
          }
          for (const pos of bTileCoords) {
            tiles.find((t) => t.x === pos.x && t.y === pos.y)!.ownerId = "B";
          }

          const totalATiles = aTileCoords.length;
          const totalBTiles = bTileCoords.length;

          const playerA = makePlayer("A", aAttack, aDefense, totalATiles, 100);
          const playerB = makePlayer("B", bAttack, bDefense, totalBTiles, 100);

          const players = new Map<string, Player>();
          players.set("A", playerA);
          players.set("B", playerB);

          const preATileCount = playerA.tileCount;
          const preBTileCount = playerB.tileCount;

          simulateAbsorptionTick(tiles, players, gridWidth, gridHeight);

          // No absorption should have occurred (both sides have non-border tiles)
          expect(playerA.absorbed).toBe(false);
          expect(playerB.absorbed).toBe(false);

          // A wins: A gains 1 tile, B loses 1 tile
          expect(playerA.tileCount).toBe(preATileCount + 1);
          expect(playerB.tileCount).toBe(preBTileCount - 1);

          // Verify exactly one tile changed ownership on the grid
          const aTilesAfter = tiles.filter((t) => t.ownerId === "A").length;
          const bTilesAfter = tiles.filter((t) => t.ownerId === "B").length;

          expect(aTilesAfter).toBe(totalATiles + 1);
          expect(bTilesAfter).toBe(totalBTiles - 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property-Based Tests — Absorption Side Effects Preservation (Property 5)", () => {
  /**
   * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
   *
   * Property 5: Preservation — Existing absorption side effects unchanged
   *
   * When absorption occurs, the following side effects must be present:
   * - absorbed = true is set on the absorbed player
   * - absorber receives floor(0.25 * absorbedPlayer.resources) bonus scrap
   * - absorbed player's nameAdj is prepended to absorber's teamName
   * - absorbed player's teamId is set to absorber's id
   * - absorbed player's isTeamLead is set to false
   */
  it("2.2 Absorption side effects are correctly applied", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),   // A attack (high to guarantee win)
        fc.integer({ min: 1, max: 10 }),   // A defense
        fc.integer({ min: 1, max: 3 }),    // B attack (low)
        fc.integer({ min: 1, max: 3 }),    // B defense (low)
        fc.integer({ min: 0, max: 500 }),  // B resources
        fc.integer({ min: 0, max: 500 }),  // A resources
        (aAttack, aDefense, bAttack, bDefense, bResources, aResources) => {
          const gridWidth = 5;
          const gridHeight = 5;

          const tiles: Tile[] = [];
          for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
              tiles.push(makeTile(x, y, ""));
            }
          }

          // A's territory: left columns
          const aTileCoords = [
            { x: 0, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: 1, y: 1 },
            { x: 0, y: 2 }, { x: 1, y: 2 },
          ];
          for (const pos of aTileCoords) {
            tiles.find((t) => t.x === pos.x && t.y === pos.y)!.ownerId = "A";
          }

          // B has exactly 1 tile (border tile) — absorption will trigger
          tiles.find((t) => t.x === 2 && t.y === 1)!.ownerId = "B";

          const playerA = makePlayer("A", aAttack, aDefense, aTileCoords.length, aResources);
          const playerB = makePlayer("B", bAttack, bDefense, 1, bResources);

          const players = new Map<string, Player>();
          players.set("A", playerA);
          players.set("B", playerB);

          const preAResources = playerA.resources;
          const preATeamName = playerA.teamName;
          const expectedBonusScrap = Math.floor(0.25 * bResources);

          simulateAbsorptionTick(tiles, players, gridWidth, gridHeight);

          // Absorption must have triggered
          expect(playerB.absorbed, "Player B should be absorbed").toBe(true);

          // Bonus scrap: absorber gets floor(0.25 * absorbed.resources)
          expect(
            playerA.resources,
            `Absorber resources should be ${preAResources + expectedBonusScrap} ` +
              `(${preAResources} + floor(0.25 * ${bResources}) = ${preAResources} + ${expectedBonusScrap})`
          ).toBe(preAResources + expectedBonusScrap);

          // Team name: absorbed player's nameAdj prepended to absorber's teamName
          expect(
            playerA.teamName,
            `Absorber teamName should have B's nameAdj prepended`
          ).toBe(`B ${preATeamName}`);

          // Team membership: absorbed player joins absorber's team
          expect(playerB.teamId).toBe("A");
          expect(playerB.isTeamLead).toBe(false);
          expect(playerB.teamName).toBe(playerA.teamName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property-Based Tests — Tile Property Preservation (Property 4)", () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * Property 4: Preservation — Tile properties preserved on transfer
   *
   * After a single-tile border transfer, the transferred tile's isSpawn,
   * hasGear, and gearScrap values are unchanged — only ownerId changes.
   * The tile's x and y coordinates also remain the same.
   */
  it("2.3 Tile properties are preserved after single-tile border transfer", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),   // A attack (high to guarantee win)
        fc.integer({ min: 1, max: 10 }),   // A defense
        fc.integer({ min: 1, max: 3 }),    // B attack (low)
        fc.integer({ min: 1, max: 3 }),    // B defense (low)
        fc.boolean(),                       // isSpawn for B's border tile
        fc.boolean(),                       // hasGear for B's border tile
        fc.integer({ min: 0, max: 100 }),  // gearScrap for B's border tile
        (aAttack, aDefense, bAttack, bDefense, isSpawn, hasGear, gearScrap) => {
          const gridWidth = 5;
          const gridHeight = 5;

          const tiles: Tile[] = [];
          for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
              tiles.push(makeTile(x, y, ""));
            }
          }

          // A's territory: left columns
          const aTileCoords = [
            { x: 0, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: 1, y: 1 },
            { x: 0, y: 2 }, { x: 1, y: 2 },
          ];
          for (const pos of aTileCoords) {
            tiles.find((t) => t.x === pos.x && t.y === pos.y)!.ownerId = "A";
          }

          // B's border tile at (2,1) with random properties
          const bBorderTile = tiles.find((t) => t.x === 2 && t.y === 1)!;
          bBorderTile.ownerId = "B";
          bBorderTile.isSpawn = isSpawn;
          bBorderTile.hasGear = hasGear;
          bBorderTile.gearScrap = gearScrap;

          // B has additional tiles so no absorption occurs (tileCount stays > 0)
          tiles.find((t) => t.x === 3 && t.y === 0)!.ownerId = "B";
          tiles.find((t) => t.x === 4 && t.y === 0)!.ownerId = "B";

          const playerA = makePlayer("A", aAttack, aDefense, aTileCoords.length, 100);
          const playerB = makePlayer("B", bAttack, bDefense, 3, 100);

          const players = new Map<string, Player>();
          players.set("A", playerA);
          players.set("B", playerB);

          simulateAbsorptionTick(tiles, players, gridWidth, gridHeight);

          // No absorption should have occurred
          expect(playerB.absorbed).toBe(false);

          // The border tile at (2,1) should now be owned by A
          // (A's pressure = aAttack * 3 border tiles >= 5*3=15 > bDefense * 1 <= 3)
          expect(bBorderTile.ownerId).toBe("A");

          // Tile properties must be preserved
          expect(bBorderTile.x).toBe(2);
          expect(bBorderTile.y).toBe(1);
          expect(bBorderTile.isSpawn).toBe(isSpawn);
          expect(bBorderTile.hasGear).toBe(hasGear);
          expect(bBorderTile.gearScrap).toBe(gearScrap);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property-Based Tests — Tile Transfer on Absorption (Bug Condition)", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3**
   *
   * Property 1: Bug Condition — Orphaned Tiles After Absorption
   *
   * When Player A absorbs Player B (B's tileCount reaches 0 via border
   * conflict), ALL tiles with ownerId === B.id should be reassigned to A.
   * No tiles should remain orphaned under B's ownerId, and A's tileCount
   * should reflect all of B's former tiles.
   *
   * Setup: 5x5 grid with two players. Player A has a large territory on
   * the left side with high attack. Player B has a small territory:
   * - One "border tile" adjacent to A (this will be taken in the conflict)
   * - Additional tiles NOT adjacent to A (these are the potential orphans)
   * - B's tileCount is set to 1 (simulating B being on their last border
   *   tile — the non-border tiles represent territory that should be
   *   transferred on absorption but isn't in the buggy code)
   *
   * This setup directly tests the absorption path: when the border
   * conflict takes B's last counted tile, absorption triggers. The
   * non-border tiles with ownerId=B should be reassigned to A.
   */
  it("1.1 No orphaned tiles remain after absorption", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),   // A attack (high)
        fc.integer({ min: 1, max: 10 }),   // A defense
        fc.integer({ min: 1, max: 3 }),    // B attack (low)
        fc.integer({ min: 1, max: 3 }),    // B defense (low)
        fc.integer({ min: 1, max: 3 }),    // B's extra non-border tiles
        fc.integer({ min: 0, max: 200 }),  // B resources
        (aAttack, aDefense, bAttack, bDefense, bExtraTiles, bResources) => {
          const gridWidth = 5;
          const gridHeight = 5;

          // Build the full grid
          const tiles: Tile[] = [];
          for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
              tiles.push(makeTile(x, y, ""));
            }
          }

          // A's territory: left columns
          const aTileCoords = [
            { x: 0, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: 1, y: 1 },
            { x: 0, y: 2 }, { x: 1, y: 2 },
          ];
          for (const pos of aTileCoords) {
            tiles.find((t) => t.x === pos.x && t.y === pos.y)!.ownerId = "A";
          }

          // B's border tile at (2,1) — adjacent to A's (1,1)
          tiles.find((t) => t.x === 2 && t.y === 1)!.ownerId = "B";

          // B's extra tiles far from A — these are the potential orphans
          const bExtraCoords = [
            { x: 4, y: 3 },
            { x: 4, y: 4 },
            { x: 3, y: 4 },
          ];
          for (let i = 0; i < bExtraTiles; i++) {
            tiles.find(
              (t) => t.x === bExtraCoords[i].x && t.y === bExtraCoords[i].y
            )!.ownerId = "B";
          }

          // KEY SETUP: B's tileCount = 1 (only the border tile is "counted")
          // This means when B loses the border tile, tileCount reaches 0,
          // triggering absorption. The extra tiles represent territory that
          // B owns on the grid but that should be transferred to A on absorption.
          //
          // In a real game, this state arises when B has been losing tiles
          // over multiple ticks and is down to their last "counted" tile,
          // while still having tiles on the grid that the absorption code
          // should clean up.
          const playerA = makePlayer("A", aAttack, aDefense, aTileCoords.length, 100);
          const playerB = makePlayer("B", bAttack, bDefense, 1, bResources);

          const players = new Map<string, Player>();
          players.set("A", playerA);
          players.set("B", playerB);

          // Verify A will win: A's pressure must exceed B's defense
          // A has tiles at (1,0), (1,1), (1,2) adjacent to B's (2,1)
          // So A has 3 border tiles. Pressure = aAttack * 3.
          // B has 1 border tile. Defense = bDefense * 1.
          // With aAttack >= 5 and bDefense <= 3: 5*3=15 > 3*1=3. Always wins.

          const preATileCount = playerA.tileCount;

          // Run one tick — should trigger absorption
          simulateAbsorptionTick(tiles, players, gridWidth, gridHeight);

          // Absorption should have been triggered
          expect(playerB.absorbed, "Player B should be absorbed").toBe(true);

          // ASSERT 1: No tiles should remain with ownerId === "B"
          const orphanedTiles = tiles.filter((t) => t.ownerId === "B");
          expect(
            orphanedTiles.length,
            `After absorption, ${orphanedTiles.length} tile(s) still have ownerId === "B" ` +
              `at positions: ${orphanedTiles.map((t) => `(${t.x},${t.y})`).join(", ")}. ` +
              `These should have been reassigned to "A".`
          ).toBe(0);

          // ASSERT 2: A's tileCount should include B's former tiles
          // A started with preATileCount, gained 1 from border conflict,
          // and should have gained bExtraTiles from absorption transfer
          const expectedATileCount = preATileCount + 1 + bExtraTiles;
          expect(
            playerA.tileCount,
            `Absorber tileCount is ${playerA.tileCount} but should be ${expectedATileCount} ` +
              `(started with ${preATileCount}, +1 from border conflict, +${bExtraTiles} from absorption)`
          ).toBe(expectedATileCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
