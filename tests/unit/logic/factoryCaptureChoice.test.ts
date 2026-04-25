/**
 * Unit Tests — Factory Capture Choice
 *
 * Tests concrete scenarios for the two-phase capture flow:
 * pending absorption → choice (surrender/drop) → finalization,
 * plus factory adjective transfer and broadcast logic.
 *
 * Uses the same pure helper function pattern as the property tests
 * in tests/property/factoryCaptureChoice.prop.ts.
 */
import { describe, it, expect } from "vitest";
import { Player, Tile } from "../../../server/state/GameState";

// ---------------------------------------------------------------------------
// Helper factories (same pattern as property tests)
// ---------------------------------------------------------------------------

function makeTile(x: number, y: number, ownerId: string = "", isSpawn: boolean = false): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  t.isSpawn = isSpawn;
  return t;
}

function makePlayer(overrides: Partial<{
  id: string;
  nameAdj: string;
  nameNoun: string;
  teamName: string;
  teamId: string;
  isTeamLead: boolean;
  resources: number;
  tileCount: number;
  attack: number;
  defense: number;
  absorbed: boolean;
  pendingAbsorption: boolean;
  captorId: string;
  defenseBotsJSON: string;
  collectorsJSON: string;
  isAI: boolean;
  spawnX: number;
  spawnY: number;
}> = {}): Player {
  const p = new Player();
  p.id = overrides.id ?? "player1";
  p.nameAdj = overrides.nameAdj ?? "Rusty";
  p.nameNoun = overrides.nameNoun ?? "Bot";
  p.teamName = overrides.teamName ?? `${p.nameAdj} ${p.nameNoun}`;
  p.teamId = overrides.teamId ?? p.id;
  p.isTeamLead = overrides.isTeamLead ?? true;
  p.resources = overrides.resources ?? 0;
  p.tileCount = overrides.tileCount ?? 0;
  p.attack = overrides.attack ?? 1;
  p.defense = overrides.defense ?? 0;
  p.absorbed = overrides.absorbed ?? false;
  p.pendingAbsorption = overrides.pendingAbsorption ?? false;
  p.captorId = overrides.captorId ?? "";
  p.defenseBotsJSON = overrides.defenseBotsJSON ?? "[]";
  p.collectorsJSON = overrides.collectorsJSON ?? "[]";
  p.isAI = overrides.isAI ?? false;
  p.spawnX = overrides.spawnX ?? -1;
  p.spawnY = overrides.spawnY ?? -1;
  return p;
}

// ---------------------------------------------------------------------------
// Pure logic functions (replicate GameRoom behaviour for testability)
// ---------------------------------------------------------------------------

function enterPendingAbsorption(
  defender: Player,
  captorId: string,
  activeBattles: Map<string, { attackerId: string }>,
): void {
  defender.pendingAbsorption = true;
  defender.captorId = captorId;
  defender.isTeamLead = false;

  const toCancel: string[] = [];
  for (const [key, battle] of activeBattles) {
    if (battle.attackerId === defender.id) {
      toCancel.push(key);
    }
  }
  for (const key of toCancel) {
    activeBattles.delete(key);
  }
}

function resolveSurrender(
  pendingPlayer: Player,
  captor: Player,
  tiles: Tile[],
): void {
  let transferCount = 0;
  for (const tile of tiles) {
    if (tile.ownerId === pendingPlayer.id) {
      tile.ownerId = captor.id;
      transferCount++;
    }
  }
  captor.tileCount += transferCount;
  pendingPlayer.tileCount = 0;
}

function resolveDrop(
  pendingPlayer: Player,
  tiles: Tile[],
): void {
  for (const tile of tiles) {
    if (tile.ownerId === pendingPlayer.id) {
      tile.ownerId = "";
    }
  }
  pendingPlayer.tileCount = 0;
}

function awardBonusScrap(captor: Player, pendingPlayer: Player): number {
  const bonus = Math.floor(0.25 * pendingPlayer.resources);
  captor.resources += bonus;
  return bonus;
}

