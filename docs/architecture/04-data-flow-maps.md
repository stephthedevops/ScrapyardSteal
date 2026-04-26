---
title: "Data Flow Maps"
description: "Traces data flows for key game operations using sequence diagrams."
version: "1.0.0"
date: "2026-04-26"
---

# Data Flow Maps

## Overview

Scrapyard Steal uses an authoritative server architecture. All game logic runs server-side in `GameRoom`. The client sends messages via Colyseus WebSocket, the server validates and applies changes to the schema, and Colyseus automatically synchronizes state back to all clients.

## 1. Joining a Game

```mermaid
sequenceDiagram
    participant C as Client (MenuScene)
    participant N as NetworkManager
    participant H as Express REST
    participant S as GameRoom

    C->>N: createGame() or joinByShortCode(code)
    alt Join by short code
        N->>H: GET /lookup?code=XXXXX
        H-->>N: { roomId }
        N->>S: joinById(roomId)
    else Create new game
        N->>S: colyseusClient.create("game")
    end
    S->>S: onJoin(): create Player, assign host
    S-->>C: state sync (players, shortCode)
    C->>C: Transition to LobbyScene
```

## 2. Claiming a Tile

```mermaid
sequenceDiagram
    participant C as Client (GameScene)
    participant N as NetworkManager
    participant S as GameRoom
    participant St as GameState

    C->>C: handleTileClick(pointer)
    C->>N: sendClaimTile(x, y)
    N->>S: room.send("claimTile", {x, y})
    S->>S: Validate: phase, rate limit, adjacency
    S->>S: calculateTileClaimCost(tileCount)
    S->>St: Deduct resources, set tile.ownerId
    St-->>C: State sync (tile ownership, resources)
    C->>C: GridRenderer re-renders tiles
```

## 3. Attacking a Tile

```mermaid
sequenceDiagram
    participant C as Client (GameScene)
    participant N as NetworkManager
    participant S as GameRoom

    C->>N: sendAttackTile(x, y)
    N->>S: room.send("attackTile", {x, y})
    S->>S: Validate: team lead, has factory, adjacent
    S->>S: Calculate tile defense (5 + bots * 5)
    S->>S: Add to activeBattles map
    S-->>C: broadcast("battleFlash", {x, y})

    loop Every 500ms (battleTick)
        S->>S: Calculate attack pressure
        S->>S: Reduce tile defense by pressure
        S-->>C: broadcast("battleFlash", {x, y})
        alt Defense reaches 0
            S->>S: Set tile.ownerId = ""
            S->>S: Check factory loss / absorption
        end
    end
```

## 4. Mining a Gear

```mermaid
sequenceDiagram
    participant C as Client (GameScene)
    participant N as NetworkManager
    participant S as GameRoom
    participant St as GameState

    C->>C: Optimistic mine flash animation
    C->>N: sendMineGear(x, y)
    N->>S: room.send("mineGear", {x, y})
    S->>S: Validate: phase, rate limit, ownership
    S->>S: Count factories for multiplier
    S->>S: Extract min(5 * factories, gearScrap)
    S->>St: Add scrap to leader.resources
    S->>St: Reduce tile.gearScrap
    alt Gear depleted
        S->>St: Set tile.hasGear = false
    end
    St-->>C: State sync (resources, gear status)
```

## 5. Absorption Flow

```mermaid
sequenceDiagram
    participant S as GameRoom
    participant D as Defender (Player)
    participant A as Attacker (Player)
    participant C as Defender Client

    S->>S: battleTick: tile defense reaches 0
    S->>S: Defender loses last factory
    S->>D: Set pendingAbsorption = true
    S->>C: send("captureChoice", {captorTeamName, 10s})

    alt Human player responds
        C->>S: send("captureResponse", {choice})
    else Timeout (10 seconds)
        S->>S: Auto-resolve as "drop"
    else AI player
        S->>S: Auto-surrender after 2 seconds
    end

    alt Surrender
        S->>S: Transfer all tiles to attacker
        S->>A: Award 25% bonus scrap
    else Self-destruct (drop)
        S->>S: Set all tiles to unclaimed
        S-->>C: broadcast("selfDestruct", {tiles})
    end

    S->>S: finalizeAbsorption: set absorbed, update team
    S-->>C: broadcast("notification", {message})
```

## State Synchronization Model

All data flows follow the same pattern:

1. Client sends a message via `NetworkManager` (wraps `room.send()`)
2. Server validates the request in the message handler
3. Server mutates the Colyseus schema (`GameState`, `Player`, `Tile`)
4. Colyseus automatically computes binary diffs and pushes to all clients
5. Client receives updates via `room.onStateChange()` callback
6. `GameScene.onStateUpdate()` re-renders the grid and HUD

The client never directly modifies game state. The only client-side optimism is the mine flash animation, which plays immediately before server confirmation.
