# Bugfix Requirements Document

## Introduction

Non-host players in the Scrapyard Steal multiplayer lobby sometimes fail to transition from the lobby scene to the game scene when the host starts the game. The primary state change listener (`room.onStateChange`) does not reliably fire for all connected clients when the server sets `phase` from `"waiting"` to `"active"`. A 500ms polling fallback exists as a workaround, confirming the unreliability of the current approach. The root cause is that the client relies solely on Colyseus's `onStateChange` callback to detect the phase transition, rather than using a dedicated broadcast message from the server. This means non-host players may experience a delayed or missed transition, degrading the multiplayer experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the host starts the game and the server sets `phase` to `"active"` THEN non-host clients sometimes do not receive the `onStateChange` callback, causing them to remain stuck in the lobby scene

1.2 WHEN the `onStateChange` callback fails to fire for a non-host client THEN the client must rely on a 500ms polling fallback (`time.addEvent`) to detect the phase change, introducing up to 500ms of unnecessary delay before transitioning

1.3 WHEN the polling fallback detects the phase change THEN the transition occurs late, causing non-host players to miss the first moments of the game and see a desynchronized game state

### Expected Behavior (Correct)

2.1 WHEN the host starts the game and the server transitions the phase to `"active"` THEN the server SHALL broadcast a dedicated `"gameStarted"` message to all connected clients so that every client is explicitly notified of the transition

2.2 WHEN a non-host client receives the `"gameStarted"` message THEN the client SHALL immediately transition from the lobby scene to the game scene without relying on state change polling

2.3 WHEN the `"gameStarted"` message is received THEN the transition SHALL occur promptly and reliably for all connected clients, ensuring all players enter the game at approximately the same time

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the host clicks the START button THEN the system SHALL CONTINUE TO validate player names and colors before starting the game, and send `"startError"` messages when validation fails

3.2 WHEN the game transitions to the `"active"` phase THEN the server SHALL CONTINUE TO initialize the grid, assign starting positions, place gears, and start the game loop as it does today

3.3 WHEN a non-host player is in the lobby and the game has not started THEN the system SHALL CONTINUE TO display the player list, color picker, and room code, and update them via `onStateChange`

3.4 WHEN the host starts the game THEN the host client SHALL CONTINUE TO transition to the game scene correctly as it does today

3.5 WHEN a player transitions to the game scene THEN the system SHALL CONTINUE TO pass the `room`, `networkManager`, and `sessionId` data to the GameScene

---

### Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type LobbyClient
  OUTPUT: boolean
  
  // The bug affects non-host clients whose onStateChange callback
  // does not fire when the server sets phase to "active"
  RETURN X.isHost = false
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: All non-host clients transition reliably on game start
FOR ALL X WHERE isBugCondition(X) DO
  result ← lobbyTransition'(X)
  ASSERT result.transitioned = true
    AND result.trigger = "gameStarted message"
    AND result.delay < 100ms
END FOR
```

### Preservation Checking Property

```pascal
// Property: All existing lobby and game-start behavior is preserved
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
  // Host transition, name validation, grid initialization,
  // color selection, and game loop behavior remain identical
END FOR
```
