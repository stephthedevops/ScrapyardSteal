import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { BASE_COLORS, ALL_COLORS } from "../../server/rooms/GameRoom";

/**
 * Pure function replicating the server's getNextAvailableColor logic.
 * Given a set of taken colors and the allowed palette, returns the first
 * available color or -1 if all are taken.
 */
function getNextAvailableColor(
  takenColors: Set<number>,
  allowedColors: number[]
): number {
  for (const color of allowedColors) {
    if (!takenColors.has(color)) return color;
  }
  return -1;
}

/**
 * Simulate a sequence of player joins, each auto-assigned a color.
 * Returns the list of assigned colors.
 */
function simulateJoins(
  playerCount: number,
  maxPlayers: number
): number[] {
  const allowedColors = maxPlayers >= 20 ? ALL_COLORS : BASE_COLORS;
  const takenColors = new Set<number>();
  const assigned: number[] = [];

  for (let i = 0; i < playerCount; i++) {
    const color = getNextAvailableColor(takenColors, allowedColors);
    assigned.push(color);
    if (color >= 0) takenColors.add(color);
  }

  return assigned;
}

describe("Feature: pre-ship-polish — Auto-Assign Color Properties", () => {
  /**
   * Property 1: Auto-assigned colors are unique and from the allowed palette
   *
   * For any sequence of player joins (human or AI, up to palette size + 1),
   * each auto-assigned color SHALL be a member of the allowed palette AND
   * no two players SHALL have the same color. When the palette is exhausted,
   * the next player SHALL receive -1 (unassigned).
   *
   * **Validates: Requirements 8.1, 8.2, 8.3**
   */
  it("Property 1: Auto-assigned colors are unique and from the allowed palette", () => {
    // Test with 10-player mode: 1–11 players (10 palette + 1 overflow)
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 11 }),
        (playerCount) => {
          const assigned = simulateJoins(playerCount, 10);

          // Filter out the valid (non -1) assignments
          const validColors = assigned.filter((c) => c >= 0);

          // All valid colors must be from BASE_COLORS
          for (const color of validColors) {
            expect(BASE_COLORS).toContain(color);
          }

          // All valid colors must be unique
          expect(new Set(validColors).size).toBe(validColors.length);

          // If we have more players than palette size, the overflow gets -1
          if (playerCount > BASE_COLORS.length) {
            expect(assigned[BASE_COLORS.length]).toBe(-1);
          }

          // All players within palette size should get a valid color
          for (let i = 0; i < Math.min(playerCount, BASE_COLORS.length); i++) {
            expect(assigned[i]).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Auto-assigned colors respect maxPlayers palette bounds
   *
   * For any sequence of player joins with a given maxPlayers setting (10 or 20),
   * every auto-assigned color SHALL be a member of the palette corresponding
   * to that maxPlayers value.
   *
   * **Validates: Requirements 9.1, 9.2**
   */
  it("Property 2: Auto-assigned colors respect maxPlayers palette bounds", () => {
    const maxPlayersArb = fc.constantFrom(10, 20);

    fc.assert(
      fc.property(
        maxPlayersArb,
        fc.integer({ min: 1, max: 21 }),
        (maxPlayers, playerCount) => {
          const allowedPalette = maxPlayers >= 20 ? ALL_COLORS : BASE_COLORS;
          const assigned = simulateJoins(playerCount, maxPlayers);

          for (const color of assigned) {
            if (color >= 0) {
              expect(allowedPalette).toContain(color);
            }
          }

          // Palette exhaustion: if playerCount > palette size, overflow gets -1
          if (playerCount > allowedPalette.length) {
            expect(assigned[allowedPalette.length]).toBe(-1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
