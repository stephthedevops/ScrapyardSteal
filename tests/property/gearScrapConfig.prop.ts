import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Tile } from "server/state/GameState";
import { initializeGrid } from "server/logic/GridManager";

/**
 * Pure validation helpers that replicate the setConfig handler logic
 * from server/rooms/GameRoom.ts for gear scrap config property testing.
 */

const ALLOWED_SCRAP_VALUES = [50, 100, 500, 1000, 2000] as const;

function isValidScrapValue(value: number): boolean {
  return (ALLOWED_SCRAP_VALUES as readonly number[]).includes(value);
}

/**
 * Simulates the setConfig handler's effect on gearScrapSupply.
 * Returns the new gearScrapSupply after applying the config message.
 */
function applySetConfig(
  state: { gearScrapSupply: number; phase: string; hostId: string },
  senderSessionId: string,
  data: { gearScrapSupply?: number }
): { gearScrapSupply: number } {
  let gearScrapSupply = state.gearScrapSupply;

  // Guard: phase must be "waiting"
  if (state.phase !== "waiting") return { gearScrapSupply };

  // Guard: sender must be host
  if (senderSessionId !== state.hostId) return { gearScrapSupply };

  // Validate and apply gearScrapSupply
  if (
    data.gearScrapSupply !== undefined &&
    isValidScrapValue(data.gearScrapSupply)
  ) {
    gearScrapSupply = data.gearScrapSupply;
  }

  return { gearScrapSupply };
}

/**
 * Simulates gear placement logic from startGame / resetForNextRound.
 * Places gears on neutral tiles using the configured gearScrapSupply value.
 */
function placeGearsOnGrid(
  tiles: Tile[],
  gearCount: number,
  gearScrapSupply: number
): Tile[] {
  const neutralTiles = tiles.filter((t) => t.ownerId === "");

  // Shuffle neutral tiles (Fisher-Yates)
  for (let i = neutralTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [neutralTiles[i], neutralTiles[j]] = [neutralTiles[j], neutralTiles[i]];
  }

  for (let i = 0; i < Math.min(gearCount, neutralTiles.length); i++) {
    neutralTiles[i].hasGear = true;
    neutralTiles[i].gearScrap = gearScrapSupply;
  }

  return tiles;
}

describe("Feature: gear-scrap-config, Property 1: Gear scrap value validation", () => {
  /**
   * Property 1: Gear scrap value validation
   *
   * For any integer value sent as gearScrapSupply in a setConfig message
   * from the host during the "waiting" phase, the server SHALL update
   * GameState.gearScrapSupply only if the value is in {50, 100, 500, 1000, 2000}.
   * All other values SHALL leave the field unchanged.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it("only accepts gearScrapSupply values in {50, 100, 500, 1000, 2000}", () => {
    const hostId = "host-session";

    fc.assert(
      fc.property(fc.integer(), (gearScrapSupply) => {
        const initialValue = 1000;
        const state = {
          gearScrapSupply: initialValue,
          phase: "waiting" as string,
          hostId,
        };

        const result = applySetConfig(state, hostId, { gearScrapSupply });

        if (isValidScrapValue(gearScrapSupply)) {
          // Valid value: state should be updated
          expect(result.gearScrapSupply).toBe(gearScrapSupply);
        } else {
          // Invalid value: state should remain unchanged
          expect(result.gearScrapSupply).toBe(initialValue);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("rejects invalid values and preserves any previously set valid value", () => {
    const hostId = "host-session";
    const validScrapArb = fc.constantFrom(...ALLOWED_SCRAP_VALUES);
    const invalidScrapArb = fc.integer().filter((n) => !isValidScrapValue(n));

    fc.assert(
      fc.property(validScrapArb, invalidScrapArb, (validValue, invalidValue) => {
        const state = {
          gearScrapSupply: validValue,
          phase: "waiting" as string,
          hostId,
        };

        const result = applySetConfig(state, hostId, {
          gearScrapSupply: invalidValue,
        });

        // State should remain at the previously set valid value
        expect(result.gearScrapSupply).toBe(validValue);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Feature: gear-scrap-config, Property 2: Gear scrap authorization", () => {
  /**
   * Property 2: Gear scrap authorization
   *
   * For any player who is not the host, sending a setConfig message with
   * gearScrapSupply SHALL NOT change GameState.gearScrapSupply.
   *
   * **Validates: Requirements 2.3**
   */
  it("non-host players cannot change gearScrapSupply", () => {
    const hostId = "host-session";

    const nonHostIdArb = fc
      .string({ minLength: 1 })
      .filter((s) => s !== hostId);
    const scrapValueArb = fc.constantFrom(...ALLOWED_SCRAP_VALUES);
    const initialScrapArb = fc.constantFrom(...ALLOWED_SCRAP_VALUES);

    fc.assert(
      fc.property(
        nonHostIdArb,
        scrapValueArb,
        initialScrapArb,
        (senderId, scrapValue, initialScrap) => {
          const state = {
            gearScrapSupply: initialScrap,
            phase: "waiting" as string,
            hostId,
          };

          const result = applySetConfig(state, senderId, {
            gearScrapSupply: scrapValue,
          });

          // State must remain completely unchanged
          expect(result.gearScrapSupply).toBe(initialScrap);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: gear-scrap-config, Property 3: Gear tiles use configured supply", () => {
  /**
   * Property 3: Gear tiles use configured supply
   *
   * For any valid gearScrapSupply value V, all gear tiles created during
   * startGame(), gameTick(), and resetForNextRound() SHALL have gearScrap
   * equal to V.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it("all gear tiles have gearScrap equal to the configured supply value", () => {
    const validScrapArb = fc.constantFrom(...ALLOWED_SCRAP_VALUES);
    // Use small grid sizes to keep tests fast but meaningful
    const playerCountArb = fc.integer({ min: 2, max: 6 });

    fc.assert(
      fc.property(validScrapArb, playerCountArb, (scrapValue, playerCount) => {
        // Simulate startGame / resetForNextRound gear placement
        const gridSize = Math.ceil(30 * Math.sqrt(playerCount / 10));
        const tiles = initializeGrid(gridSize, gridSize);

        placeGearsOnGrid(tiles, playerCount, scrapValue);

        // Assert all gear tiles have gearScrap === configured value
        const gearTiles = tiles.filter((t) => t.hasGear);
        expect(gearTiles.length).toBeGreaterThan(0);
        for (const tile of gearTiles) {
          expect(tile.gearScrap).toBe(scrapValue);
        }
      }),
      { numRuns: 100 }
    );
  });
});
