import { Room } from "colyseus.js";
import { colyseusClient } from "./client";

export class NetworkManager {
  private room: Room | null = null;

  async joinGame(): Promise<Room> {
    this.room = await colyseusClient.joinOrCreate("game");
    return this.room;
  }

  async createGame(): Promise<Room> {
    this.room = await colyseusClient.create("game");
    return this.room;
  }

  async joinByShortCode(shortCode: string): Promise<Room> {
    const serverUrl =
      import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    const httpUrl = serverUrl.replace("ws://", "http://").replace("wss://", "https://");

    const res = await fetch(
      `${httpUrl}/lookup?code=${shortCode.toUpperCase()}`
    );
    if (!res.ok) {
      throw new Error("Room not found");
    }
    const { roomId } = await res.json();
    this.room = await colyseusClient.joinById(roomId);
    return this.room;
  }

  async joinById(roomId: string): Promise<Room> {
    this.room = await colyseusClient.joinById(roomId);
    return this.room;
  }

  getRoomId(): string {
    return this.room?.id || "";
  }

  sendClaimTile(x: number, y: number): void {
    this.room?.send("claimTile", { x, y });
  }

  sendUpgradeAttack(): void {
    this.room?.send("upgradeAttack", {});
  }

  sendUpgradeDefense(): void {
    this.room?.send("upgradeDefense", {});
  }

  sendSetDirection(direction: string): void {
    this.room?.send("setDirection", { direction });
  }

  sendStartGame(): void {
    this.room?.send("startGame", {});
  }

  sendSelectColor(color: number): void {
    this.room?.send("selectColor", { color });
  }

  sendMineGear(x: number, y: number): void {
    this.room?.send("mineGear", { x, y });
  }

  sendSetName(adj: string, noun: string): void {
    this.room?.send("setName", { adj, noun });
  }

  onStateChange(callback: (state: any) => void): void {
    this.room?.onStateChange(callback);
  }
}
