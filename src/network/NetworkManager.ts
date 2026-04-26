import { Room } from "colyseus.js";
import { colyseusClient } from "./client";
import { SERVER_HTTP_URL } from "../config/serverUrl";

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
    const res = await fetch(
      `${SERVER_HTTP_URL}/lookup?code=${shortCode.toUpperCase()}`
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

  sendStartGame(): void {
    this.room?.send("startGame", {});
  }

  sendSelectColor(color: number): void {
    this.room?.send("selectColor", { color });
  }

  sendTogglePublic(): void {
    this.room?.send("togglePublic", {});
  }

  async joinPublicRoom(): Promise<Room> {
    const res = await fetch(`${SERVER_HTTP_URL}/public`);
    if (!res.ok) {
      throw new Error("No public rooms available");
    }
    const { roomId } = await res.json();
    this.room = await colyseusClient.joinById(roomId);
    return this.room;
  }

  sendMineGear(x: number, y: number): void {
    this.room?.send("mineGear", { x, y });
  }

  sendUpgradeCollection(): void {
    this.room?.send("upgradeCollection", {});
  }

  sendPlaceCollector(x: number, y: number): void {
    this.room?.send("placeCollector", { x, y });
  }

  sendPlaceDefenseBot(x: number, y: number): void {
    this.room?.send("placeDefenseBot", { x, y });
  }

  sendAttackTile(x: number, y: number): void {
    this.room?.send("attackTile", { x, y });
  }

  sendSetName(adj: string, noun: string): void {
    this.room?.send("setName", { adj, noun });
  }

  sendSetConfig(config: { timeLimit?: number; matchFormat?: string; gearScrapSupply?: number; maxPlayers?: number }): void {
    this.room?.send("setConfig", config);
  }

  sendAddAI(color: number): void {
    this.room?.send("addAI", { color });
  }

  sendRemoveAI(aiPlayerId: string): void {
    this.room?.send("removeAI", { aiPlayerId });
  }

  sendCaptureResponse(choice: "surrender" | "drop"): void {
    this.room?.send("captureResponse", { choice });
  }

  sendLeaveGame(): void {
    this.room?.send("leaveGame", {});
  }

  onStateChange(callback: (state: any) => void): void {
    this.room?.onStateChange(callback);
  }
}
