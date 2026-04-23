# Requirements Document

## Introduction

The gear scrap value is currently hardcoded to 50 in three places in `GameRoom.ts` (`startGame()`, `gameTick()`, and `resetForNextRound()`). This feature changes the default to 1000 and makes it configurable by the host via the existing server config system. A new `gearScrapSupply` field is added to `GameState` so the value syncs to clients, and a selector is added to the LobbyScene config panel.

## Glossary

- **GameRoom**: The server-side room class (`server/rooms/GameRoom.ts`) that manages game state and runs the game loop.
- **GameState**: The Colyseus schema class (`server/state/GameState.ts`) that holds all synced game state.
- **LobbyScene**: The client-side Phaser scene (`src/scenes/LobbyScene.ts`) containing the lobby UI and config panel.
- **NetworkManager**: The client-side class (`src/network/NetworkManager.ts`) that sends messages to the server.
- **Config_Panel**: The overlay UI opened by the ⚙ CONFIG button in LobbyScene, where the host sets match options.
- **Gear_Scrap_Supply**: The configurable amount of scrap each gear tile starts with.
- **Allowed_Scrap_Values**: The set {50, 100, 500, 1000, 2000} of valid Gear_Scrap_Supply values.

## Requirements

### Requirement 1: Add gearScrapSupply to GameState

**User Story:** As a developer, I want a synced `gearScrapSupply` field on GameState, so that both server and clients know the configured gear scrap value.

#### Acceptance Criteria

1. THE GameState SHALL include a `gearScrapSupply` field of type `number` with a default value of 1000.
2. WHEN a game room is created, THE GameState SHALL have `gearScrapSupply` set to 1000.

### Requirement 2: Accept gearScrapSupply in setConfig handler

**User Story:** As a host, I want to set the gear scrap supply via the existing config system, so that I can control how much scrap each gear provides.

#### Acceptance Criteria

1. WHEN the host sends a `setConfig` message with a `gearScrapSupply` field, THE GameRoom SHALL update `GameState.gearScrapSupply` if the value is in the Allowed_Scrap_Values set.
2. IF a `setConfig` message contains a `gearScrapSupply` value not in the Allowed_Scrap_Values set, THEN THE GameRoom SHALL ignore the `gearScrapSupply` field and leave `GameState.gearScrapSupply` unchanged.
3. IF a player who is not the host sends a `setConfig` message with `gearScrapSupply`, THEN THE GameRoom SHALL ignore the message entirely.
4. WHILE the game phase is not "waiting", THE GameRoom SHALL ignore `setConfig` messages.

### Requirement 3: Replace hardcoded gear scrap values

**User Story:** As a game designer, I want all gear tile initialization to use the configured supply value, so that the host's choice is respected throughout the game.

#### Acceptance Criteria

1. WHEN `startGame()` places initial gears, THE GameRoom SHALL set each gear tile's `gearScrap` to the value of `GameState.gearScrapSupply`.
2. WHEN `gameTick()` spawns a new gear via the per-tick spawner, THE GameRoom SHALL set the new gear tile's `gearScrap` to the value of `GameState.gearScrapSupply`.
3. WHEN `resetForNextRound()` places initial gears for a new round, THE GameRoom SHALL set each gear tile's `gearScrap` to the value of `GameState.gearScrapSupply`.

### Requirement 4: Preserve configured value across rounds

**User Story:** As a host playing a best-of series, I want the gear scrap supply to persist across rounds, so that I do not have to reconfigure it each round.

#### Acceptance Criteria

1. WHEN `resetForNextRound()` is called, THE GameRoom SHALL use the same `GameState.gearScrapSupply` value that was set during the lobby phase.
2. THE GameRoom SHALL NOT reset `gearScrapSupply` to the default during `resetForNextRound()`.

### Requirement 5: Add gear scrap selector to Config Panel

**User Story:** As a host, I want a selector in the config panel to choose the gear scrap supply, so that I can configure it before starting the game.

#### Acceptance Criteria

1. WHEN the Config_Panel is opened, THE LobbyScene SHALL display a "GEAR SCRAP" section with buttons for each value in the Allowed_Scrap_Values set.
2. WHEN the host clicks a gear scrap button, THE LobbyScene SHALL send a `setConfig` message with the selected `gearScrapSupply` value via the NetworkManager.
3. THE LobbyScene SHALL highlight the currently selected gear scrap value in the Config_Panel.
4. WHEN the Config_Panel is opened, THE LobbyScene SHALL read the current `gearScrapSupply` from the room state to set the initial highlight.

### Requirement 6: Update NetworkManager for gearScrapSupply

**User Story:** As a developer, I want the NetworkManager's `sendSetConfig` method to support the `gearScrapSupply` field, so that the client can send the new config option.

#### Acceptance Criteria

1. THE NetworkManager `sendSetConfig` method SHALL accept an optional `gearScrapSupply` field of type `number` in its config parameter.
