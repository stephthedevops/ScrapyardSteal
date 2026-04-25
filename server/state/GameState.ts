import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Tile extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") ownerId: string = "";
  @type("boolean") isSpawn: boolean = false;
  @type("boolean") hasGear: boolean = false;
  @type("number") gearScrap: number = 0;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") nameAdj: string = "";
  @type("string") nameNoun: string = "";
  @type("number") color: number = -1;
  @type("string") teamId: string = "";
  @type("string") teamName: string = "";
  @type("boolean") isTeamLead: boolean = true;
  @type("boolean") isHost: boolean = false;
  @type("number") resources: number = 0;
  @type("number") attack: number = 1;
  @type("number") defense: number = 0;
  @type("string") defenseBotsJSON: string = "[]";
  @type("number") collection: number = 0;
  @type("string") collectorsJSON: string = "[]";
  @type("number") tileCount: number = 1;
  @type("boolean") absorbed: boolean = false;
  @type("string") direction: string = "";
  @type("number") spawnX: number = -1;
  @type("number") spawnY: number = -1;
  @type("boolean") isAI: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Tile]) tiles = new ArraySchema<Tile>();
  @type("number") gridWidth: number = 0;
  @type("number") gridHeight: number = 0;
  @type("string") phase: string = "waiting";
  @type("string") hostId: string = "";
  @type("string") shortCode: string = "";
  @type("number") timeRemaining: number = 300;
  @type("boolean") isPublic: boolean = false;
  @type("string") matchFormat: string = "single";
  @type("number") roundNumber: number = 1;
  @type("string") seriesScoresJSON: string = "{}";
  @type("number") gearScrapSupply: number = 1000;
  @type("number") maxPlayers: number = 10;
}
