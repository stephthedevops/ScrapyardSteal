import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { RateLimiter, DEFAULT_COOLDOWN_MS } from "../../server/logic/RateLimiter";
import type { ActionType } from "../../server/logic/RateLimiter";

const ACTION_TYPES: ActionType[] = ["claimTile", "upgradeAttack", "upgradeDefense", "mineGear"];

describe("Property-Based Tests — RateLimiter", () => {
  // Feature: rate-limiting, Property 1: Accept/reject correctness
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 8.1**
   *
   * Property 1: Accept/reject correctness
   *
   * For any sequence of timestamped actions for a single player and action
   * type, and for any cooldown window, the RateLimiter SHALL accept an action
   * if and only if it is the first action of that type for that player OR the
   * elapsed time since the previous accepted action of that type is >= the
   * cooldown window.
   *
   * Approach: Generate sorted arrays of timestamps with random gaps, replay
   * through RateLimiter with injected clock, verify each decision matches
   * `elapsed >= cooldown || first`.
   */
  it("2.1 Accept/reject correctness", () => {
    fc.assert(
      fc.property(
        // Pick a random action type
        fc.constantFrom(...ACTION_TYPES),
        // Pick a random cooldown between 1 and 1000ms
        fc.integer({ min: 1, max: 1000 }),
        // Generate a sorted array of timestamps (2–50 entries) with random gaps
        fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 2, maxLength: 50 }).map(
          (gaps) => {
            // Convert gaps into sorted timestamps by accumulating
            const timestamps: number[] = [];
            let current = 0;
            for (const gap of gaps) {
              current += gap;
              timestamps.push(current);
            }
            return timestamps;
          }
        ),
        (actionType, cooldown, timestamps) => {
          // Build config with the chosen cooldown for the chosen action type
          const config = { [actionType]: cooldown };

          // Mutable clock value that we control
          let clockValue = 0;
          const limiter = new RateLimiter(config, () => clockValue);

          const sessionId = "test-player";

          // Track the timestamp of the last accepted action to compute
          // the expected decision independently
          let lastAcceptedTimestamp: number | undefined = undefined;

          for (const ts of timestamps) {
            clockValue = ts;
            const result = limiter.allow(sessionId, actionType);

            // Compute expected decision
            const isFirst = lastAcceptedTimestamp === undefined;
            const elapsed = isFirst ? Infinity : ts - lastAcceptedTimestamp;
            const expectedAccept = isFirst || elapsed >= cooldown;

            expect(result).toBe(expectedAccept);

            if (result) {
              lastAcceptedTimestamp = ts;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: rate-limiting, Property 3: Per-player isolation
  /**
   * **Validates: Requirements 4.1**
   *
   * Property 3: Per-player isolation
   *
   * For any two distinct player session IDs and for any interleaved sequence
   * of actions from both players, the accept/reject decision for each player's
   * action SHALL depend only on that player's own action history, not on the
   * other player's actions.
   *
   * Approach: Generate interleaved actions for two players, run through a
   * single RateLimiter, compare results against two independent RateLimiter
   * instances (one per player).
   */
  it("2.3 Per-player isolation", () => {
    fc.assert(
      fc.property(
        // Pick a random cooldown between 1 and 1000ms
        fc.integer({ min: 1, max: 1000 }),
        // Generate interleaved actions for two players (2–80 entries)
        fc.array(
          fc.record({
            player: fc.constantFrom("player-A", "player-B") as fc.Arbitrary<"player-A" | "player-B">,
            action: fc.constantFrom(...ACTION_TYPES),
            timeGap: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 2, maxLength: 80 }
        ),
        (cooldown, actions) => {
          const config: Record<string, number> = {
            claimTile: cooldown,
            upgradeAttack: cooldown,
            upgradeDefense: cooldown,
            mineGear: cooldown,
          };

          // Shared clock across all limiter instances
          let clockValue = 0;
          const clock = () => clockValue;

          // Single shared RateLimiter (production scenario)
          const sharedLimiter = new RateLimiter(config, clock);

          // Two independent RateLimiters (one per player, isolation oracle)
          const independentLimiters: Record<string, RateLimiter> = {
            "player-A": new RateLimiter(config, clock),
            "player-B": new RateLimiter(config, clock),
          };

          for (const entry of actions) {
            clockValue += entry.timeGap;

            const sharedResult = sharedLimiter.allow(entry.player, entry.action);
            const independentResult = independentLimiters[entry.player].allow(
              entry.player,
              entry.action
            );

            // The shared limiter must produce the same decision as the
            // independent per-player limiter for every action
            expect(sharedResult).toBe(independentResult);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: rate-limiting, Property 2: Partition conservation
  /**
   * **Validates: Requirements 8.2**
   *
   * Property 2: Partition conservation
   *
   * For any sequence of actions submitted to the RateLimiter, the count of
   * accepted actions plus the count of throttled actions SHALL equal the total
   * count of input actions.
   *
   * Approach: Generate random action sequences, count accepted + throttled,
   * assert sum equals input length.
   */
  it("2.2 Partition conservation", () => {
    fc.assert(
      fc.property(
        // Generate a random sequence of actions (1–100 entries)
        fc.array(
          fc.record({
            sessionId: fc.constantFrom("player-1", "player-2", "player-3"),
            action: fc.constantFrom(...ACTION_TYPES),
            timeGap: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        // Pick a random cooldown between 1 and 1000ms
        fc.integer({ min: 1, max: 1000 }),
        (actions, cooldown) => {
          // Build config with the same cooldown for all action types
          const config = {
            claimTile: cooldown,
            upgradeAttack: cooldown,
            upgradeDefense: cooldown,
            mineGear: cooldown,
          };

          let clockValue = 0;
          const limiter = new RateLimiter(config, () => clockValue);

          let accepted = 0;
          let throttled = 0;

          for (const entry of actions) {
            clockValue += entry.timeGap;
            const result = limiter.allow(entry.sessionId, entry.action);
            if (result) {
              accepted++;
            } else {
              throttled++;
            }
          }

          // Partition conservation: accepted + throttled must equal total input
          expect(accepted + throttled).toBe(actions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: rate-limiting, Property 4: Cleanup restores fresh state
  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * Property 4: Cleanup restores fresh state
   *
   * For any player session that has accumulated rate limit history, after
   * calling `removePlayer(sessionId)` (or `reset()` for all players), the
   * next action from that session SHALL be accepted as if it were the first
   * action of its type.
   *
   * Approach: Generate action history, call `removePlayer` or `reset`, submit
   * new action, assert accepted.
   */
  it("2.4 Cleanup restores fresh state", () => {
    fc.assert(
      fc.property(
        // Pick a random cooldown between 1 and 1000ms
        fc.integer({ min: 1, max: 1000 }),
        // Pick a random action type for the post-cleanup action
        fc.constantFrom(...ACTION_TYPES),
        // Choose cleanup method: removePlayer or reset
        fc.constantFrom("removePlayer", "reset") as fc.Arbitrary<"removePlayer" | "reset">,
        // Generate action history to build up rate limit state (1–30 entries)
        fc.array(
          fc.record({
            action: fc.constantFrom(...ACTION_TYPES),
            timeGap: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (cooldown, postCleanupAction, cleanupMethod, history) => {
          const config = {
            claimTile: cooldown,
            upgradeAttack: cooldown,
            upgradeDefense: cooldown,
            mineGear: cooldown,
          };

          let clockValue = 0;
          const limiter = new RateLimiter(config, () => clockValue);

          const sessionId = "test-player";

          // Build up rate limit history by submitting actions
          for (const entry of history) {
            clockValue += entry.timeGap;
            limiter.allow(sessionId, entry.action);
          }

          // Perform cleanup — do NOT advance the clock, so without cleanup
          // the next action would likely be throttled
          if (cleanupMethod === "removePlayer") {
            limiter.removePlayer(sessionId);
          } else {
            limiter.reset();
          }

          // Submit a new action immediately after cleanup (same clock value)
          const result = limiter.allow(sessionId, postCleanupAction);

          // After cleanup, the action must be accepted as if it were the
          // first action of its type — fresh state
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: rate-limiting, Property 5: Custom configuration determines cooldown
  /**
   * **Validates: Requirements 5.1**
   *
   * Property 5: Custom configuration determines cooldown
   *
   * For any action type and for any positive cooldown value provided in the
   * configuration, the RateLimiter SHALL use that configured value (not the
   * default) when deciding whether to accept or reject actions of that type.
   *
   * Approach: Generate a random custom cooldown (different from the default),
   * pick a random action type, submit two actions that straddle the configured
   * boundary. Verify the configured cooldown governs the decision — an action
   * arriving 1ms before the custom cooldown is rejected, and an action
   * arriving exactly at the custom cooldown is accepted.
   */
  it("2.5 Custom configuration determines cooldown", () => {
    fc.assert(
      fc.property(
        // Pick a random action type
        fc.constantFrom(...ACTION_TYPES),
        // Pick a custom cooldown that differs from DEFAULT_COOLDOWN_MS (200)
        // Range: 1–1000, excluding 200 to ensure we're testing a non-default value
        fc.integer({ min: 1, max: 1000 }).filter((v) => v !== DEFAULT_COOLDOWN_MS),
        // Pick a random offset below the cooldown (1 to cooldown-1) for the "too early" test
        fc.integer({ min: 1, max: 999 }),
        (actionType, customCooldown, rawOffset) => {
          // Ensure the offset is strictly less than the custom cooldown
          const tooEarlyOffset = (rawOffset % (customCooldown)) || 1;
          // Ensure tooEarlyOffset is strictly less than customCooldown
          if (tooEarlyOffset >= customCooldown) return; // skip degenerate case

          // Build config with only the chosen action type overridden
          const config = { [actionType]: customCooldown };

          let clockValue = 0;
          const limiter = new RateLimiter(config, () => clockValue);

          const sessionId = "prop5-player";

          // First action — always accepted (first of its type)
          const firstResult = limiter.allow(sessionId, actionType);
          expect(firstResult).toBe(true);

          // Second action arrives before the custom cooldown elapses — must be rejected
          clockValue = tooEarlyOffset;
          const tooEarlyResult = limiter.allow(sessionId, actionType);
          expect(tooEarlyResult).toBe(false);

          // Third action arrives exactly at the custom cooldown — must be accepted
          clockValue = customCooldown;
          const exactResult = limiter.allow(sessionId, actionType);
          expect(exactResult).toBe(true);

          // Verify the configured cooldown is NOT the default — this confirms
          // the custom value is what governs the decision
          expect(customCooldown).not.toBe(DEFAULT_COOLDOWN_MS);
        }
      ),
      { numRuns: 100 }
    );
  });
});
