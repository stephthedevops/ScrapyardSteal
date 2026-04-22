# Requirements Document — v0.5 Server Config, AI & Hints

## Introduction

This document covers the v0.5 release of Scrapyard Steal (branch `v0.5-server-config-ai-hints`). The release spans 11 tickets grouped into core gameplay priorities, bug fixes, and nice-to-have polish. Core priorities address gear respawn mechanics and server-side name sanitization. Bug fixes resolve stale color-picker state and missing gear-mining feedback. Nice-to-haves introduce a server config panel (time limit, match format, AI players), a hint button, lobby cancel/back, reroll label, and connection error handling.

## Glossary

- **GameRoom**: The Colyseus server-side room (`server/rooms/GameRoom.ts`) that manages game state, message handlers, and the game loop.
- **GameState**: The Colyseus schema (`server/state/GameState.ts`) containing `players`, `tiles`, `gridWidth`, `gridHeight`, `phase`, `timeRemaining`, and related fields.
- **Player**: A Colyseus schema object representing a human or AI participant, with fields `nameAdj`, `nameNoun`, `teamName`, `color`, `isHost`, `absorbed`, etc.
- **Tile**: A Colyseus schema object representing a single grid cell, with fields `ownerId`, `hasGear`, `gearScrap`, `isSpawn`.
- **GridManager**: Server-side module (`server/logic/GridManager.ts`) responsible for grid initialization, spawn placement, and adjacency checks.
- **LobbyScene**: The Phaser client scene (`src/scenes/LobbyScene.ts`) that renders the pre-game lobby UI including player list, color picker, and start button.
- **GameScene**: The Phaser client scene (`src/scenes/GameScene.ts`) that renders the active game grid, HUD, tooltips, and handles tile clicks.
- **MenuScene**: The Phaser client scene (`src/scenes/MenuScene.ts`) that renders the main menu with Create Game, Join Game, and How to Play buttons.
- **HUDManager**: The client-side UI manager (`src/ui/HUDManager.ts`) that renders stats, leaderboard, upgrade buttons, and notifications during gameplay.
- **GridRenderer**: The client-side renderer (`src/rendering/GridRenderer.ts`) that draws tiles, gear icons, spawn icons, highlights, and animations.
- **NetworkManager**: The Colyseus client wrapper (`src/network/NetworkManager.ts`) that exposes typed send/receive methods for all message types.
- **NameGenerator**: The client-side utility (`src/utils/nameGenerator.ts`) containing adjective/noun pools and the `generateName()` function.
- **Color_Picker**: The row of 10 color swatches in LobbyScene that lets players select a metal-themed color; taken colors display a red ✕ overlay.
- **Server_Config_Panel**: A new UI overlay accessible from the host lobby that exposes match settings (time limit, match format, AI players).
- **AI_Player**: A server-managed bot participant that occupies a player slot, has a 🤖 icon, uses the household-roid noun pool, and is controlled by the server.
- **Hint_Popup**: A small overlay triggered by a 💡 button on the game screen that shows a controls summary.
- **Gear_Tile**: A tile with `hasGear === true` and `gearScrap > 0`, displayed with a ⚙ icon.
- **Active_Player**: A player whose `absorbed` field is `false` and who still owns at least one tile.
- **Unclaimed_Tile**: A tile whose `ownerId` is the empty string `""`.

## Requirements

### Requirement 1: Gear Respawn

**User Story:** As a player, I want new gears to appear when all existing gears are depleted, so that resource mining remains viable throughout the match.

#### Acceptance Criteria

1. WHILE the GameState phase is "active", THE GameRoom SHALL check once per game tick whether any Unclaimed_Tile with `hasGear === true` and `gearScrap > 0` exists on the grid.
2. WHEN no unclaimed Gear_Tile remains on the grid, THE GameRoom SHALL start a 20-second respawn countdown.
3. WHEN the 20-second respawn countdown elapses, THE GameRoom SHALL spawn new Gear_Tiles with count equal to the number of Active_Players on random Unclaimed_Tiles that do not have `isSpawn === true`.
4. THE GameRoom SHALL set each newly spawned Gear_Tile's `gearScrap` to 50 and `hasGear` to `true`.
5. IF no Unclaimed_Tiles without `isSpawn` are available at respawn time, THEN THE GameRoom SHALL skip the respawn and re-check on the next game tick.
6. WHEN new Gear_Tiles are spawned, THE GridRenderer SHALL display the ⚙ icon on the newly spawned tiles on the next render cycle without requiring a full page refresh.

### Requirement 2: Sanitize Player Names

**User Story:** As a server operator, I want player name components to be sanitized on the server, so that control characters and malicious input cannot be broadcast to other clients.

