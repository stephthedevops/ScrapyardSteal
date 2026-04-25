import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Pure-function simulations of lobby state logic for property testing.
 * These mirror the server's GameRoom.onLeave behavior without requiring
 * Colyseus room instantiation.
 */

const ALLOWED_COLORS = [
  0xb87333, 0x4a8a5e, 0xffd700, 0x8b5a2b, 0x7a3ea0,
  0x0047ab, 0xff00ff, 0xff3b30, 0xdbe4eb, 0x36454f,
];

interface LobbyPlayer {
  id: string;
  color: number;
  isHost: boolean;
  isAI: boolean;
}

/**
 * Simulate removing a player from the lobby (disconnect).
 * Returns the updated players map.
 */
function simulateDisconnect(
  players: Map<string, LobbyPlayer>,
  disconnectId: string,
  hostId: string
): { players: Map<string, LobbyPlayer>; newHostId: string } {
  players.delete(disconnectId);

  let newHostId = hostId;
  if (disconnectId === hostId) {
    const nextKey = players.keys().next().value;
    if (nextKey) {
      newHostId = nextKey;
      const nextHost = players.get(nextKey)!;
      nextHost.isHost = true;
    } else {
      newHostId = "";
    }
  }

  return { players, newHostId };
}

/** Derive the set of taken colors from the current players map. */
function getTakenColors(players: Map<string, LobbyPlayer>): Set<number> {
  const taken = new Set<number>();
  players.forEach((p) => {
    if (p.color >= 0) taken.add(p.color);
  });
  return taken;
}

describe("Feature: v05-server-config-ai-hints — Lobby State Properties", () => {
  /**
   * Property 12: Disconnect removes player from lobby
   *
   * For any player in the lobby during the "waiting" phase, when that
   * player disconnects, their entry should be removed from the players
   * MapSchema, and the set of taken colors should no longer include
   * their color.
   *
   * **Validates: Requirements 3.1**
   */
  it("Property 12: disconnecting a player removes them and frees their color", () => {
    // Generate a lobby with 1–8 players, each with a unique color
    const lobbyArb = fc
      .integer({ min: 1, max: 8 })
      .chain((count) =>
        fc
          .shuffledSubarray(ALLOWED_COLORS, {
            minLength: count,
            maxLength: count,
          })
          .map((colors) =>
            colors.map((color, i) => ({
              id: `player_${i}`,
              color,
              isHost: i === 0,
              isAI: false,
            }))
          )
      );

    fc.assert(
      fc.property(lobbyArb, (playerList) => {
        // Pick a random player to disconnect
        const disconnectIndex = Math.floor(Math.random() * playerList.length);
        const target = playerList[disconnectIndex];

        // Build the players map
        const players = new Map<string, LobbyPlayer>();
        for (const p of playerList) {
          players.set(p.id, { ...p });
        }

        const hostId = playerList[0].id;
        const removedColor = target.color;

        // Simulate disconnect
        const result = simulateDisconnect(players, target.id, hostId);

        // The disconnected player should no longer be in the map
        expect(result.players.has(target.id)).toBe(false);

        // The disconnected player's color should not be in the taken set
        const takenColors = getTakenColors(result.players);
        expect(takenColors.has(removedColor)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Host migration on disconnect
   *
   * For any lobby with more than one player, when the host disconnects,
   * the next player in the players map should be assigned as the new host.
   * If no players remain, the room should be disposed.
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 13: host disconnect migrates host to next player or disposes room", () => {
    // Generate a lobby with 2–8 players (need >1 to test migration)
    const lobbyArb = fc
      .integer({ min: 2, max: 8 })
      .chain((count) =>
        fc
          .shuffledSubarray(ALLOWED_COLORS, {
            minLength: count,
            maxLength: count,
          })
          .map((colors) =>
            colors.map((color, i) => ({
              id: `player_${i}`,
              color,
              isHost: i === 0,
              isAI: false,
            }))
          )
      );

    fc.assert(
      fc.property(lobbyArb, (playerList) => {
        const hostPlayer = playerList[0];

        // Build the players map
        const players = new Map<string, LobbyPlayer>();
        for (const p of playerList) {
          players.set(p.id, { ...p });
        }

        // Simulate host disconnect
        const result = simulateDisconnect(players, hostPlayer.id, hostPlayer.id);

        // Host should be removed
        expect(result.players.has(hostPlayer.id)).toBe(false);

        // Since we started with 2+ players, there should be a new host
        expect(result.players.size).toBeGreaterThanOrEqual(1);
        expect(result.newHostId).not.toBe("");
        expect(result.newHostId).not.toBe(hostPlayer.id);

        // The new host should exist in the map and have isHost === true
        const newHost = result.players.get(result.newHostId);
        expect(newHost).toBeDefined();
        expect(newHost!.isHost).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional edge case for Property 13: when the last player disconnects,
   * no host should be assigned (room would be disposed).
   */
  it("Property 13 (edge): solo player disconnect results in empty room", () => {
    const soloArb = fc
      .constantFrom(...ALLOWED_COLORS)
      .map((color) => ({
        id: "solo_host",
        color,
        isHost: true,
        isAI: false,
      }));

    fc.assert(
      fc.property(soloArb, (soloPlayer) => {
        const players = new Map<string, LobbyPlayer>();
        players.set(soloPlayer.id, { ...soloPlayer });

        const result = simulateDisconnect(players, soloPlayer.id, soloPlayer.id);

        // No players remain
        expect(result.players.size).toBe(0);
        // No host assigned (room would be disposed)
        expect(result.newHostId).toBe("");
      }),
      { numRuns: 100 }
    );
  });
});
