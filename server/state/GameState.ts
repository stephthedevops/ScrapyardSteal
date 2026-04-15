import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Tile extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") ownerId: string = "";
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("number") resources: number = 0;
  @type("number") attack: number = 1;
  @type("number") defense: number = 1;
  @type("number") tileCount: number = 1;
  @type("boolean") absorbed: boolean = false;
  @type("string") direction: string = "";
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Tile]) tiles = new ArraySchema<Tile>();
  @type("number") gridWidth: number = 0;
  @type("number") gridHeight: number = 0;
  @type("string") phase: string = "waiting";
}
