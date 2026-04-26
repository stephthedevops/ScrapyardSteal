import { Client } from "colyseus.js";
import { SERVER_WS_URL } from "../config/serverUrl";

export const colyseusClient = new Client(SERVER_WS_URL);