#### Acceptance Criteria

1. WHEN the GameRoom receives a "setName" message, THE GameRoom SHALL strip all characters outside the printable ASCII range (0x20–0x7E) from both the `adj` and `noun` fields before any further processing.
2. WHEN the GameRoom receives a "setName" message, THE GameRoom SHALL trim leading and trailing whitespace from both the `adj` and `noun` fields.
3. IF the sanitized `adj` or `noun` is an empty string after stripping and trimming, THEN THE GameRoom SHALL reject the name and send a "nameRejected" message to the client.
4. THE GameRoom SHALL apply sanitization before the duplicate-name check so that visually identical names with hidden characters are correctly detected as duplicates.

### Requirement 3: Color Picker Update on Disconnect

**User Story:** As a player in the lobby, I want the color picker to immediately reflect freed colors when another player disconnects, so that I can select a newly available color.

#### Acceptance Criteria

1. WHEN a player disconnects from the GameRoom during the "waiting" phase, THE GameRoom SHALL remove that player's entry from the `players` MapSchema, which resets the color as no longer taken.
2. WHEN the LobbyScene receives a state change that removes a player, THE Color_Picker SHALL remove the red ✕ overlay from the disconnected player's previously selected color swatch within the same state-change callback.
3. WHEN a color becomes available due to a disconnect, THE Color_Picker SHALL allow any remaining player to select that color immediately without requiring a page refresh or scene restart.

### Requirement 4: Gear Mining Visual Feedback

**User Story:** As a player, I want to see a visual flash when I click a gear tile to mine it, so that I have clear feedback that my click registered.

#### Acceptance Criteria

1. WHEN a player clicks a Gear_Tile that has `gearScrap > 0` and the tile is owned by the player or unclaimed, THE GridRenderer SHALL play a brief flash animation on that tile.
2. THE flash animation SHALL use a bright overlay (white or gold at 0.6 opacity) that scales up to 1.3× and fades to 0 alpha over 300 milliseconds, consistent with the existing `playClaimAnimation` style.
3. THE flash animation SHALL play on the client that initiated the mine action, triggered locally on click before waiting for server confirmation.
4. IF the server rejects the mine action (tile already depleted or not owned), THEN THE GameScene SHALL not play any additional corrective animation; the original flash is acceptable as optimistic feedback.

### Requirement 5: Server Config Panel — Time Limit

**User Story:** As a host, I want to configure the match time limit from the lobby, so that I can run shorter or longer games.

#### Acceptance Criteria

1. WHILE the GameState phase is "waiting" and the local player is the host, THE LobbyScene SHALL display a "⚙ CONFIG" button.
2. WHEN the host clicks the "⚙ CONFIG" button, THE LobbyScene SHALL open the Server_Config_Panel as a modal overlay.
3. THE Server_Config_Panel SHALL display a time limit selector with options: 2, 5, 7, and 10 minutes.
4. THE Server_Config_Panel SHALL highlight the currently selected time limit and default to 5 minutes.
5. WHEN the host selects a time limit, THE LobbyScene SHALL send a "setConfig" message to the GameRoom with the selected time limit in seconds.
6. WHEN the GameRoom receives a "setConfig" message with a `timeLimit` field from the host, THE GameRoom SHALL update `GameState.timeRemaining` to the specified value only if the value is one of 120, 300, 420, or 600.
7. IF a non-host player sends a "setConfig" message, THEN THE GameRoom SHALL ignore the message.
8. THE Server_Config_Panel SHALL include a "CLOSE" or "DONE" button that dismisses the overlay and returns to the lobby view.

### Requirement 6: Server Config — Match Format

**User Story:** As a host, I want to choose between single match, best-of-3, and best-of-5 formats, so that the group can play a series with score tracking.

#### Acceptance Criteria

1. THE Server_Config_Panel SHALL display a match format selector with options: "Single Match", "Best of 3", and "Best of 5".
2. THE Server_Config_Panel SHALL default the match format to "Single Match".
3. WHEN the host selects a match format, THE LobbyScene SHALL send a "setConfig" message to the GameRoom with the selected format value ("single", "bo3", or "bo5").
4. WHEN the GameRoom receives a "setConfig" message with a `matchFormat` field from the host, THE GameRoom SHALL store the format on the GameState.
5. WHEN a match ends in "bo3" or "bo5" format, THE GameRoom SHALL record the round winner, increment the winner's series score, and check whether any player has reached the required win count (2 for bo3, 3 for bo5).
6. IF no player has reached the required win count after a round ends, THEN THE GameRoom SHALL reset the grid, reassign starting positions, and start a new round automatically within 5 seconds.
7. WHEN a player reaches the required win count, THE GameRoom SHALL set the phase to "ended" and broadcast the series winner along with the per-round scores.
8. WHILE a multi-round series is in progress, THE HUDManager SHALL display the current series score next to the leaderboard title.

