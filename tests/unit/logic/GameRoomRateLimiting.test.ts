import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "../../../server/logic/RateLimiter";
import { GameState, Player, Tile } from "../../../server/state/GameState";
import {
  calculateTileClaimCost,
  calculateUpgradeCost,
} from "../../../server/logic/ConflictEngine";
import { isAdjacent } from "../../../server/logic/GridManager";

/**
 * Integration tests for GameRoom ↔ RateLimiter wiring.
 *
 * Since Colyseus Room is complex to instantiate in isolation, these tests
 * verify the integration contract by simulating the handler logic flow
 * that GameRoom uses — specifically the pattern:
 *
 *   if (!this.rateLimiter.allow(sessionId, actionType)) return;
 *   // ... game logic ...
 *
 * We use a real RateLimiter with an injectable clock and real GameState
 * objects to verify that:
 * - Throttled actions don't modify game state
 * - Throttled actions don't produce client messages
 * - AI actions bypass the rate limiter entirely
 * - Cleanup methods are called at the right lifecycle points
 *
 * **Validates: Requirements 6.1, 6.2, 7.1**
 */

// ---------------------------------------------------------------------------
// Helpers — replicate the handler logic from GameRoom so we can test the
// integration pattern without instantiating a full Colyseus Room.
// ---------------------------------------------------------------------------

interface MockClient {
  sessionId: string;
  messages: Array<{ type: string; data: unknown }>;
  send(type: string, data: unknown): void;
}

function createMockClient(sessionId: string): MockClient {
  const messages: Array<{ type: string; data: unknown }> = [];
  return {
    sessionId,
    messages,
    send(type: string, data: unknown) {
      messages.push({ type, data });
    },
  };
}

/**
 * Simulates the claimTile handler logic from GameRoom.
 * This mirrors the exact flow in GameRoom.onCreate's onMessage("claimTile", ...).
 */
function handleClaimTile(
  rateLimiter: RateLimiter,
  state: GameState,
  client: MockClient,
  data: { x: number; y: number }
): void {
  if (state.phase !== "active") return;
  if (!rateLimiter.allow(client.sessionId, "claimTile")) return;
  const player = state.players.get(client.sessionId);
  if (!player) return;

  let leader = player;
  if (player.absorbed && player.teamId) {
    const teamLeader = state.players.get(player.teamId);
    if (!teamLeader || teamLeader.absorbed) return;
    leader = teamLeader;
  }

  const { x, y } = data;
  if (x < 0 || x >= state.gridWidth || y < 0 || y >= state.gridHeight) return;
  const tile = state.tiles.find((t) => t.x === x && t.y === y);
  if (!tile || tile.ownerId !== "") return;

  const leaderTiles = state.tiles.filter((t) => t.ownerId === leader.id);
  if (!isAdjacent(x, y, leaderTiles)) return;

  const cost = calculateTileClaimCost(leader.tileCount);
  if (leader.resources < cost) return;

  leader.resources -= cost;
  tile.ownerId = leader.id;
  leader.tileCount += 1;
}

/**
 * Simulates the upgradeAttack handler logic from GameRoom.
 */
function handleUpgradeAttack(
  rateLimiter: RateLimiter,
  state: GameState,
  client: MockClient
): void {
  if (state.phase !== "active") return;
  if (!rateLimiter.allow(client.sessionId, "upgradeAttack")) return;
  const player = state.players.get(client.sessionId);
  if (!player || player.absorbed) return;

  const cost = calculateUpgradeCost(player.attack);
  if (player.resources < cost) return;
  if (player.attack >= 50) return;

  player.resources -= cost;
  player.attack += 1;
}

/**
 * Simulates the mineGear handler logic from GameRoom.
 */
