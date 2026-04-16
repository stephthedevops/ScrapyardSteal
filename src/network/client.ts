import { Client } from "colyseus.js";

// Production server — uncomment when deploying:
// const PROD_SERVER_URL = "wss://us-ord-ef0ec457.colyseus.cloud";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

export const colyseusClient = new Client(SERVER_URL);
