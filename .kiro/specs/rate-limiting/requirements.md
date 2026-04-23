# Requirements Document

## Introduction

Server-side rate limiting for the Scrapyard Steal multiplayer game. Players can currently send `claimTile`, `upgradeAttack`, `upgradeDefense`, and `mineGear` messages as fast as their client allows. This creates a fairness problem: players with auto-clickers or modified clients gain an unfair advantage by spamming actions faster than intended. The Rate_Limiter will throttle these gameplay actions on the server so that each player can perform them at most once per configurable cooldown window, silently dropping excess messages.

## Glossary

- **Rate_Limiter**: A server-side module that tracks the timestamp of each player's last accepted action per action type and rejects actions that arrive before the cooldown has elapsed.
- **GameRoom**: The Colyseus Room subclass (`server/rooms/GameRoom.ts`) that hosts game state and processes all client messages.
- **Action_Type**: One of the rate-limited message types: `claimTile`, `upgradeAttack`, `upgradeDefense`, or `mineGear`.
- **Cooldown_Window**: The minimum time in milliseconds that must elapse between two accepted messages of the same Action_Type from the same player.
- **Player_Session**: A connected client identified by their Colyseus `sessionId`.
- **Throttled_Action**: A client message that arrives before the Cooldown_Window has elapsed since the last accepted message of the same Action_Type for that Player_Session.
- **Accepted_Action**: A client message that passes the rate limit check and proceeds to normal game logic.

## Requirements

### Requirement 1: Throttle Tile Claim Messages

**User Story:** As a game server operator, I want tile claim messages to be rate-limited, so that players cannot spam-click to claim tiles faster than intended.

#### Acceptance Criteria

1. WHEN a `claimTile` message is received from a Player_Session and the elapsed time since the last accepted `claimTile` from that Player_Session is less than the Cooldown_Window, THE Rate_Limiter SHALL drop the message without processing it.
2. WHEN a `claimTile` message is received from a Player_Session and the elapsed time since the last accepted `claimTile` from that Player_Session is greater than or equal to the Cooldown_Window, THE Rate_Limiter SHALL allow the message to proceed to normal claim processing.
3. WHEN a `claimTile` message is the first `claimTile` from a Player_Session (no prior timestamp recorded), THE Rate_Limiter SHALL allow the message and record the current timestamp.

### Requirement 2: Throttle Upgrade Messages

**User Story:** As a game server operator, I want upgrade messages to be rate-limited, so that players cannot spam upgrades faster than the game tick rate.

#### Acceptance Criteria

1. WHEN an `upgradeAttack` message is received from a Player_Session and the elapsed time since the last accepted `upgradeAttack` from that Player_Session is less than the Cooldown_Window, THE Rate_Limiter SHALL drop the message without processing it.
2. WHEN an `upgradeDefense` message is received from a Player_Session and the elapsed time since the last accepted `upgradeDefense` from that Player_Session is less than the Cooldown_Window, THE Rate_Limiter SHALL drop the message without processing it.
3. WHEN an `upgradeAttack` or `upgradeDefense` message passes the rate limit check, THE Rate_Limiter SHALL allow the message to proceed to normal upgrade processing and record the current timestamp.

### Requirement 3: Throttle Gear Mining Messages

**User Story:** As a game server operator, I want gear mining messages to be rate-limited, so that players cannot extract scrap faster than intended by clicking rapidly.

#### Acceptance Criteria

1. WHEN a `mineGear` message is received from a Player_Session and the elapsed time since the last accepted `mineGear` from that Player_Session is less than the Cooldown_Window, THE Rate_Limiter SHALL drop the message without processing it.
2. WHEN a `mineGear` message passes the rate limit check, THE Rate_Limiter SHALL allow the message to proceed to normal mining processing and record the current timestamp.

### Requirement 4: Per-Player Action Tracking

**User Story:** As a game server operator, I want rate limits tracked independently per player and per action type, so that one player's actions do not affect another player's ability to act.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL maintain separate timestamp records for each combination of Player_Session and Action_Type.
2. WHEN a Player_Session disconnects from the GameRoom, THE Rate_Limiter SHALL remove all timestamp records for that Player_Session.
3. WHEN a new game round starts, THE Rate_Limiter SHALL clear all timestamp records for all Player_Sessions.

### Requirement 5: Configurable Cooldown Windows

**User Story:** As a game developer, I want cooldown windows to be configurable per action type, so that I can tune rate limits during playtesting without code changes.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL accept a configuration object that specifies the Cooldown_Window in milliseconds for each Action_Type.
2. THE Rate_Limiter SHALL use a default Cooldown_Window of 200 milliseconds for `claimTile` when no configuration is provided.
3. THE Rate_Limiter SHALL use a default Cooldown_Window of 200 milliseconds for `upgradeAttack` and `upgradeDefense` when no configuration is provided.
4. THE Rate_Limiter SHALL use a default Cooldown_Window of 200 milliseconds for `mineGear` when no configuration is provided.

### Requirement 6: Silent Rejection of Throttled Actions

**User Story:** As a game designer, I want throttled actions to be silently dropped, so that the client experience is not disrupted by error messages during normal fast clicking.

#### Acceptance Criteria

1. WHEN the Rate_Limiter drops a Throttled_Action, THE GameRoom SHALL not send an error message or rejection notification to the Player_Session.
2. WHEN the Rate_Limiter drops a Throttled_Action, THE GameRoom SHALL not modify any game state (player resources, tile ownership, or stat values).

### Requirement 7: AI Players Bypass Rate Limiting

**User Story:** As a game developer, I want AI players to be exempt from rate limiting, so that server-side AI logic is not constrained by anti-spam measures designed for human clients.

#### Acceptance Criteria

1. WHEN a game action originates from the server-side AI tick logic, THE Rate_Limiter SHALL not apply cooldown checks to that action.

### Requirement 8: Rate Limiter Round-Trip Property

**User Story:** As a game developer, I want to verify that the Rate_Limiter correctly partitions actions into accepted and throttled sets, so that I can trust the throttling logic is correct.

#### Acceptance Criteria

1. FOR ALL sequences of timestamped actions for a single Player_Session and Action_Type, THE Rate_Limiter SHALL accept an action if and only if the time elapsed since the previous accepted action is greater than or equal to the Cooldown_Window or the action is the first of its type.
2. FOR ALL sequences of timestamped actions, the count of Accepted_Actions plus the count of Throttled_Actions SHALL equal the total count of input actions.
