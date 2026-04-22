import { describe, it, expect } from "vitest";
import { Player, GameState } from "../../../server/state/GameState";

describe("GameState", () => {
  it("should initialize with no players", () => {
    const state = new GameState();
    expect(state.players.size).toBe(0);
  });

  it("should add a player to the map", () => {
    const state = new GameState();
    const player = new Player();
    player.id = "player-1";
    state.players.set("player-1", player);

    expect(state.players.size).toBe(1);
    expect(state.players.get("player-1")?.id).toBe("player-1");
  });
});

describe("Player", () => {
  it("should have correct defaults", () => {
    const player = new Player();
    expect(player.resources).toBe(0);
    expect(player.attack).toBe(1);
    expect(player.defense).toBe(1);
    expect(player.tileCount).toBe(1);
  });
});
