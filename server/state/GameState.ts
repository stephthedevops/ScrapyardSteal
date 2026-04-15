import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("number") resources: number = 0;
  @type("number") attack: number = 1;
  @type("number") defense: number = 1;
  @type("number") tileCount: number = 1;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
