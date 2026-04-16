import { Server } from "colyseus";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT) || 2567;

const httpServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    if (req.url?.startsWith("/lookup")) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = (url.searchParams.get("code") || "").toUpperCase();
      const roomId = GameRoom.shortCodeMap.get(code);
      if (roomId) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ roomId }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Room not found" }));
      }
      return;
    }

    if (req.url?.startsWith("/public")) {
      const firstPublicCode = GameRoom.publicRooms.values().next().value;
      if (firstPublicCode) {
        const roomId = GameRoom.shortCodeMap.get(firstPublicCode);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ roomId, code: firstPublicCode }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No public rooms available" }));
      }
      return;
    }

    res.writeHead(200);
    res.end("Scrapyard Steal server");
  }
);

const server = new Server({ server: httpServer });
server.define("game", GameRoom);

server.listen(port).then(() => {
  console.log(`Colyseus server listening on port ${port}`);
});