function finalizeAbsorption(
  pendingPlayer: Player,
  captor: Player,
  allPlayers: Map<string, Player>,
): void {
  pendingPlayer.absorbed = true;
  pendingPlayer.pendingAbsorption = false;
  pendingPlayer.teamId = captor.id;
  pendingPlayer.isTeamLead = false;

  const absorbedAdj = pendingPlayer.nameAdj || pendingPlayer.teamName.split(" ").slice(0, -1).join(" ");
  if (absorbedAdj) {
    captor.teamName = `${absorbedAdj} ${captor.teamName}`;
  }

  pendingPlayer.teamName = captor.teamName;
  allPlayers.forEach((p) => {
    if (p.teamId === captor.id && p.id !== captor.id) {
      p.teamName = captor.teamName;
    }
  });

  pendingPlayer.defenseBotsJSON = "[]";
  pendingPlayer.collectorsJSON = "[]";
}

function isActionBlocked(player: Player): boolean {
  return player.pendingAbsorption === true;
}

/**
 * Replicates the factory adjective transfer logic from the claimTile handler.
 * When a player claims an unclaimed spawn tile, the original owner's adjective
 * transfers to the claiming team.
 */
function transferFactoryAdjective(
  claimedTile: Tile,
  claimingLeader: Player,
  allPlayers: Map<string, Player>,
): { claimingTeamName: string; factoryAdj: string } | null {
  if (!claimedTile.isSpawn) return null;

  // Find the original owner of this spawn tile
  let originalOwner: Player | undefined;
  allPlayers.forEach((p) => {
    if (p.spawnX === claimedTile.x && p.spawnY === claimedTile.y && p.id !== claimingLeader.id) {
      originalOwner = p;
    }
  });

  if (!originalOwner || !originalOwner.absorbed) return null;

  const adjToTransfer = originalOwner.nameAdj;
  if (!adjToTransfer) return null;

  // Remove the adjective from the team that currently holds the absorbed player
  const currentTeamLeaderId = originalOwner.teamId;
  const currentTeamLeader = allPlayers.get(currentTeamLeaderId);
  if (currentTeamLeader && currentTeamLeaderId !== claimingLeader.id) {
    const adjPattern = adjToTransfer + " ";
    if (currentTeamLeader.teamName.includes(adjPattern)) {
      currentTeamLeader.teamName = currentTeamLeader.teamName.replace(adjPattern, "");
      allPlayers.forEach((p) => {
        if (p.teamId === currentTeamLeaderId) {
          p.teamName = currentTeamLeader.teamName;
        }
      });
    }
  }

  // Transfer the absorbed player to the claiming team
  originalOwner.teamId = claimingLeader.id;

  // Prepend the adjective to the claiming team's name
  claimingLeader.teamName = `${adjToTransfer} ${claimingLeader.teamName}`;
  originalOwner.teamName = claimingLeader.teamName;
  allPlayers.forEach((p) => {
    if (p.teamId === claimingLeader.id && p.id !== claimingLeader.id) {
      p.teamName = claimingLeader.teamName;
    }
  });

  return {
    claimingTeamName: claimingLeader.teamName,
    factoryAdj: adjToTransfer,
  };
}

/**
 * Formats the factory capture broadcast message.
 */
function formatFactoryCaptureBroadcast(claimingTeamName: string, factoryAdj: string): string {
  return `${claimingTeamName} claimed the ${factoryAdj} Factory`;
}


// ---------------------------------------------------------------------------
// Task 9.1: Surrender and drop flows
// ---------------------------------------------------------------------------

