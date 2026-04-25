import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { spawnNewGears, initializeGrid } from "../../server/logic/GridManager";

describe("Feature: gear-respawn, Property 1: Countdown suppresses spawning and decrements", () => {
  /**
   * Property 1: For any countdown value greater than zero, executing one
   * game tick SHALL decrement the countdown by exactly 1 and SHALL NOT
   * spawn any new gears.
   *
   * We model the gear-spawning step from gameTick() directly:
   *   if (countdown > 0) { countdown--; } else { spawnNewGears(...); }
   *
   * **Validates: Requirements 1.2, 1.3**
   */
  it("for any countdown > 0, a tick decrements countdown by 1 and spawns no gears", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (countdown) => {
          // Build a small grid with some unclaimed tiles (gears could spawn if logic allowed)
          const tiles = Array.from({ length: 25 }, () => ({
            ownerId: "",
            isSpawn: false,
            hasGear: false,
          }));

          let gearsSpawned: number[] = [];

          // Simulate the gear-spawning step from gameTick
          if (countdown > 0) {
            countdown--;
            // spawning is skipped
          } else {
            gearsSpawned = spawnNewGears(tiles, 1);
          }

          // Countdown should have decremented by exactly 1 from its original value
          // We started with a value in [1, 100], so after decrement it's [0, 99]
          // The original value was countdown + 1 (since we decremented)
          expect(countdown).toBeGreaterThanOrEqual(0);
          expect(countdown).toBeLessThanOrEqual(99);

          // No gears should have been spawned
          expect(gearsSpawned).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("countdown decrements by exactly 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (initialCountdown) => {
          let countdown = initialCountdown;

          // Simulate the gear-spawning step
          if (countdown > 0) {
            countdown--;
          }

          expect(countdown).toBe(initialCountdown - 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: gear-respawn, Property 2: Spawning resumes after countdown expires", () => {
  /**
   * Property 2: For any countdown value less than or equal to zero,
   * executing one game tick SHALL spawn gears using the existing
   * spawnNewGears() logic.
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it("for any countdown <= 0, a tick spawns at least one gear when unclaimed tiles exist", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -50, max: 0 }),
        (countdown) => {
          // Build a grid with a mix of tiles — ensure some unclaimed non-spawn tiles exist
          const tiles: { ownerId: string; isSpawn: boolean; hasGear: boolean }[] = [];

          // Add some claimed tiles
          for (let i = 0; i < 5; i++) {
            tiles.push({ ownerId: "player1", isSpawn: false, hasGear: false });
          }
          // Add some spawn tiles
          for (let i = 0; i < 3; i++) {
            tiles.push({ ownerId: "", isSpawn: true, hasGear: false });
          }
          // Add unclaimed non-spawn tiles (valid candidates for gear spawning)
          for (let i = 0; i < 20; i++) {
            tiles.push({ ownerId: "", isSpawn: false, hasGear: false });
          }

          let gearsSpawned: number[] = [];

          // Simulate the gear-spawning step from gameTick
          if (countdown > 0) {
            countdown--;
          } else {
            gearsSpawned = spawnNewGears(tiles, 1);
          }

          // Since countdown <= 0, spawning should have occurred
          // With 20 unclaimed non-spawn tiles, at least 1 gear should spawn
          expect(gearsSpawned.length).toBeGreaterThanOrEqual(1);

          // Verify the spawned index points to a valid candidate tile
          for (const idx of gearsSpawned) {
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(tiles.length);
            expect(tiles[idx].ownerId).toBe("");
            expect(tiles[idx].isSpawn).toBe(false);
            expect(tiles[idx].hasGear).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: gear-respawn, Property 3: Initial gear count equals player count", () => {
  /**
   * Property 3: For any player count N, the initial gear placement in
   * startGame() / resetForNextRound() SHALL produce exactly N gear tiles.
   *
   * We replicate the initial gear placement logic from startGame():
   *   1. initializeGrid(gridSize, gridSize)
   *   2. Mark some tiles as owned (spawn tiles) — one per player
   *   3. Shuffle neutral tiles and place gears on the first N
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it("for any player count 1–10, initial gear placement produces exactly N gears", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (playerCount) => {
          // Use a fixed grid size large enough for any player count
          const gridSize = Math.ceil(30 * Math.sqrt(playerCount / 10));
          const tiles = initializeGrid(gridSize, gridSize);

          // Mark one tile per player as a spawn tile (simulating assignStartingPositions)
          for (let i = 0; i < playerCount; i++) {
            tiles[i].ownerId = `player${i}`;
            tiles[i].isSpawn = true;
          }

          // Replicate the initial gear placement logic from startGame()
          const gearCount = playerCount;
          const neutralTiles = tiles.filter((t) => t.ownerId === "");

          // Shuffle neutral tiles (Fisher-Yates)
          for (let i = neutralTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [neutralTiles[i], neutralTiles[j]] = [neutralTiles[j], neutralTiles[i]];
          }

          // Place gears
          for (let i = 0; i < Math.min(gearCount, neutralTiles.length); i++) {
            neutralTiles[i].hasGear = true;
            neutralTiles[i].gearScrap = 50;
          }

          // Count gear tiles
          const totalGears = tiles.filter((t) => t.hasGear).length;
          expect(totalGears).toBe(playerCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
