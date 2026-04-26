/**
 * Centralized game balance and server configuration.
 * Adjust these values to tune gameplay without hunting through GameRoom.ts.
 */

// --- Rate Limiting ---
export const RATE_LIMIT_MS = 100;

// --- Tile Defense ---
export const BASE_TILE_DEFENSE = 5;
export const DEFENSE_PER_BOT = 5;
export const MAX_DEFENSE_BOTS_PER_TILE = 4;

// --- Mining ---
export const BASE_MINE_EXTRACT = 5;

// --- Stat Caps ---
export const MAX_STAT_VALUE = 50;

// --- Gear Spawning ---
export const GEAR_RESPAWN_DELAY_SECONDS = 20;
export const GEAR_CAP_BASE = 5;

// --- Win Condition ---
export const SOLO_TEAM_TICKS_TO_WIN = 2;

// --- AI ---
export const MAX_AI_PLAYERS = 6;
export const AI_SURRENDER_DELAY_MS = 2000;
export const CAPTURE_CHOICE_TIMEOUT_MS = 10000;

// --- Tick Intervals ---
export const GAME_TICK_MS = 1000;
export const BATTLE_TICK_MS = 500;

// --- Tile Claim Cost Formula: floor(BASE * (1 + SCALE * tileCount)) ---
export const TILE_CLAIM_COST_BASE = 10;
export const TILE_CLAIM_COST_SCALE = 0.02;

// --- Upgrade Cost Formula: BASE + (PER_LEVEL * currentStatValue) ---
export const UPGRADE_COST_BASE = 50;
export const UPGRADE_COST_PER_LEVEL = 5;

// --- Grid Size Formula: min(MAX, max(MIN, OFFSET + playerCount)) ---
export const GRID_SIZE_MIN = 12;
export const GRID_SIZE_MAX = 20;
export const GRID_SIZE_OFFSET = 10;

// --- Spawn Placement ---
export const SPAWN_MARGIN = 2;

// --- Battle Mechanics ---
/** Every this many cumulative damage dealt, 50% chance attacker loses an ATK bot */
export const ATTACKER_ATTRITION_THRESHOLD = 5;
export const ATTACKER_ATTRITION_CHANCE = 0.5;
/** Defense bot thresholds where a bot is removed (50% repair chance) */
export const DEFENSE_BOT_THRESHOLDS = [20, 15, 10, 5];
export const DEFENSE_BOT_REPAIR_CHANCE = 0.5;

// --- Capture ---
/** Percentage of absorbed player's scrap awarded to captor */
export const CAPTURE_SCRAP_BONUS_PERCENT = 0.25;

// --- Series ---
export const SERIES_ROUND_DELAY_MS = 5000;