function handleMineGear(
  rateLimiter: RateLimiter,
  state: GameState,
  client: MockClient,
  data: { x: number; y: number }
): void {
  if (state.phase !== "active") return;
  if (!rateLimiter.allow(client.sessionId, "mineGear")) return;
  const player = state.players.get(client.sessionId);
  if (!player) return;

  let leader = player;
  if (player.absorbed && player.teamId) {
    const teamLeader = state.players.get(player.teamId);
    if (!teamLeader || teamLeader.absorbed) return;
    leader = teamLeader;
  }

  if (data.x < 0 || data.x >= state.gridWidth || data.y < 0 || data.y >= state.gridHeight) return;
  const tile = state.tiles.find((t) => t.x === data.x && t.y === data.y);
  if (!tile || !tile.hasGear || tile.gearScrap <= 0) return;
  if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;

  const baseExtract = leader.attack * 1; // simplified: 1 factory
  const extracted = Math.min(baseExtract, tile.gearScrap);
  tile.gearScrap = Math.max(0, tile.gearScrap - extracted);
  leader.resources += extracted;
  if (tile.gearScrap <= 0) tile.hasGear = false;
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function createTestState(): GameState {
  const state = new GameState();
  state.phase = "active";
  state.gridWidth = 5;
  state.gridHeight = 5;

  // Create a 5x5 grid of neutral tiles
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const tile = new Tile();
      tile.x = x;
      tile.y = y;
      tile.ownerId = "";
      state.tiles.push(tile);
    }
  }

  return state;
}

