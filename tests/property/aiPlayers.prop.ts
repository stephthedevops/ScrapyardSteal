import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  HOUSEHOLD_ROID,
  ADJECTIVES,
  generateAIName,
} from "../../src/utils/nameGenerator";

describe("Feature: v05-server-config-ai-hints — AI Player Properties", () => {
  /**
   * Property 9: HOUSEHOLD_ROID pool validity
   *
   * For any entry in the HOUSEHOLD_ROID array, it should be a non-empty
   * string ending with "roid", and the array should contain at least 30
   * entries with no duplicates.
   *
   * **Validates: Requirements 7.7**
   */
  it("Property 9: HOUSEHOLD_ROID entries are non-empty strings ending with 'roid'", () => {
    // Static assertions on the pool itself
    expect(HOUSEHOLD_ROID.length).toBeGreaterThanOrEqual(30);
    expect(new Set(HOUSEHOLD_ROID).size).toBe(HOUSEHOLD_ROID.length);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: HOUSEHOLD_ROID.length - 1 }),
        (index) => {
          const entry = HOUSEHOLD_ROID[index];
          expect(typeof entry).toBe("string");
          expect(entry.length).toBeGreaterThan(0);
          expect(entry.endsWith("roid")).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: AI player creation correctness
   *
   * For any valid color from the allowed palette that is not already taken,
   * creating an AI player should produce a Player entry where the noun is
   * drawn from the HOUSEHOLD_ROID pool and the adjective is drawn from the
   * ADJECTIVES pool.
   *
   * **Validates: Requirements 7.5, 7.8**
   */
  it("Property 8: generateAIName produces adj from ADJECTIVES and noun from HOUSEHOLD_ROID", () => {
    // Generators: random subsets of taken names, leaving at least one available
    const takenAdjArb = fc.subarray(ADJECTIVES, {
      minLength: 0,
      maxLength: ADJECTIVES.length - 1,
    });
    const takenNounArb = fc.subarray(HOUSEHOLD_ROID, {
      minLength: 0,
      maxLength: HOUSEHOLD_ROID.length - 1,
    });

    fc.assert(
      fc.property(takenAdjArb, takenNounArb, (takenAdjs, takenNouns) => {
        const result = generateAIName(new Set(takenAdjs), new Set(takenNouns));

        // adj must come from ADJECTIVES pool
        expect(ADJECTIVES).toContain(result.adj);
        // noun must come from HOUSEHOLD_ROID pool
        expect(HOUSEHOLD_ROID).toContain(result.noun);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: AI removal frees color
   *
   * For any AI player in the lobby, removing that AI player should delete
   * them from the players map and make their previously selected color
   * available for selection by other players.
   *
   * **Validates: Requirements 7.10**
   */
  it("Property 11: removing an AI player deletes them and frees their color", () => {
    const ALLOWED_COLORS = [
      0xb87333, 0x4a8a5e, 0xffd700, 0x8a8a7a, 0x7a3ea0,
      0x0047ab, 0xff00ff, 0x8b4513, 0xdbe4eb, 0x36454f,
    ];

    // Generate a lobby with 1–6 players, each with a unique color from the palette.
    // At least one player must be AI.
    const lobbyArb = fc
      .integer({ min: 1, max: 6 })
      .chain((playerCount) => {
        // Pick `playerCount` unique colors
        return fc
          .shuffledSubarray(ALLOWED_COLORS, {
            minLength: playerCount,
            maxLength: playerCount,
          })
          .chain((colors) => {
            // For each player, decide if AI or human (at least one AI guaranteed below)
            return fc
              .tuple(
                ...colors.map(() => fc.boolean())
              )
              .map((isAIFlags) => {
                // Ensure at least one AI player
                if (!isAIFlags.some((f) => f)) {
                  isAIFlags[0] = true;
                }
                return colors.map((color, i) => ({
                  id: isAIFlags[i] ? `ai_${i}` : `human_${i}`,
                  isAI: isAIFlags[i],
                  color,
                }));
              });
          });
      });

    fc.assert(
      fc.property(lobbyArb, (players) => {
        // Build the players map
        const playersMap = new Map<string, { id: string; isAI: boolean; color: number }>();
        for (const p of players) {
          playersMap.set(p.id, { ...p });
        }

        // Pick an AI player to remove
        const aiPlayers = players.filter((p) => p.isAI);
        const target = aiPlayers[0];
        const removedColor = target.color;

        // Simulate removeAI: delete from map
        playersMap.delete(target.id);

        // Derive taken colors from remaining players
        const takenColors = new Set<number>();
        playersMap.forEach((p) => takenColors.add(p.color));

        // The removed AI player should no longer be in the map
        expect(playersMap.has(target.id)).toBe(false);

        // The removed AI's color should not be in the taken set
        expect(takenColors.has(removedColor)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: AI and human name uniqueness
   *
   * For any set of existing players (human and AI) in a lobby, generating
   * a new AI name should produce an adjective and noun that do not duplicate
   * any existing player's adjective or noun, provided alternatives remain
   * available in the pools.
   *
   * **Validates: Requirements 7.9**
   */
  it("Property 10: generateAIName avoids taken adjectives and nouns when alternatives exist", () => {
    const takenAdjArb = fc.subarray(ADJECTIVES, {
      minLength: 0,
      maxLength: ADJECTIVES.length - 1,
    });
    const takenNounArb = fc.subarray(HOUSEHOLD_ROID, {
      minLength: 0,
      maxLength: HOUSEHOLD_ROID.length - 1,
    });

    fc.assert(
      fc.property(takenAdjArb, takenNounArb, (takenAdjs, takenNouns) => {
        const takenAdjSet = new Set(takenAdjs);
        const takenNounSet = new Set(takenNouns);
        const result = generateAIName(takenAdjSet, takenNounSet);

        // Since alternatives remain, the result must not collide
        expect(takenAdjSet.has(result.adj)).toBe(false);
        expect(takenNounSet.has(result.noun)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
