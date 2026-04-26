/**
 * Centralized server URL configuration.
 * All client code should import from here instead of reading VITE_SERVER_URL directly.
 */
export const SERVER_WS_URL: string =
  import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

export const SERVER_HTTP_URL: string = SERVER_WS_URL
  .replace("ws://", "http://")
  .replace("wss://", "https://");