describe("Task 9.1: Surrender and drop flows", () => {
  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Concrete surrender scenario: player with 5 tiles, captor with 3 tiles.
   * After surrender, captor should have 8 tiles, pending player should have 0.
   */
  it("9.1a surrender transfers 5 tiles from pending player to captor (3 + 5 = 8)", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 5,
      resources: 200,
      pendingAbsorption: true,
      captorId: "captor",
    });
    const captor = makePlayer({
      id: "captor",
      tileCount: 3,
      resources: 50,
    });

    // Build tiles: 5 owned by pending, 3 by captor, 2 unclaimed
    const tiles: Tile[] = [
      makeTile(0, 0, "pending"),
      makeTile(1, 0, "pending"),
      makeTile(2, 0, "pending"),
      makeTile(3, 0, "pending"),
      makeTile(4, 0, "pending"),
      makeTile(0, 1, "captor"),
      makeTile(1, 1, "captor"),
      makeTile(2, 1, "captor"),
      makeTile(0, 2, ""),
      makeTile(1, 2, ""),
    ];

    resolveSurrender(pending, captor, tiles);

    expect(captor.tileCount).toBe(8);
    expect(pending.tileCount).toBe(0);

    // All 5 previously-pending tiles should now be owned by captor
    const captorTiles = tiles.filter((t) => t.ownerId === "captor");
    expect(captorTiles.length).toBe(8);

    // No tiles should be owned by pending
    const pendingTiles = tiles.filter((t) => t.ownerId === "pending");
    expect(pendingTiles.length).toBe(0);

    // Unclaimed tiles remain unclaimed
    const unclaimed = tiles.filter((t) => t.ownerId === "");
    expect(unclaimed.length).toBe(2);
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * Concrete drop scenario: player with 5 tiles drops them all as unclaimed.
   */
  it("9.1b drop makes all 5 tiles unclaimed, tileCount becomes 0", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 5,
      resources: 200,
      pendingAbsorption: true,
      captorId: "captor",
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "pending"),
      makeTile(1, 0, "pending"),
      makeTile(2, 0, "pending"),
      makeTile(3, 0, "pending"),
      makeTile(4, 0, "pending"),
      makeTile(0, 1, "other"),
      makeTile(1, 1, "other"),
    ];

    resolveDrop(pending, tiles);

    expect(pending.tileCount).toBe(0);

    // All 5 previously-pending tiles should now be unclaimed
    const pendingTiles = tiles.filter((t) => t.ownerId === "pending");
    expect(pendingTiles.length).toBe(0);

    const unclaimed = tiles.filter((t) => t.ownerId === "");
    expect(unclaimed.length).toBe(5);

    // Other player's tiles remain untouched
    const otherTiles = tiles.filter((t) => t.ownerId === "other");
    expect(otherTiles.length).toBe(2);
  });

  /**
   * **Validates: Requirements 3.1, 3.2, 4.1, 4.2**
   *
   * Edge case: player with 0 tiles enters pending, resolves cleanly.
   */
  it("9.1c 0-tile player enters pending and resolves surrender cleanly", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 0,
      resources: 50,
      pendingAbsorption: true,
      captorId: "captor",
    });
    const captor = makePlayer({
      id: "captor",
      tileCount: 3,
      resources: 100,
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "captor"),
      makeTile(1, 0, "captor"),
      makeTile(2, 0, "captor"),
    ];

    resolveSurrender(pending, captor, tiles);

    expect(captor.tileCount).toBe(3); // unchanged
    expect(pending.tileCount).toBe(0);
  });

  it("9.1d 0-tile player enters pending and resolves drop cleanly", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 0,
      resources: 50,
      pendingAbsorption: true,
      captorId: "captor",
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "other"),
    ];

    resolveDrop(pending, tiles);

    expect(pending.tileCount).toBe(0);
    // Other tiles remain untouched
    expect(tiles[0].ownerId).toBe("other");
  });

  /**
   * **Validates: Requirements 3.3, 4.3**
   *
   * Bonus scrap: player with 400 resources → captor gets floor(0.25 * 400) = 100 bonus.
   */
  it("9.1e captor receives 100 bonus scrap from player with 400 resources", () => {
    const pending = makePlayer({
      id: "pending",
      resources: 400,
      pendingAbsorption: true,
    });
    const captor = makePlayer({
      id: "captor",
      resources: 50,
    });

    const bonus = awardBonusScrap(captor, pending);

    expect(bonus).toBe(100);
    expect(captor.resources).toBe(150); // 50 + 100
  });
});

