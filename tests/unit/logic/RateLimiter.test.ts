import { describe, it, expect } from "vitest";
import {
  RateLimiter,
  DEFAULT_COOLDOWN_MS,
  type ActionType,
} from "../../../server/logic/RateLimiter";

/**
 * Helper: creates a RateLimiter with an injectable clock starting at the given time.
 * Returns the limiter and a function to advance the clock.
 */
function createLimiterWithClock(
  startTime = 0,
  config?: Parameters<typeof RateLimiter extends new (...args: infer A) => any ? never : never>[0]
) {
  let currentTime = startTime;
  const clock = () => currentTime;
  const advance = (ms: number) => {
    currentTime += ms;
  };
  const setTime = (ms: number) => {
    currentTime = ms;
  };
  const limiter = new RateLimiter(config as any, clock);
  return { limiter, advance, setTime, clock };
}

const ALL_ACTIONS: ActionType[] = [
  "claimTile",
  "upgradeAttack",
  "upgradeDefense",
  "mineGear",
];

describe("RateLimiter — default cooldowns", () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it("uses 200ms as the default cooldown for all four action types", () => {
    expect(DEFAULT_COOLDOWN_MS).toBe(200);

    const { limiter, advance } = createLimiterWithClock(0);

    for (const action of ALL_ACTIONS) {
      // First action is accepted
      expect(limiter.allow("p1", action)).toBe(true);

      // Action at 199ms (1ms before cooldown) is rejected
      advance(199);
      expect(limiter.allow("p1", action)).toBe(false);

      // Action at exactly 200ms is accepted
      advance(1);
      expect(limiter.allow("p1", action)).toBe(true);
    }
  });
});

describe("RateLimiter — first action acceptance", () => {
  /**
   * **Validates: Requirements 1.3**
   */
  it("accepts the first action of each type for a new player", () => {
    const { limiter } = createLimiterWithClock(1000);

    for (const action of ALL_ACTIONS) {
      expect(limiter.allow("player-new", action)).toBe(true);
    }
  });

  it("accepts the first action from different players independently", () => {
    const { limiter } = createLimiterWithClock(0);

    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p2", "claimTile")).toBe(true);
    expect(limiter.allow("p3", "claimTile")).toBe(true);
  });
});

describe("RateLimiter — cooldown boundary", () => {
  /**
   * **Validates: Requirements 1.2, 1.3**
   */
  it("accepts action at exactly the cooldown boundary", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    expect(limiter.allow("p1", "claimTile")).toBe(true);
    advance(DEFAULT_COOLDOWN_MS); // exactly 200ms
    expect(limiter.allow("p1", "claimTile")).toBe(true);
  });

  it("rejects action 1ms before cooldown expires", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    expect(limiter.allow("p1", "mineGear")).toBe(true);
    advance(DEFAULT_COOLDOWN_MS - 1); // 199ms
    expect(limiter.allow("p1", "mineGear")).toBe(false);
  });

  it("accepts action 1ms after cooldown expires", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);
    advance(DEFAULT_COOLDOWN_MS + 1); // 201ms
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);
  });
});

describe("RateLimiter — independent action types", () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it("different action types have independent cooldowns", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    // Accept first claimTile
    expect(limiter.allow("p1", "claimTile")).toBe(true);

    // Advance 100ms — claimTile is still on cooldown
    advance(100);
    expect(limiter.allow("p1", "claimTile")).toBe(false);

    // But upgradeAttack has never been used — should be accepted
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);

    // And mineGear too
    expect(limiter.allow("p1", "mineGear")).toBe(true);

    // upgradeDefense as well
    expect(limiter.allow("p1", "upgradeDefense")).toBe(true);
  });

  it("throttling one action type does not affect another", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);

    advance(50);

    // Both should be throttled
    expect(limiter.allow("p1", "claimTile")).toBe(false);
    expect(limiter.allow("p1", "upgradeAttack")).toBe(false);

    // Advance to 200ms from claimTile's last accept
    advance(150);

    // Both should now be accepted (200ms elapsed for both)
    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);
  });
});

describe("RateLimiter — removePlayer", () => {
  /**
   * **Validates: Requirements 5.1**
   */
  it("clears only the specified player's data", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    // Both players perform actions
    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p2", "claimTile")).toBe(true);

    advance(50);

    // Both are throttled
    expect(limiter.allow("p1", "claimTile")).toBe(false);
    expect(limiter.allow("p2", "claimTile")).toBe(false);

    // Remove p1 only
    limiter.removePlayer("p1");

    // p1 should be accepted (fresh state)
    expect(limiter.allow("p1", "claimTile")).toBe(true);

    // p2 should still be throttled
    expect(limiter.allow("p2", "claimTile")).toBe(false);
  });

  it("is a no-op for unknown session IDs", () => {
    const { limiter } = createLimiterWithClock(0);

    // Should not throw
    limiter.removePlayer("nonexistent");
  });
});

describe("RateLimiter — reset", () => {
  /**
   * **Validates: Requirements 5.1**
   */
  it("clears all players' data", () => {
    const { limiter, advance } = createLimiterWithClock(0);

    // Multiple players perform actions
    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p2", "upgradeAttack")).toBe(true);
    expect(limiter.allow("p3", "mineGear")).toBe(true);

    advance(50);

    // All are throttled
    expect(limiter.allow("p1", "claimTile")).toBe(false);
    expect(limiter.allow("p2", "upgradeAttack")).toBe(false);
    expect(limiter.allow("p3", "mineGear")).toBe(false);

    // Reset all
    limiter.reset();

    // All should be accepted (fresh state)
    expect(limiter.allow("p1", "claimTile")).toBe(true);
    expect(limiter.allow("p2", "upgradeAttack")).toBe(true);
    expect(limiter.allow("p3", "mineGear")).toBe(true);
  });

  it("is a no-op when no players are tracked", () => {
    const { limiter } = createLimiterWithClock(0);

    // Should not throw
    limiter.reset();
  });
});

describe("RateLimiter — custom config", () => {
  /**
   * **Validates: Requirements 5.1**
   */
  it("overrides default cooldowns with custom values", () => {
    const { limiter, advance } = createLimiterWithClock(0, {
      claimTile: 500,
      mineGear: 100,
    });

    // claimTile: custom 500ms cooldown
    expect(limiter.allow("p1", "claimTile")).toBe(true);
    advance(200);
    // 200ms < 500ms — should be rejected
    expect(limiter.allow("p1", "claimTile")).toBe(false);
    advance(300);
    // 500ms total — should be accepted
    expect(limiter.allow("p1", "claimTile")).toBe(true);

    // mineGear: custom 100ms cooldown
    expect(limiter.allow("p1", "mineGear")).toBe(true);
    advance(99);
    expect(limiter.allow("p1", "mineGear")).toBe(false);
    advance(1);
    expect(limiter.allow("p1", "mineGear")).toBe(true);

    // upgradeAttack: not overridden, should use default 200ms
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);
    advance(199);
    expect(limiter.allow("p1", "upgradeAttack")).toBe(false);
    advance(1);
    expect(limiter.allow("p1", "upgradeAttack")).toBe(true);
  });

  it("uses default for action types not specified in config", () => {
    const { limiter, advance } = createLimiterWithClock(0, {
      claimTile: 1000,
    });

    // upgradeDefense should still use 200ms default
    expect(limiter.allow("p1", "upgradeDefense")).toBe(true);
    advance(200);
    expect(limiter.allow("p1", "upgradeDefense")).toBe(true);
  });
});
