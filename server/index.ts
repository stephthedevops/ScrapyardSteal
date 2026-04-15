import { Server } from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT) || 2567;

const server = new Server({
  server: createServer(),
});

server.define("game", GameRoom);

server.listen(port).then(() => {
  console.log(`Colyseus server listening on port ${port}`);
});