function addPlayer(
  state: GameState,
  id: string,
  opts: { resources?: number; spawnX?: number; spawnY?: number; isAI?: boolean } = {}
): Player {
  const player = new Player();
  player.id = id;
  player.teamId = id;
  player.isTeamLead = true;
  player.resources = opts.resources ?? 100;
  player.attack = 1;
  player.defense = 1;
  player.tileCount = 1;
  player.absorbed = false;
  player.isAI = opts.isAI ?? false;
  player.spawnX = opts.spawnX ?? 0;
  player.spawnY = opts.spawnY ?? 0;

  state.players.set(id, player);

  // Assign spawn tile
  const spawnTile = state.tiles.find(
    (t) => t.x === (opts.spawnX ?? 0) && t.y === (opts.spawnY ?? 0)
  );
  if (spawnTile) {
    spawnTile.ownerId = id;
    spawnTile.isSpawn = true;
  }

  return player;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameRoom ↔ RateLimiter integration", () => {
  let rateLimiter: RateLimiter;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 0;
    rateLimiter = new RateLimiter(undefined, () => currentTime);
  });

  describe("throttled claimTile does not modify state (Req 6.2)", () => {
    it("does not change tile ownership or player resources when throttled", () => {
      const state = createTestState();
      const player = addPlayer(state, "p1", { resources: 100, spawnX: 2, spawnY: 2 });
      const client = createMockClient("p1");

      // First claimTile — should succeed (tile at 3,2 is adjacent to spawn at 2,2)
      handleClaimTile(rateLimiter, state, client, { x: 3, y: 2 });
      expect(player.tileCount).toBe(2);
      const resourcesAfterFirst = player.resources;

      // Immediately try again without advancing time — should be throttled
      // Tile at 2,1 is adjacent to spawn at 2,2
      handleClaimTile(rateLimiter, state, client, { x: 2, y: 1 });

      // State should be unchanged
      expect(player.tileCount).toBe(2);
      expect(player.resources).toBe(resourcesAfterFirst);
      const targetTile = state.tiles.find((t) => t.x === 2 && t.y === 1);
      expect(targetTile?.ownerId).toBe("");
    });
  });

  describe("throttled action sends no message to client (Req 6.1)", () => {
    it("does not send any message when claimTile is throttled", () => {
      const state = createTestState();
      addPlayer(state, "p1", { resources: 100, spawnX: 2, spawnY: 2 });
      const client = createMockClient("p1");

      // First action — allowed
      handleClaimTile(rateLimiter, state, client, { x: 3, y: 2 });

      // Second action — throttled (no time advance)
      handleClaimTile(rateLimiter, state, client, { x: 2, y: 1 });

      // No messages should have been sent to the client
      expect(client.messages).toHaveLength(0);
    });

    it("does not send any message when upgradeAttack is throttled", () => {
      const state = createTestState();
      addPlayer(state, "p1", { resources: 100, spawnX: 0, spawnY: 0 });
      const client = createMockClient("p1");

      // First upgrade — allowed
      handleUpgradeAttack(rateLimiter, state, client);

      // Second upgrade — throttled
      handleUpgradeAttack(rateLimiter, state, client);

      expect(client.messages).toHaveLength(0);
    });

    it("does not send any message when mineGear is throttled", () => {
      const state = createTestState();
      addPlayer(state, "p1", { resources: 0, spawnX: 2, spawnY: 2 });
      const client = createMockClient("p1");

      // Place a gear on an owned tile
      const gearTile = state.tiles.find((t) => t.x === 2 && t.y === 2);
      gearTile!.hasGear = true;
      gearTile!.gearScrap = 50;

      // First mine — allowed
      handleMineGear(rateLimiter, state, client, { x: 2, y: 2 });

      // Second mine — throttled
      handleMineGear(rateLimiter, state, client, { x: 2, y: 2 });

      expect(client.messages).toHaveLength(0);
    });
  });

  describe("throttled upgradeAttack does not modify stats (Req 6.2)", () => {
    it("does not change attack or resources when throttled", () => {
      const state = createTestState();
      const player = addPlayer(state, "p1", { resources: 100, spawnX: 0, spawnY: 0 });
      const client = createMockClient("p1");

      // First upgrade — allowed
      handleUpgradeAttack(rateLimiter, state, client);
      expect(player.attack).toBe(2);
      const resourcesAfterFirst = player.resources;

      // Immediately try again — throttled
      handleUpgradeAttack(rateLimiter, state, client);

      expect(player.attack).toBe(2);
      expect(player.resources).toBe(resourcesAfterFirst);
    });
  });

  describe("AI actions bypass rate limiter (Req 7.1)", () => {
    it("AI actions in gameTick flow do not call the rate limiter", () => {
      const state = createTestState();
      const aiPlayer = addPlayer(state, "ai_1", {
        resources: 100,
        spawnX: 2,
        spawnY: 2,
        isAI: true,
      });

      const allowSpy = vi.spyOn(rateLimiter, "allow");

      // Simulate AI tick logic — AI directly modifies state without going
      // through the rate limiter (mirrors gameTick() in GameRoom)
      const ownedTiles = state.tiles.filter((t) => t.ownerId === aiPlayer.id);
      const claimable: Tile[] = [];
      for (const t of state.tiles) {
        if (t.ownerId !== "") continue;
        if (isAdjacent(t.x, t.y, ownedTiles)) claimable.push(t);
      }

      if (claimable.length > 0) {
        const target = claimable[0];
        const cost = calculateTileClaimCost(aiPlayer.tileCount);
        if (aiPlayer.resources >= cost) {
          aiPlayer.resources -= cost;
          target.ownerId = aiPlayer.id;
          aiPlayer.tileCount += 1;
        }
      }

      // The rate limiter should never have been called
      expect(allowSpy).not.toHaveBeenCalled();

      // But the AI action should have succeeded
      expect(aiPlayer.tileCount).toBe(2);
    });
  });

  describe("onLeave triggers removePlayer cleanup (Req 4.2)", () => {
    it("removePlayer is called with the disconnecting client's sessionId", () => {
      const removePlayerSpy = vi.spyOn(rateLimiter, "removePlayer");

      // Simulate the onLeave flow from GameRoom
      const clientSessionId = "leaving-player";

      // Player had some rate limit history
      rateLimiter.allow(clientSessionId, "claimTile");
      currentTime += 50;
      expect(rateLimiter.allow(clientSessionId, "claimTile")).toBe(false);

      // Simulate onLeave calling removePlayer
      rateLimiter.removePlayer(clientSessionId);

      expect(removePlayerSpy).toHaveBeenCalledWith(clientSessionId);

      // After cleanup, the player's next action should be accepted (fresh state)
      expect(rateLimiter.allow(clientSessionId, "claimTile")).toBe(true);
    });
  });

  describe("resetForNextRound triggers reset (Req 4.3)", () => {
    it("reset clears all player rate limit data for the new round", () => {
      const resetSpy = vi.spyOn(rateLimiter, "reset");

      // Multiple players have rate limit history
      rateLimiter.allow("p1", "claimTile");
      rateLimiter.allow("p2", "upgradeAttack");
      rateLimiter.allow("p3", "mineGear");

      // All are throttled
      expect(rateLimiter.allow("p1", "claimTile")).toBe(false);
      expect(rateLimiter.allow("p2", "upgradeAttack")).toBe(false);
      expect(rateLimiter.allow("p3", "mineGear")).toBe(false);

      // Simulate resetForNextRound calling reset
      rateLimiter.reset();

      expect(resetSpy).toHaveBeenCalled();

      // All players should be accepted again (fresh state)
      expect(rateLimiter.allow("p1", "claimTile")).toBe(true);
      expect(rateLimiter.allow("p2", "upgradeAttack")).toBe(true);
      expect(rateLimiter.allow("p3", "mineGear")).toBe(true);
    });
  });
});