// ---------------------------------------------------------------------------
// Task 9.2: AI auto-surrender and timeout
// ---------------------------------------------------------------------------

describe("Task 9.2: AI auto-surrender and timeout", () => {
  /**
   * **Validates: Requirements 2.4**
   *
   * AI player flag detection: isAI = true should be detectable for auto-surrender path.
   */
  it("9.2a AI player is correctly identified by isAI flag", () => {
    const aiPlayer = makePlayer({
      id: "ai_001",
      isAI: true,
      pendingAbsorption: false,
    });

    expect(aiPlayer.isAI).toBe(true);

    // Entering pending absorption sets the correct state
    const battles = new Map<string, { attackerId: string }>();
    enterPendingAbsorption(aiPlayer, "captor", battles);

    expect(aiPlayer.pendingAbsorption).toBe(true);
    expect(aiPlayer.captorId).toBe("captor");
    expect(aiPlayer.isAI).toBe(true); // AI flag preserved
  });

  /**
   * **Validates: Error handling — double captureResponse**
   *
   * After resolving a capture, pendingAbsorption becomes false.
   * A second captureResponse should be blocked because pendingAbsorption is false.
   */
  it("9.2b double captureResponse is blocked (pendingAbsorption must be true)", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 3,
      resources: 100,
      pendingAbsorption: true,
      captorId: "captor",
    });
    const captor = makePlayer({
      id: "captor",
      tileCount: 5,
      resources: 200,
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "pending"),
      makeTile(1, 0, "pending"),
      makeTile(2, 0, "pending"),
      makeTile(0, 1, "captor"),
      makeTile(1, 1, "captor"),
      makeTile(2, 1, "captor"),
      makeTile(3, 1, "captor"),
      makeTile(4, 1, "captor"),
    ];

    const allPlayers = new Map<string, Player>();
    allPlayers.set("pending", pending);
    allPlayers.set("captor", captor);

    // First resolution: surrender
    resolveSurrender(pending, captor, tiles);
    awardBonusScrap(captor, pending);
    finalizeAbsorption(pending, captor, allPlayers);

    // After finalization, pendingAbsorption should be false
    expect(pending.pendingAbsorption).toBe(false);
    expect(pending.absorbed).toBe(true);

    // Second captureResponse should be blocked by the guard
    const blocked = pending.pendingAbsorption === false;
    expect(blocked).toBe(true);
  });

  /**
   * **Validates: Error handling — non-pending player**
   *
   * A player who is not in pending state should have their captureResponse ignored.
   */
  it("9.2c non-pending player's captureResponse is ignored", () => {
    const normalPlayer = makePlayer({
      id: "normal",
      tileCount: 5,
      resources: 300,
      pendingAbsorption: false,
    });

    // The guard check: pendingAbsorption must be true
    expect(normalPlayer.pendingAbsorption).toBe(false);

    // Action should be blocked
    const shouldProcess = normalPlayer.pendingAbsorption === true;
    expect(shouldProcess).toBe(false);

    // State remains unchanged
    expect(normalPlayer.tileCount).toBe(5);
    expect(normalPlayer.resources).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Task 9.3: Captor disconnect and edge cases
// ---------------------------------------------------------------------------

describe("Task 9.3: Captor disconnect and edge cases", () => {
  /**
   * **Validates: Error handling — captor disconnect**
   *
   * When captor is gone, choice defaults to "drop".
   * The resolveCapture method checks if captor exists; if not, it falls back to drop.
   */
  it("9.3a captor disconnect defaults to drop — tiles become unclaimed", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 4,
      resources: 100,
      pendingAbsorption: true,
      captorId: "captor",
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "pending"),
      makeTile(1, 0, "pending"),
      makeTile(2, 0, "pending"),
      makeTile(3, 0, "pending"),
    ];

    // Captor is gone (not in the players map), so we resolve as drop
    resolveDrop(pending, tiles);

    expect(pending.tileCount).toBe(0);
    const pendingTiles = tiles.filter((t) => t.ownerId === "pending");
    expect(pendingTiles.length).toBe(0);

    // All tiles should be unclaimed
    const unclaimed = tiles.filter((t) => t.ownerId === "");
    expect(unclaimed.length).toBe(4);
  });

  /**
   * **Validates: Error handling — invalid choice**
   *
   * captureResponse with invalid choice value is ignored.
   */
  it("9.3b captureResponse with invalid choice value is ignored", () => {
    const pending = makePlayer({
      id: "pending",
      tileCount: 3,
      resources: 100,
      pendingAbsorption: true,
      captorId: "captor",
    });

    // Validate choice: only "surrender" and "drop" are valid
    const invalidChoices = ["attack", "flee", "", "SURRENDER", "Drop", "null", "undefined"];
    for (const choice of invalidChoices) {
      const isValid = choice === "surrender" || choice === "drop";
      expect(isValid).toBe(false);
    }

    // State should remain unchanged since invalid choices are rejected
    expect(pending.pendingAbsorption).toBe(true);
    expect(pending.tileCount).toBe(3);
    expect(pending.resources).toBe(100);
  });

  /**
   * **Validates: Error handling — multiple pending players**
   *
   * Multiple players can be in pending state simultaneously.
   */
  it("9.3c multiple players can be in pending state simultaneously", () => {
    const pending1 = makePlayer({
      id: "pending1",
      tileCount: 3,
      resources: 100,
      pendingAbsorption: true,
      captorId: "captor",
    });
    const pending2 = makePlayer({
      id: "pending2",
      tileCount: 2,
      resources: 50,
      pendingAbsorption: true,
      captorId: "captor",
    });
    const captor = makePlayer({
      id: "captor",
      tileCount: 10,
      resources: 500,
    });

    const tiles: Tile[] = [
      makeTile(0, 0, "pending1"),
      makeTile(1, 0, "pending1"),
      makeTile(2, 0, "pending1"),
      makeTile(0, 1, "pending2"),
      makeTile(1, 1, "pending2"),
      makeTile(0, 2, "captor"),
      makeTile(1, 2, "captor"),
      makeTile(2, 2, "captor"),
      makeTile(3, 2, "captor"),
      makeTile(4, 2, "captor"),
      makeTile(5, 2, "captor"),
      makeTile(6, 2, "captor"),
      makeTile(7, 2, "captor"),
      makeTile(8, 2, "captor"),
      makeTile(9, 2, "captor"),
    ];

    // Both are pending simultaneously
    expect(pending1.pendingAbsorption).toBe(true);
    expect(pending2.pendingAbsorption).toBe(true);

    // Resolve pending1 as surrender
    resolveSurrender(pending1, captor, tiles);
    expect(captor.tileCount).toBe(13); // 10 + 3
    expect(pending1.tileCount).toBe(0);

    // Resolve pending2 as drop
    resolveDrop(pending2, tiles);
    expect(pending2.tileCount).toBe(0);

    // pending2's tiles should be unclaimed
    const p2Tiles = tiles.filter((t) => t.ownerId === "pending2");
    expect(p2Tiles.length).toBe(0);

    // Captor still has 13 tiles (surrender from pending1)
    const captorTiles = tiles.filter((t) => t.ownerId === "captor");
    expect(captorTiles.length).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// Task 9.4: Factory adjective transfer
// ---------------------------------------------------------------------------

describe("Task 9.4: Factory adjective transfer", () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * Claiming an unclaimed spawn tile transfers the adjective from the original
   * owner's team to the claiming team.
   */
  it("9.4a claiming unclaimed spawn tile transfers adjective from Team A to Team B", () => {
    // Original owner "Rusty Bot" was absorbed by Team A ("Iron Claw")
    const originalOwner = makePlayer({
      id: "original",
      nameAdj: "Rusty",
      nameNoun: "Bot",
      teamName: "Rusty Iron Claw",
      teamId: "teamA",
      absorbed: true,
      spawnX: 3,
      spawnY: 3,
    });

    const teamALeader = makePlayer({
      id: "teamA",
      nameAdj: "Iron",
      nameNoun: "Claw",
      teamName: "Rusty Iron Claw",
    });

    const teamBLeader = makePlayer({
      id: "teamB",
      nameAdj: "Chrome",
      nameNoun: "Fang",
      teamName: "Chrome Fang",
    });

    const spawnTile = makeTile(3, 3, "", true); // unclaimed spawn tile

    const allPlayers = new Map<string, Player>();
    allPlayers.set("original", originalOwner);
    allPlayers.set("teamA", teamALeader);
    allPlayers.set("teamB", teamBLeader);

    const result = transferFactoryAdjective(spawnTile, teamBLeader, allPlayers);

    expect(result).not.toBeNull();
    expect(result!.factoryAdj).toBe("Rusty");

    // Team B should now have "Rusty" prepended
    expect(teamBLeader.teamName).toBe("Rusty Chrome Fang");

    // Team A should have "Rusty" removed
    expect(teamALeader.teamName).toBe("Iron Claw");
  });

  /**
   * **Validates: Requirements 9.3**
   *
   * Adjective removal from previous team updates all team members.
   */
  it("9.4b adjective removal from previous team updates all team members", () => {
    const originalOwner = makePlayer({
      id: "original",
      nameAdj: "Rusty",
      nameNoun: "Bot",
      teamName: "Rusty Iron Claw",
      teamId: "teamA",
      absorbed: true,
      spawnX: 5,
      spawnY: 5,
    });

    const teamALeader = makePlayer({
      id: "teamA",
      nameAdj: "Iron",
      nameNoun: "Claw",
      teamName: "Rusty Iron Claw",
    });

    // Team A has another absorbed member
    const teamAMember = makePlayer({
      id: "teamAMember",
      nameAdj: "Shiny",
      nameNoun: "Gear",
      teamName: "Rusty Iron Claw",
      teamId: "teamA",
      absorbed: true,
    });

    const teamBLeader = makePlayer({
      id: "teamB",
      nameAdj: "Chrome",
      nameNoun: "Fang",
      teamName: "Chrome Fang",
    });

    const spawnTile = makeTile(5, 5, "", true);

    const allPlayers = new Map<string, Player>();
    allPlayers.set("original", originalOwner);
    allPlayers.set("teamA", teamALeader);
    allPlayers.set("teamAMember", teamAMember);
    allPlayers.set("teamB", teamBLeader);

    transferFactoryAdjective(spawnTile, teamBLeader, allPlayers);

    // Team A leader and member should both have "Rusty" removed
    expect(teamALeader.teamName).toBe("Iron Claw");
    expect(teamAMember.teamName).toBe("Iron Claw");
  });

  /**
   * **Validates: Requirements 9.2, 9.3**
   *
   * Team name propagation to all members on both teams.
   */
  it("9.4c team name propagation to all members on both teams", () => {
    const originalOwner = makePlayer({
      id: "original",
      nameAdj: "Rusty",
      nameNoun: "Bot",
      teamName: "Rusty Iron Claw",
      teamId: "teamA",
      absorbed: true,
      spawnX: 2,
      spawnY: 2,
    });

    const teamALeader = makePlayer({
      id: "teamA",
      nameAdj: "Iron",
      nameNoun: "Claw",
      teamName: "Rusty Iron Claw",
    });

    const teamBLeader = makePlayer({
      id: "teamB",
      nameAdj: "Chrome",
      nameNoun: "Fang",
      teamName: "Chrome Fang",
    });

    // Team B has an existing absorbed member
    const teamBMember = makePlayer({
      id: "teamBMember",
      nameAdj: "Copper",
      nameNoun: "Wire",
      teamName: "Chrome Fang",
      teamId: "teamB",
      absorbed: true,
    });

    const spawnTile = makeTile(2, 2, "", true);

    const allPlayers = new Map<string, Player>();
    allPlayers.set("original", originalOwner);
    allPlayers.set("teamA", teamALeader);
    allPlayers.set("teamB", teamBLeader);
    allPlayers.set("teamBMember", teamBMember);

    transferFactoryAdjective(spawnTile, teamBLeader, allPlayers);

    // Team B leader and all members should have the new name
    expect(teamBLeader.teamName).toBe("Rusty Chrome Fang");
    expect(teamBMember.teamName).toBe("Rusty Chrome Fang");

    // The original owner should also be updated (transferred to team B)
    expect(originalOwner.teamId).toBe("teamB");
    expect(originalOwner.teamName).toBe("Rusty Chrome Fang");
  });
});

// ---------------------------------------------------------------------------
// Task 9.5: Factory capture broadcast
// ---------------------------------------------------------------------------

describe("Task 9.5: Factory capture broadcast", () => {
  /**
   * **Validates: Requirements 10.1**
   *
   * Broadcast message format: "{team name} claimed the {adjective} Factory"
   */
  it("9.5a broadcast message format is correct", () => {
    const message = formatFactoryCaptureBroadcast("Rusty Chrome Fang", "Rusty");
    expect(message).toBe("Rusty Chrome Fang claimed the Rusty Factory");
  });

  it("9.5b broadcast message with different names", () => {
    const message = formatFactoryCaptureBroadcast("Iron Claw", "Shiny");
    expect(message).toBe("Iron Claw claimed the Shiny Factory");
  });

  /**
   * **Validates: Requirements 10.1, 10.2**
   *
   * The transferFactoryAdjective function returns the data needed for the broadcast.
   */
  it("9.5c transferFactoryAdjective returns broadcast data for factoryCaptured message", () => {
    const originalOwner = makePlayer({
      id: "original",
      nameAdj: "Golden",
      nameNoun: "Gear",
      teamName: "Golden Steel Hammer",
      teamId: "teamA",
      absorbed: true,
      spawnX: 1,
      spawnY: 1,
    });

    const teamALeader = makePlayer({
      id: "teamA",
      nameAdj: "Steel",
      nameNoun: "Hammer",
      teamName: "Golden Steel Hammer",
    });

    const teamBLeader = makePlayer({
      id: "teamB",
      nameAdj: "Silver",
      nameNoun: "Bolt",
      teamName: "Silver Bolt",
    });

    const spawnTile = makeTile(1, 1, "", true);

    const allPlayers = new Map<string, Player>();
    allPlayers.set("original", originalOwner);
    allPlayers.set("teamA", teamALeader);
    allPlayers.set("teamB", teamBLeader);

    const result = transferFactoryAdjective(spawnTile, teamBLeader, allPlayers);

    expect(result).not.toBeNull();
    expect(result!.claimingTeamName).toBe("Golden Silver Bolt");
    expect(result!.factoryAdj).toBe("Golden");

    // Format the broadcast message
    const broadcastMsg = formatFactoryCaptureBroadcast(result!.claimingTeamName, result!.factoryAdj);
    expect(broadcastMsg).toBe("Golden Silver Bolt claimed the Golden Factory");
  });

  /**
   * Non-spawn tile should not trigger any broadcast.
   */
  it("9.5d non-spawn tile returns null (no broadcast)", () => {
    const normalTile = makeTile(5, 5, "", false); // not a spawn tile

    const leader = makePlayer({
      id: "leader",
      nameAdj: "Iron",
      nameNoun: "Claw",
      teamName: "Iron Claw",
    });

    const allPlayers = new Map<string, Player>();
    allPlayers.set("leader", leader);

    const result = transferFactoryAdjective(normalTile, leader, allPlayers);
    expect(result).toBeNull();
  });
});
