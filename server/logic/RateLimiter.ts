/** Cooldown configuration per action type (milliseconds). */
export interface RateLimiterConfig {
  claimTile?: number;
  upgradeAttack?: number;
  upgradeDefense?: number;
  mineGear?: number;
}

/** The four rate-limited action types. */
export type ActionType = "claimTile" | "upgradeAttack" | "upgradeDefense" | "mineGear";

/** Default cooldown for all action types (ms). */
export const DEFAULT_COOLDOWN_MS = 200;

export class RateLimiter {
  private cooldowns: Record<ActionType, number>;
  private timestamps: Map<string, Map<ActionType, number>>;

  /**
   * @param config - Optional per-action cooldown overrides.
   * @param now - Optional clock function for testability (defaults to Date.now).
   */
  constructor(config?: RateLimiterConfig, private now: () => number = Date.now) {
    this.cooldowns = {
      claimTile: config?.claimTile ?? DEFAULT_COOLDOWN_MS,
      upgradeAttack: config?.upgradeAttack ?? DEFAULT_COOLDOWN_MS,
      upgradeDefense: config?.upgradeDefense ?? DEFAULT_COOLDOWN_MS,
      mineGear: config?.mineGear ?? DEFAULT_COOLDOWN_MS,
    };
    this.timestamps = new Map();
  }

  /**
   * Check whether an action should be allowed.
   * If allowed, records the current timestamp and returns true.
   * If throttled, returns false without side effects.
   */
  allow(sessionId: string, action: ActionType): boolean {
    const currentTime = this.now();
    const playerTimestamps = this.timestamps.get(sessionId);

    if (!playerTimestamps) {
      // First action of any type for this session — record and accept
      const newMap = new Map<ActionType, number>();
      newMap.set(action, currentTime);
      this.timestamps.set(sessionId, newMap);
      return true;
    }

    const lastTimestamp = playerTimestamps.get(action);

    if (lastTimestamp === undefined) {
      // First action of this type for this session — record and accept
      playerTimestamps.set(action, currentTime);
      return true;
    }

    const elapsed = currentTime - lastTimestamp;

    if (elapsed >= this.cooldowns[action]) {
      // Cooldown has elapsed — update timestamp and accept
      playerTimestamps.set(action, currentTime);
      return true;
    }

    // Throttled — return false without modifying state
    return false;
  }

  /**
   * Remove all tracking data for a player (called on disconnect).
   */
  removePlayer(sessionId: string): void {
    this.timestamps.delete(sessionId);
  }

  /**
   * Clear all tracking data (called on new round).
   */
  reset(): void {
    this.timestamps.clear();
  }
}
