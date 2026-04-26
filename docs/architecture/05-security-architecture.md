---
title: "Security Architecture"
description: "Documents the security model including session-based identity, rate limiting, input validation, and OWASP considerations."
version: "1.0.0"
date: "2026-04-26"
---

# Security Architecture

## Overview

Scrapyard Steal is a casual multiplayer game with no persistent accounts, no stored user data, and no database. The security model prioritizes preventing cheating and abuse within game sessions rather than protecting sensitive data.

## Authentication Model

**There is no authentication.** Players are identified solely by their Colyseus session ID, which is assigned on WebSocket connection.

| Aspect | Implementation |
|--------|---------------|
| Identity | Colyseus `client.sessionId` (random, per-connection) |
| Persistence | None — identity is lost on disconnect |
| Host privilege | First player to join becomes host (`hostId`) |
| Host transfer | If host disconnects during lobby, next player becomes host |

### Implications

- No user accounts, passwords, or tokens to protect
- No session hijacking risk (session IDs are ephemeral WebSocket identifiers)
- No cross-session data leakage (all state is in-memory, per-room)
- Players cannot impersonate other players within a session

## Rate Limiting

Implemented in `GameRoom` via the `checkRateLimit` method.

| Parameter | Value |
|-----------|-------|
| Minimum interval | 100 ms between same-type actions per player |
| Scope | Per player, per action type |
| Storage | `lastActionTime: Map<string, Map<string, number>>` |
| Cleanup | Entries removed on `onLeave` |

Rate-limited actions: `claimTile`, `upgradeAttack`, `upgradeDefense`, `placeDefenseBot`, `attackTile`, `upgradeCollection`, `placeCollector`, `mineGear`.

## Input Validation

### Name Sanitization

`server/logic/sanitize.ts` — `sanitizeName()`:

- Strips all characters outside printable ASCII range (`0x20`–`0x7E`)
- Trims leading/trailing whitespace
- Applied to both `adj` and `noun` fields in the `setName` handler
- Names are truncated to 16 characters before sanitization

### Bounds Checking

Every tile-coordinate message handler validates:

```
x >= 0 && x < gridWidth && y >= 0 && y < gridHeight
```

### Whitelist Validation

Configuration values are validated against explicit allow-lists:

| Config | Allowed Values |
|--------|---------------|
| `timeLimit` | `[0, 120, 300, 420, 600]` |
| `matchFormat` | `["single", "bo3", "bo5"]` |
| `gearScrapSupply` | `[50, 100, 500, 1000, 2000]` |
| `maxPlayers` | `[10, 20]` |
| `color` | Validated against `BASE_COLORS` or `ALL_COLORS` array |
| `captureResponse.choice` | `["surrender", "drop"]` |

### State Guards

Every message handler checks:

1. **Phase guard** — action only allowed in the correct phase (`"waiting"` or `"active"`)
2. **Player existence** — `this.state.players.get(client.sessionId)` must exist
3. **Absorption guard** — `player.pendingAbsorption` blocks most actions
4. **Host guard** — host-only actions check `client.sessionId === this.hostId`
5. **Team lead guard** — attack and ATK upgrade require `player.isTeamLead`
6. **Resource guard** — cost-based actions verify `player.resources >= cost`
7. **Cap guard** — stats capped at 50 (`player.attack < 50`, etc.)

## Authoritative Server Model

All game logic runs server-side. The client is a thin rendering layer.

| Concern | Server Responsibility |
|---------|----------------------|
| Tile ownership | Server validates adjacency, cost, and ownership before applying |
| Combat | `battleTick` runs server-side; client only receives flash broadcasts |
| Resource economy | Server calculates costs, deducts resources, awards income |
| AI behavior | AI actions execute in `gameTick` with the same validation as human actions |
| Win conditions | Server determines round/series winners |

The client cannot modify `GameState` directly. It can only send messages, which the server validates before applying.

## OWASP Top 10 Checklist

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01: Broken Access Control | Mitigated | Host-only actions gated by `hostId` check; team lead actions gated by `isTeamLead` |
| A02: Cryptographic Failures | N/A | No sensitive data stored or transmitted |
| A03: Injection | Mitigated | `sanitizeName` strips non-ASCII; no SQL/NoSQL; no template rendering |
| A04: Insecure Design | Low risk | Authoritative server prevents client-side cheating |
| A05: Security Misconfiguration | Monitor | `@colyseus/monitor` exposed at `/colyseus` — should be restricted in production |
| A06: Vulnerable Components | Monitor | Dependencies should be audited regularly; `npm audit` recommended |
| A07: Auth Failures | N/A | No authentication system |
| A08: Data Integrity Failures | Mitigated | Server validates all state mutations |
| A09: Logging Failures | Partial | Console logging present but no structured logging or alerting |
| A10: SSRF | N/A | No server-side HTTP requests to external services |

## Known Security Considerations

### Monitor Endpoint

The `@colyseus/monitor` dashboard at `/colyseus` exposes room state and connected clients. In production, this should be protected with authentication middleware or disabled entirely.

### Short Code Enumeration

Room short codes are 5 characters from a 32-character alphabet (~33 million combinations). While brute-force enumeration is impractical at scale, there is no rate limiting on the `/lookup` endpoint. Consider adding rate limiting if abuse is observed.

### WebSocket Origin

No origin validation is performed on WebSocket connections. Any client that knows the server URL can connect. This is acceptable for a public game but would need CORS/origin checks for a private deployment.

### Deployment Credentials

The `.colyseus-cloud.json` file contains a deployment token. This file should be in `.gitignore` for public repositories. The `wavedash.toml` contains a game ID but no secrets.
