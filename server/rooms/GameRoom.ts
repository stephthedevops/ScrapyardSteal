import { Room, Client } from "colyseus";
import { GameState } from "../state/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 20;

  onCreate() {
    this.setState(new GameState());
    console.log("GameRoom created");
  }

  onJoin(client: Client) {
    console.log(`${client.sessionId} joined`);
  }

  onLeave(client: Client) {
    console.log(`${client.sessionId} left`);
  }

  onDispose() {
    console.log("GameRoom disposed");
  }
}
