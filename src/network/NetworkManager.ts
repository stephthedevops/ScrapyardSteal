import { Room } from "colyseus.js";
import { colyseusClient } from "./client";

export class NetworkManager {
  private room: Room | null = null;

  async joinGame(): Promise<Room> {
    this.room = await colyseusClient.joinOrCreate("game");
    return this.room;
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

  onStateChange(callback: (state: any) => void): void {
    this.room?.onStateChange(callback);
  }
}
