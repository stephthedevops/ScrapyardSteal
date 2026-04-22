import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Pure validation helpers that replicate the setConfig handler logic
 * from server/rooms/GameRoom.ts for property-based testing.
 */

const ALLOWED_TIMES = [120, 300, 420, 600] as const;
const ALLOWED_FORMATS = ["single", "bo3", "bo5"] as const;

function isValidTimeLimit(value: number): boolean {
  return (ALLOWED_TIMES as readonly number[]).includes(value);
}

function isValidMatchFormat(value: string): boolean {
  return (ALLOWED_FORMATS as readonly string[]).includes(value);
}

/**
 * Simulates the setConfig handler's effect on game state.
 * Returns the new state after applying the config message.
 */
function applySetConfig(
  state: { timeRemaining: number; matchFormat: string; phase: string; hostId: string },
  senderSessionId: string,
  data: { timeLimit?: number; matchFormat?: string }
): { timeRemaining: number; matchFormat: string } {
  // Clone current values
  let timeRemaining = state.timeRemaining;
  let matchFormat = state.matchFormat;

  // Guard: phase must be "waiting"
  if (state.phase !== "waiting") return { timeRemaining, matchFormat };

  // Guard: sender must be host
  if (senderSessionId !== state.hostId) return { timeRemaining, matchFormat };

  // Validate and apply timeLimit
  if (data.timeLimit !== undefined && isValidTimeLimit(data.timeLimit)) {
    timeRemaining = data.timeLimit;
  }

  // Validate and apply matchFormat
  if (data.matchFormat !== undefined && isValidMatchFormat(data.matchFormat)) {
    matchFormat = data.matchFormat;
  }

  return { timeRemaining, matchFormat };
}

describe("Feature: v05-server-config-ai-hints — Server Config Properties", () => {
  /**
   * Property 5: Config value validation
   *
   * For any integer value sent as timeLimit in a setConfig message, the server
   * should only update GameState.timeRemaining if the value is one of
   * {120, 300, 420, 600}. For any string value sent as matchFormat, the server
   * should only update GameState.matchFormat if the value is one of
   * {"single", "bo3", "bo5"}.
   *
   * **Validates: Requirements 5.6, 6.4**
   */
  describe("Property 5: Config value validation", () => {
    it("only accepts timeLimit values in {120, 300, 420, 600}", () => {
      const hostId = "host-session";

      fc.assert(
        fc.property(fc.integer(), (timeLimit) => {
          const state = {
            timeRemaining: 300,
            matchFormat: "single",
            phase: "waiting" as string,
            hostId,
          };

          const result = applySetConfig(state, hostId, { timeLimit });

          if (isValidTimeLimit(timeLimit)) {
            // Valid value: state should be updated
            expect(result.timeRemaining).toBe(timeLimit);
          } else {
            // Invalid value: state should remain unchanged
            expect(result.timeRemaining).toBe(300);
          }
          // matchFormat should never change when only timeLimit is sent
          expect(result.matchFormat).toBe("single");
        }),
        { numRuns: 100 }
      );
    });

    it("only accepts matchFormat values in {'single', 'bo3', 'bo5'}", () => {
      const hostId = "host-session";

      fc.assert(
        fc.property(fc.string(), (matchFormat) => {
          const state = {
            timeRemaining: 300,
            matchFormat: "single",
            phase: "waiting" as string,
            hostId,
          };

          const result = applySetConfig(state, hostId, { matchFormat });

          if (isValidMatchFormat(matchFormat)) {
            // Valid value: state should be updated
            expect(result.matchFormat).toBe(matchFormat);
          } else {
            // Invalid value: state should remain unchanged
            expect(result.matchFormat).toBe("single");
          }
          // timeRemaining should never change when only matchFormat is sent
          expect(result.timeRemaining).toBe(300);
        }),
        { numRuns: 100 }
      );
    });

    it("accepts valid timeLimit and matchFormat together", () => {
      const hostId = "host-session";
      const validTimeArb = fc.constantFrom(...ALLOWED_TIMES);
      const validFormatArb = fc.constantFrom(...ALLOWED_FORMATS);

      fc.assert(
        fc.property(validTimeArb, validFormatArb, (timeLimit, matchFormat) => {
          const state = {
            timeRemaining: 300,
            matchFormat: "single",
            phase: "waiting" as string,
            hostId,
          };

          const result = applySetConfig(state, hostId, { timeLimit, matchFormat });

          expect(result.timeRemaining).toBe(timeLimit);
          expect(result.matchFormat).toBe(matchFormat);
        }),
        { numRuns: 100 }
      );
    });

    it("rejects invalid timeLimit and matchFormat together, leaving state unchanged", () => {
      const hostId = "host-session";
      // Generate integers that are NOT in the allowed set
      const invalidTimeArb = fc.integer().filter((n) => !isValidTimeLimit(n));
      // Generate strings that are NOT in the allowed set
      const invalidFormatArb = fc.string().filter((s) => !isValidMatchFormat(s));

      fc.assert(
        fc.property(invalidTimeArb, invalidFormatArb, (timeLimit, matchFormat) => {
          const state = {
            timeRemaining: 420,
            matchFormat: "bo3",
            phase: "waiting" as string,
            hostId,
          };

          const result = applySetConfig(state, hostId, { timeLimit, matchFormat });

          // Both should remain unchanged
          expect(result.timeRemaining).toBe(420);
          expect(result.matchFormat).toBe("bo3");
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Config authorization
   *
   * For any player who is not the host, sending a setConfig message should
   * not change any GameState fields (timeRemaining, matchFormat).
   *
   * **Validates: Requirements 5.7**
   */
  describe("Property 6: Config authorization", () => {
    it("non-host players cannot change any config fields", () => {
      const hostId = "host-session";

      // Generate arbitrary config payloads and non-host session IDs
      const nonHostIdArb = fc.string({ minLength: 1 }).filter((s) => s !== hostId);
      const configArb = fc.record({
        timeLimit: fc.option(fc.constantFrom(...ALLOWED_TIMES), { nil: undefined }),
        matchFormat: fc.option(fc.constantFrom(...ALLOWED_FORMATS), { nil: undefined }),
      });
      // Arbitrary initial state values from valid sets
      const initialTimeArb = fc.constantFrom(...ALLOWED_TIMES);
      const initialFormatArb = fc.constantFrom(...ALLOWED_FORMATS);

      fc.assert(
        fc.property(
          nonHostIdArb,
          configArb,
          initialTimeArb,
          initialFormatArb,
          (senderId, config, initialTime, initialFormat) => {
            const state = {
              timeRemaining: initialTime,
              matchFormat: initialFormat,
              phase: "waiting" as string,
              hostId,
            };

            const result = applySetConfig(state, senderId, config);

            // State must remain completely unchanged
            expect(result.timeRemaining).toBe(initialTime);
            expect(result.matchFormat).toBe(initialFormat);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