### Requirement 7: Server Config — AI Players

**User Story:** As a host, I want to add AI-controlled players to the match, so that the game is playable and fun even with fewer human players.

#### Acceptance Criteria

1. THE Server_Config_Panel SHALL display an "AI PLAYERS" section with "+" and "−" buttons to add or remove AI players, with a maximum of 4 AI players.
2. WHEN the host adds an AI player, THE Server_Config_Panel SHALL display a color picker for that AI player, using the same 10-color palette as human players, with taken colors marked with a red ✕.
3. THE Server_Config_Panel SHALL display a 🤖 icon next to each AI player entry in the config panel.
4. WHEN the host confirms AI player settings, THE LobbyScene SHALL send an "addAI" message to the GameRoom for each AI player, including the selected color.
5. WHEN the GameRoom receives an "addAI" message from the host, THE GameRoom SHALL create a new Player entry in the GameState with a generated name and the specified color, and mark the player as AI-controlled.
6. THE LobbyScene SHALL display AI players in the player list with a 🤖 icon prefix, visible to all connected players.
7. THE NameGenerator SHALL provide a separate noun pool of 30 or more "smart" household items with a "roid" suffix (e.g., "Fridgeroid", "Toasteroid", "Blenderoid") for AI player names.
8. THE GameRoom SHALL use the same adjective pool as human players but draw nouns from the household-roid pool when generating AI player names.
9. THE GameRoom SHALL enforce that no adjective or noun is duplicated across AI players and human players within the same lobby.
10. IF the host removes an AI player, THEN THE GameRoom SHALL delete that AI Player entry from the GameState and free the associated color.

### Requirement 8: Hint Button

**User Story:** As a player, I want a hint button on the game screen that shows a quick controls summary, so that I can check the controls without leaving the game.

#### Acceptance Criteria

1. THE GameScene SHALL display a 💡 button in the lower-left corner of the screen, positioned above the identity text and below the stats panel.
2. WHEN the player clicks the 💡 button, THE GameScene SHALL display the Hint_Popup as a small overlay.
3. THE Hint_Popup SHALL contain a concise controls summary including: click to claim/mine, arrow keys for direction, Escape to clear direction, and upgrade buttons.
4. THE Hint_Popup SHALL include a "CLOSE" or "✕" button that dismisses the overlay.
5. WHILE the Hint_Popup is visible, THE GameScene SHALL continue to render the game grid and process state updates normally (the popup does not pause the game).

### Requirement 9: Cancel/Back Button on Host Lobby

**User Story:** As a host, I want a cancel/back button in the lobby, so that I can return to the main menu without starting a game.

#### Acceptance Criteria

1. THE LobbyScene SHALL display a "BACK" or "CANCEL" button visible to all players (host and non-host).
2. WHEN a player clicks the "BACK" button, THE LobbyScene SHALL disconnect from the GameRoom and transition to the MenuScene.
3. WHEN the host clicks the "BACK" button and disconnects, THE GameRoom SHALL follow existing host-migration logic: assign the next player as host, or dispose the room if no players remain.

### Requirement 10: Reroll Button Discoverability

**User Story:** As a player in the lobby, I want a visible label next to the reroll button, so that I understand what the ♻ icon does.

#### Acceptance Criteria

1. THE LobbyScene SHALL display the text "reroll" immediately to the right of the ♻ button, using the same font family and a font size of 11px in the AMBER color.
2. THE "reroll" label SHALL be non-interactive (no pointer cursor, no click handler) and serve only as a descriptive label.

### Requirement 11: Connection Error Handling

**User Story:** As a player, I want to see a clear error message if the lobby fails to connect to the server, so that I am not left on a blank screen.

#### Acceptance Criteria

1. IF the NetworkManager fails to connect to the GameRoom (create, join by code, or quick play), THEN THE LobbyScene SHALL display an error popup overlay with the message "Connection failed" and the error reason.
2. THE error popup SHALL be styled consistently with existing popups (dark background overlay, centered box, AMBER/GOLD text, monospace font).
3. WHEN the error popup is displayed, THE LobbyScene SHALL automatically transition to the MenuScene after 5 seconds.
4. THE error popup SHALL include a "BACK TO MENU" button that allows the player to return to the MenuScene immediately without waiting for the 5-second timeout.
5. IF the connection drops after initially succeeding (mid-lobby disconnect), THEN THE LobbyScene SHALL display the same error popup with the message "Disconnected from server" and auto-kick to MenuScene after 5 seconds.
