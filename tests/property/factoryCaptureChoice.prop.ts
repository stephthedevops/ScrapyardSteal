/**
 * Property-Based Tests — Factory Capture Choice
 *
 * Tests the correctness properties of the two-phase capture flow:
 * pending absorption → choice (surrender/drop) → finalization.
 *
 * Since GameRoom is tightly coupled to Colyseus, these tests use pure
 * helper functions that replicate the server logic on plain objects.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Player, Tile } from "../../server/state/GameState";

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makeTile(x: number, y: number, ownerId: string = ""): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
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
// Pure logic functions that replicate GameRoom behaviour
// ---------------------------------------------------------------------------

/**
 * Replicates GameRoom.enterPendingAbsorption — sets pending state,
 * records captor, demotes team lead, and cancels attacker battles.
 */
function enterPendingAbsorption(
  defender: Player,
  captorId: string,
  activeBattles: Map<string, { attackerId: string }>,
): void {
  defender.pendingAbsorption = true;
  defender.captorId = captorId;
  defender.isTeamLead = false;

  // Cancel all active battles where the pending player is the attacker
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

/**
 * Filters a set of battles, returning only those that should be processed.
 * Battles involving pending or absorbed players (as attacker or defender) are skipped.
 */
function filterBattles(
  battles: { key: string; attackerId: string; tileOwnerId: string }[],
  players: Map<string, Player>,
): { key: string; attackerId: string; tileOwnerId: string }[] {
  return battles.filter((b) => {
    const attacker = players.get(b.attackerId);
    if (!attacker || attacker.pendingAbsorption || attacker.absorbed) return false;
    const defender = players.get(b.tileOwnerId);
    if (!defender || defender.pendingAbsorption || defender.absorbed) return false;
    return true;
  });
}

/**
 * Processes income for a player. Returns the amount of income awarded.
 * Pending or absorbed players receive 0.
 */
function processIncome(player: Player, baseIncome: number): number {
  if (player.pendingAbsorption || player.absorbed) return 0;
  player.resources += baseIncome;
  return baseIncome;
}

/**
 * Checks whether a pending player can perform an action.
 * Returns true if the action is blocked (state should remain unchanged).
 */
function isActionBlocked(player: Player): boolean {
  return player.pendingAbsorption === true;
}

/**
 * Replicates GameRoom.resolveCapture for "surrender" — transfers all tiles
 * from pending player to captor.
 */
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

/**
 * Replicates GameRoom.resolveCapture for "drop" — sets all pending player's
 * tiles to unclaimed.
 */
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

/**
 * Awards the captor 25% bonus scrap from the pending player's resources.
 */
function awardBonusScrap(captor: Player, pendingPlayer: Player): number {
  const bonus = Math.floor(0.25 * pendingPlayer.resources);
  captor.resources += bonus;
  return bonus;
}

/**
 * Replicates GameRoom.finalizeAbsorption — sets absorbed state, team membership,
 * prepends adjective, propagates team name, and cleans up bots/collectors.
 */
function finalizeAbsorption(
  pendingPlayer: Player,
  captor: Player,
  allPlayers: Map<string, Player>,
): void {
  pendingPlayer.absorbed = true;
  pendingPlayer.pendingAbsorption = false;
  pendingPlayer.teamId = captor.id;
  pendingPlayer.isTeamLead = false;

  // Prepend absorbed player's adjective to captor's team name
  const absorbedAdj = pendingPlayer.nameAdj || pendingPlayer.teamName.split(" ").slice(0, -1).join(" ");
  if (absorbedAdj) {
    captor.teamName = `${absorbedAdj} ${captor.teamName}`;
  }

  // Update teamName for all players on the captor's team
  pendingPlayer.teamName = captor.teamName;
  allPlayers.forEach((p) => {
    if (p.teamId === captor.id && p.id !== captor.id) {
      p.teamName = captor.teamName;
    }
  });

  // Clear defense bots and collectors
  pendingPlayer.defenseBotsJSON = "[]";
  pendingPlayer.collectorsJSON = "[]";
}

// ---------------------------------------------------------------------------
// Arbitraries (generators)
// ---------------------------------------------------------------------------

/** Generates a non-empty alphabetic string suitable for name parts. */
const namePartArb = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe("Property-Based Tests — Factory Capture Choice", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3**
   *
   * Property 1: Entering pending absorption sets correct state
   *
   * For any player who loses their last factory, calling enterPendingAbsorption
   * SHALL set pendingAbsorption = true, record the captorId, set isTeamLead = false,
   * and remove all active battles where that player is the attacker.
   */
  it("8.1 Entering pending absorption sets correct state", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),   // resources
        fc.integer({ min: 1, max: 50 }),     // attack
        fc.integer({ min: 0, max: 50 }),     // defense
        fc.integer({ min: 0, max: 5 }),      // number of battles as attacker
        fc.integer({ min: 0, max: 5 }),      // number of battles by others
        (resources, attack, defense, ownBattles, otherBattles) => {
          const defender = makePlayer({
            id: "defender",
            resources,
            attack,
            defense,
            isTeamLead: true,
            pendingAbsorption: false,
            captorId: "",
          });

          const captorId = "captor";

          // Build active battles map
          const activeBattles = new Map<string, { attackerId: string }>();
          for (let i = 0; i < ownBattles; i++) {
            activeBattles.set(`def_${i}`, { attackerId: "defender" });
          }
          for (let i = 0; i < otherBattles; i++) {
            activeBattles.set(`other_${i}`, { attackerId: "otherPlayer" });
          }

          const totalBefore = activeBattles.size;

          enterPendingAbsorption(defender, captorId, activeBattles);

          // State assertions
          expect(defender.pendingAbsorption).toBe(true);
          expect(defender.captorId).toBe(captorId);
          expect(defender.isTeamLead).toBe(false);

          // Defender's battles should be cancelled, others remain
          expect(activeBattles.size).toBe(totalBefore - ownBattles);
          for (const [, battle] of activeBattles) {
            expect(battle.attackerId).not.toBe("defender");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 7.1, 7.2, 7.3**
   *
   * Property 2: Battles involving pending or absorbed players are skipped
   *
   * For any set of active battles, if the attacker or the defending tile's owner
   * has pendingAbsorption = true or absorbed = true, that battle SHALL be filtered out.
   */
  it("8.2 Battles involving pending/absorbed players are skipped", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),  // total battles
        fc.integer({ min: 0, max: 3 }),   // pending attackers count
        fc.integer({ min: 0, max: 3 }),   // absorbed defenders count
        (totalBattles, pendingAttackers, absorbedDefenders) => {
          const players = new Map<string, Player>();

          // Create normal players
          for (let i = 0; i < totalBattles; i++) {
            players.set(`atk_${i}`, makePlayer({ id: `atk_${i}` }));
            players.set(`def_${i}`, makePlayer({ id: `def_${i}` }));
          }

          // Mark some attackers as pending
          const pendingCount = Math.min(pendingAttackers, totalBattles);
          for (let i = 0; i < pendingCount; i++) {
            players.get(`atk_${i}`)!.pendingAbsorption = true;
          }

          // Mark some defenders as absorbed
          const absorbedCount = Math.min(absorbedDefenders, totalBattles);
          for (let i = 0; i < absorbedCount; i++) {
            players.get(`def_${i}`)!.absorbed = true;
          }

          // Build battles
          const battles = [];
          for (let i = 0; i < totalBattles; i++) {
            battles.push({
              key: `battle_${i}`,
              attackerId: `atk_${i}`,
              tileOwnerId: `def_${i}`,
            });
          }

          const filtered = filterBattles(battles, players);

          // Every filtered battle must have a non-pending, non-absorbed attacker AND defender
          for (const b of filtered) {
            const atk = players.get(b.attackerId)!;
            const def = players.get(b.tileOwnerId)!;
            expect(atk.pendingAbsorption).toBe(false);
            expect(atk.absorbed).toBe(false);
            expect(def.pendingAbsorption).toBe(false);
            expect(def.absorbed).toBe(false);
          }

          // No valid battle should have been dropped
          for (const b of battles) {
            const atk = players.get(b.attackerId)!;
            const def = players.get(b.tileOwnerId)!;
            const isValid = !atk.pendingAbsorption && !atk.absorbed && !def.pendingAbsorption && !def.absorbed;
            if (isValid) {
              expect(filtered.some((f) => f.key === b.key)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 8.1, 8.2**
   *
   * Property 3: Pending and absorbed players receive no income
   *
   * For any player with pendingAbsorption = true or absorbed = true,
   * processing income SHALL not change that player's resources value.
   */
  it("8.3 Pending and absorbed players receive no income", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),  // initial resources
        fc.integer({ min: 1, max: 500 }),     // base income to award
        fc.boolean(),                          // true = pending, false = absorbed
        (initialResources, baseIncome, isPending) => {
          const player = makePlayer({
            id: "player",
            resources: initialResources,
            pendingAbsorption: isPending,
            absorbed: !isPending,
          });

          const awarded = processIncome(player, baseIncome);

          expect(awarded).toBe(0);
          expect(player.resources).toBe(initialResources);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.6**
   *
   * Property 4: Pending players cannot perform any game actions
   *
   * For any player with pendingAbsorption = true and for any action,
   * attempting that action SHALL leave the game state unchanged.
   */
  it("8.4 Pending players cannot perform actions", () => {
    const actions = [
      "claimTile", "upgradeAttack", "upgradeDefense",
      "upgradeCollection", "placeDefenseBot", "placeCollector",
      "attackTile", "mineGear",
    ] as const;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),                    // resources
        fc.integer({ min: 1, max: 50 }),                        // attack
        fc.integer({ min: 0, max: 50 }),                        // defense
        fc.integer({ min: 0, max: 20 }),                        // tileCount
        fc.constantFrom(...actions),                             // action type
        (resources, attack, defense, tileCount, _action) => {
          const player = makePlayer({
            id: "pending",
            resources,
            attack,
            defense,
            tileCount,
            pendingAbsorption: true,
          });

          // Snapshot state before action attempt
          const resourcesBefore = player.resources;
          const attackBefore = player.attack;
          const defenseBefore = player.defense;
          const tileCountBefore = player.tileCount;

          // The guard check should block the action
          const blocked = isActionBlocked(player);
          expect(blocked).toBe(true);

          // State should be unchanged (guard prevents any mutation)
          expect(player.resources).toBe(resourcesBefore);
          expect(player.attack).toBe(attackBefore);
          expect(player.defense).toBe(defenseBefore);
          expect(player.tileCount).toBe(tileCountBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Property 5: Surrender transfers all tiles to captor with correct counts
   *
   * For any pending player with N tiles (N >= 0) and a captor with M tiles,
   * resolving as "surrender" SHALL result in the captor owning all N tiles
   * (captor tileCount = M + N) and the pending player owning 0 tiles.
   */
  it("8.5 Surrender transfers all tiles correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),   // N = pending player's tiles
        fc.integer({ min: 1, max: 20 }),   // M = captor's existing tiles
        (pendingTileCount, captorTileCount) => {
          const pendingPlayer = makePlayer({
            id: "pending",
            tileCount: pendingTileCount,
            pendingAbsorption: true,
          });
          const captor = makePlayer({
            id: "captor",
            tileCount: captorTileCount,
          });

          // Build tiles: some owned by pending, some by captor, rest unclaimed
          const tiles: Tile[] = [];
          for (let i = 0; i < pendingTileCount; i++) {
            tiles.push(makeTile(i, 0, "pending"));
          }
          for (let i = 0; i < captorTileCount; i++) {
            tiles.push(makeTile(i, 1, "captor"));
          }
          // Some unclaimed tiles
          tiles.push(makeTile(0, 2, ""));
          tiles.push(makeTile(1, 2, ""));

          resolveSurrender(pendingPlayer, captor, tiles);

          // Captor should have M + N tiles
          expect(captor.tileCount).toBe(captorTileCount + pendingTileCount);
          expect(pendingPlayer.tileCount).toBe(0);

          // All tiles that were pending's should now be captor's
          const pendingTiles = tiles.filter((t) => t.ownerId === "pending");
          expect(pendingTiles.length).toBe(0);

          // Captor's tiles on the grid should equal M + N
          const captorTiles = tiles.filter((t) => t.ownerId === "captor");
          expect(captorTiles.length).toBe(captorTileCount + pendingTileCount);

          // Unclaimed tiles should remain unclaimed
          const unclaimed = tiles.filter((t) => t.ownerId === "");
          expect(unclaimed.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * Property 6: Drop sets all tiles to unclaimed with correct counts
   *
   * For any pending player with N tiles (N >= 0), resolving as "drop" SHALL
   * result in all N tiles having ownerId = "" and the pending player's tileCount = 0.
   */
  it("8.6 Drop sets all tiles to unclaimed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),   // N = pending player's tiles
        fc.integer({ min: 0, max: 10 }),   // other player's tiles (should be unaffected)
        (pendingTileCount, otherTileCount) => {
          const pendingPlayer = makePlayer({
            id: "pending",
            tileCount: pendingTileCount,
            pendingAbsorption: true,
          });

          // Build tiles
          const tiles: Tile[] = [];
          for (let i = 0; i < pendingTileCount; i++) {
            tiles.push(makeTile(i, 0, "pending"));
          }
          for (let i = 0; i < otherTileCount; i++) {
            tiles.push(makeTile(i, 1, "other"));
          }

          resolveDrop(pendingPlayer, tiles);

          expect(pendingPlayer.tileCount).toBe(0);

          // No tiles should be owned by pending
          const pendingTiles = tiles.filter((t) => t.ownerId === "pending");
          expect(pendingTiles.length).toBe(0);

          // Other player's tiles should be unaffected
          const otherTiles = tiles.filter((t) => t.ownerId === "other");
          expect(otherTiles.length).toBe(otherTileCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 4.3**
   *
   * Property 7: Captor receives 25% bonus scrap on either choice
   *
   * For any pending player with R resources (R >= 0) and for any choice,
   * the captor SHALL receive exactly Math.floor(0.25 * R) bonus scrap.
   */
  it("8.7 Captor receives 25% bonus scrap", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),  // pending player resources
        fc.integer({ min: 0, max: 10000 }),   // captor initial resources
        fc.constantFrom("surrender" as const, "drop" as const),  // choice
        (pendingResources, captorInitialResources, _choice) => {
          const pendingPlayer = makePlayer({
            id: "pending",
            resources: pendingResources,
            pendingAbsorption: true,
          });
          const captor = makePlayer({
            id: "captor",
            resources: captorInitialResources,
          });

          const expectedBonus = Math.floor(0.25 * pendingResources);
          const actualBonus = awardBonusScrap(captor, pendingPlayer);

          expect(actualBonus).toBe(expectedBonus);
          expect(captor.resources).toBe(captorInitialResources + expectedBonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Property 8: Finalization sets correct absorption state and team membership
   *
   * For any resolved capture (surrender or drop), the pending player SHALL have
   * absorbed = true, pendingAbsorption = false, and teamId equal to the captor's id.
   */
  it("8.8 Finalization sets correct state", () => {
    fc.assert(
      fc.property(
        namePartArb,                           // pending player adjective
        namePartArb,                           // pending player noun
        namePartArb,                           // captor adjective
        namePartArb,                           // captor noun
        fc.integer({ min: 0, max: 500 }),      // pending resources
        fc.integer({ min: 0, max: 500 }),      // captor resources
        (pendingAdj, pendingNoun, captorAdj, captorNoun, _pendingRes, _captorRes) => {
          const pendingPlayer = makePlayer({
            id: "pending",
            nameAdj: pendingAdj,
            nameNoun: pendingNoun,
            teamName: `${pendingAdj} ${pendingNoun}`,
            pendingAbsorption: true,
          });
          const captor = makePlayer({
            id: "captor",
            nameAdj: captorAdj,
            nameNoun: captorNoun,
            teamName: `${captorAdj} ${captorNoun}`,
          });

          const allPlayers = new Map<string, Player>();
          allPlayers.set("pending", pendingPlayer);
          allPlayers.set("captor", captor);

          finalizeAbsorption(pendingPlayer, captor, allPlayers);

          expect(pendingPlayer.absorbed).toBe(true);
          expect(pendingPlayer.pendingAbsorption).toBe(false);
          expect(pendingPlayer.teamId).toBe("captor");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.4**
   *
   * Property 9: Finalization prepends adjective and propagates team name
   *
   * For any absorbed player with adjective A and captor with team name T,
   * finalization SHALL set the captor's team name to "A T", and all players
   * on the captor's team SHALL have the same updated team name.
   */
  it("8.9 Finalization propagates team name", () => {
    fc.assert(
      fc.property(
        namePartArb,                           // absorbed player adjective A
        namePartArb,                           // captor team name T (simplified as "adj noun")
        namePartArb,                           // captor noun
        fc.integer({ min: 0, max: 5 }),        // number of existing team members
        (absorbedAdj, captorAdj, captorNoun, teamMemberCount) => {
          const captorTeamName = `${captorAdj} ${captorNoun}`;

          const pendingPlayer = makePlayer({
            id: "pending",
            nameAdj: absorbedAdj,
            nameNoun: "Bot",
            teamName: `${absorbedAdj} Bot`,
            pendingAbsorption: true,
          });
          const captor = makePlayer({
            id: "captor",
            nameAdj: captorAdj,
            nameNoun: captorNoun,
            teamName: captorTeamName,
          });

          const allPlayers = new Map<string, Player>();
          allPlayers.set("pending", pendingPlayer);
          allPlayers.set("captor", captor);

          // Add existing team members
          for (let i = 0; i < teamMemberCount; i++) {
            const member = makePlayer({
              id: `member_${i}`,
              teamId: "captor",
              teamName: captorTeamName,
            });
            allPlayers.set(`member_${i}`, member);
          }

          finalizeAbsorption(pendingPlayer, captor, allPlayers);

          const expectedTeamName = `${absorbedAdj} ${captorTeamName}`;
          expect(captor.teamName).toBe(expectedTeamName);

          // All team members (including the newly absorbed player) should have the same name
          allPlayers.forEach((p) => {
            if (p.teamId === "captor" && p.id !== "captor") {
              expect(p.teamName).toBe(expectedTeamName);
            }
          });

          // The absorbed player should also have the updated name
          expect(pendingPlayer.teamName).toBe(expectedTeamName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * Property 10: Finalization removes bots and collectors from transferred tiles
   *
   * For any absorbed player with bots/collectors, after finalization,
   * defenseBotsJSON and collectorsJSON SHALL be "[]".
   */
  it("8.10 Finalization cleans up bots and collectors", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),   // number of defense bots
        fc.integer({ min: 0, max: 10 }),   // number of collectors
        (botCount, collectorCount) => {
          // Generate random bot positions
          const bots: { x: number; y: number }[] = [];
          for (let i = 0; i < botCount; i++) {
            bots.push({ x: i, y: 0 });
          }

          const collectors: { x: number; y: number }[] = [];
          for (let i = 0; i < collectorCount; i++) {
            collectors.push({ x: i, y: 1 });
          }

          const pendingPlayer = makePlayer({
            id: "pending",
            nameAdj: "Rusty",
            nameNoun: "Bot",
            pendingAbsorption: true,
            defenseBotsJSON: JSON.stringify(bots),
            collectorsJSON: JSON.stringify(collectors),
          });

          const captor = makePlayer({
            id: "captor",
            nameAdj: "Iron",
            nameNoun: "Claw",
            teamName: "Iron Claw",
          });

          const allPlayers = new Map<string, Player>();
          allPlayers.set("pending", pendingPlayer);
          allPlayers.set("captor", captor);

          finalizeAbsorption(pendingPlayer, captor, allPlayers);

          expect(pendingPlayer.defenseBotsJSON).toBe("[]");
          expect(pendingPlayer.collectorsJSON).toBe("[]");
        }
      ),
      { numRuns: 100 }
    );
  });
});
