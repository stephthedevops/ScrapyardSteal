import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Pure function that replicates the series completion logic from
 * server/rooms/GameRoom.ts for property-based testing.
 *
 * Given a match format and a sequence of round winners, it processes
 * each round and returns the state of the series after each round.
 */

type SeriesFormat = "bo3" | "bo5";

interface SeriesResult {
  /** Whether the series has concluded */
  completed: boolean;
  /** The winner's player ID (empty string if not yet decided) */
  winner: string;
  /** Win counts per player */
  scores: Map<string, number>;
  /** How many rounds were played before the series ended (or total if not ended) */
  roundsPlayed: number;
}

function getWinThreshold(format: SeriesFormat): number {
  return format === "bo3" ? 2 : 3;
}

/**
 * Simulates a series by processing round winners one at a time.
 * Returns the series result after the first player reaches the win threshold,
 * or after all rounds are exhausted.
 */
function simulateSeries(
  format: SeriesFormat,
  roundWinners: string[]
): SeriesResult {
  const scores = new Map<string, number>();
  const threshold = getWinThreshold(format);

  for (let i = 0; i < roundWinners.length; i++) {
    const winnerId = roundWinners[i];
    const currentScore = scores.get(winnerId) || 0;
    scores.set(winnerId, currentScore + 1);

    if (scores.get(winnerId)! >= threshold) {
      return {
        completed: true,
        winner: winnerId,
        scores,
        roundsPlayed: i + 1,
      };
    }
  }

  return {
    completed: false,
    winner: "",
    scores,
    roundsPlayed: roundWinners.length,
  };
}

describe("Feature: v05-server-config-ai-hints — Series Completion Properties", () => {
  /**
   * Property 7: Series completion logic
   *
   * For any sequence of round winners in a "bo3" series, the series should
   * end exactly when some player reaches 2 wins. For any sequence in a "bo5"
   * series, the series should end exactly when some player reaches 3 wins.
   * Before that threshold, the series should continue.
   *
   * **Validates: Requirements 6.5, 6.7**
   */
  describe("Property 7: Series completion logic", () => {
    const playerIdArb = fc.constantFrom("player-A", "player-B", "player-C", "player-D");

    it("bo3: series ends exactly when a player reaches 2 wins", () => {
      // Generate sequences of 2–6 round winners (bo3 needs at most 3 rounds to decide)
      const roundWinnersArb = fc.array(playerIdArb, { minLength: 2, maxLength: 6 });

      fc.assert(
        fc.property(roundWinnersArb, (roundWinners) => {
          const result = simulateSeries("bo3", roundWinners);

          if (result.completed) {
            // The winner must have exactly 2 wins (the threshold)
            expect(result.scores.get(result.winner)).toBe(2);

            // No player should have more than 2 wins (series stops at threshold)
            result.scores.forEach((wins) => {
              expect(wins).toBeLessThanOrEqual(2);
            });

            // Verify the series didn't end too early: before the final round,
            // no player should have had 2 wins yet
            const scoresBeforeFinal = new Map<string, number>();
            for (let i = 0; i < result.roundsPlayed - 1; i++) {
              const w = roundWinners[i];
              scoresBeforeFinal.set(w, (scoresBeforeFinal.get(w) || 0) + 1);
            }
            scoresBeforeFinal.forEach((wins) => {
              expect(wins).toBeLessThan(2);
            });
          } else {
            // Series not completed: no player has reached 2 wins
            result.scores.forEach((wins) => {
              expect(wins).toBeLessThan(2);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it("bo5: series ends exactly when a player reaches 3 wins", () => {
      // Generate sequences of 3–10 round winners (bo5 needs at most 5 rounds to decide)
      const roundWinnersArb = fc.array(playerIdArb, { minLength: 3, maxLength: 10 });

      fc.assert(
        fc.property(roundWinnersArb, (roundWinners) => {
          const result = simulateSeries("bo5", roundWinners);

          if (result.completed) {
            // The winner must have exactly 3 wins (the threshold)
            expect(result.scores.get(result.winner)).toBe(3);

            // No player should have more than 3 wins
            result.scores.forEach((wins) => {
              expect(wins).toBeLessThanOrEqual(3);
            });

            // Before the final round, no player should have had 3 wins
            const scoresBeforeFinal = new Map<string, number>();
            for (let i = 0; i < result.roundsPlayed - 1; i++) {
              const w = roundWinners[i];
              scoresBeforeFinal.set(w, (scoresBeforeFinal.get(w) || 0) + 1);
            }
            scoresBeforeFinal.forEach((wins) => {
              expect(wins).toBeLessThan(3);
            });
          } else {
            // Series not completed: no player has reached 3 wins
            result.scores.forEach((wins) => {
              expect(wins).toBeLessThan(3);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it("bo3: series always continues before any player reaches 2 wins", () => {
      // Generate sequences where no player can reach 2 wins:
      // Use exactly 1 round with distinct winners (each player wins at most once)
      const singleRoundArb = fc.array(playerIdArb, { minLength: 1, maxLength: 1 });

      fc.assert(
        fc.property(singleRoundArb, (roundWinners) => {
          const result = simulateSeries("bo3", roundWinners);

          // With only 1 round, no player can have 2 wins
          expect(result.completed).toBe(false);
          expect(result.winner).toBe("");
          result.scores.forEach((wins) => {
            expect(wins).toBeLessThan(2);
          });
        }),
        { numRuns: 100 }
      );
    });

    it("bo5: series always continues before any player reaches 3 wins", () => {
      // Generate short sequences (1-2 rounds) where threshold can't be reached
      const shortSequenceArb = fc.array(playerIdArb, { minLength: 1, maxLength: 2 });

      fc.assert(
        fc.property(shortSequenceArb, (roundWinners) => {
          const result = simulateSeries("bo5", roundWinners);

          // With at most 2 rounds, no player can have 3 wins
          expect(result.completed).toBe(false);
          expect(result.winner).toBe("");
          result.scores.forEach((wins) => {
            expect(wins).toBeLessThan(3);
          });
        }),
        { numRuns: 100 }
      );
    });

    it("series completion works for any format with arbitrary player counts", () => {
      const formatArb = fc.constantFrom<SeriesFormat>("bo3", "bo5");
      const winnersArb = fc.array(playerIdArb, { minLength: 1, maxLength: 15 });

      fc.assert(
        fc.property(formatArb, winnersArb, (format, roundWinners) => {
          const threshold = getWinThreshold(format);
          const result = simulateSeries(format, roundWinners);

          if (result.completed) {
            // Winner has exactly the threshold number of wins
            expect(result.scores.get(result.winner)).toBe(threshold);

            // Series stopped processing at the right round
            expect(result.roundsPlayed).toBeLessThanOrEqual(roundWinners.length);

            // The winning round was the earliest possible completion point
            const scoresAtCompletion = new Map<string, number>();
            for (let i = 0; i < result.roundsPlayed; i++) {
              const w = roundWinners[i];
              scoresAtCompletion.set(w, (scoresAtCompletion.get(w) || 0) + 1);
            }
            // Exactly one player should have reached the threshold
            let winnersCount = 0;
            scoresAtCompletion.forEach((wins) => {
              if (wins >= threshold) winnersCount++;
            });
            expect(winnersCount).toBe(1);
          } else {
            // No player reached the threshold
            result.scores.forEach((wins) => {
              expect(wins).toBeLessThan(threshold);
            });
            // All rounds were processed
            expect(result.roundsPlayed).toBe(roundWinners.length);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
