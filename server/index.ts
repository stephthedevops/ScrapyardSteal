import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define("game", GameRoom);
  },

  initializeExpress: (app) => {
    // Short code lookup
    app.get("/lookup", (req: any, res: any) => {
      const code = (String(req.query.code || "")).toUpperCase();
      const roomId = GameRoom.shortCodeMap.get(code);
      if (roomId) {
        res.json({ roomId });
      } else {
        res.status(404).json({ error: "Room not found" });
      }
    });

    // Public room finder
    app.get("/public", (_req: any, res: any) => {
      const firstPublicCode = GameRoom.publicRooms.values().next().value;
      if (firstPublicCode) {
        const roomId = GameRoom.shortCodeMap.get(firstPublicCode);
        res.json({ roomId, code: firstPublicCode });
      } else {
        res.status(404).json({ error: "No public rooms available" });
      }
    });

    // Colyseus monitor
    app.use("/colyseus", monitor());

    // Health check
    app.get("/", (_req: any, res: any) => {
      res.send("Scrapyard Steal server");
    });
  },
});
