# Requirements Document

## Introduction

This spec covers three pre-ship polish items for the Scrapyard Steal game jam submission (April 26th). The growth direction feature (arrow key steering with DirectionFilter logic) is being removed as it is no longer part of the game design. Color selection in the lobby is being streamlined by auto-assigning a unique color to each player on join. The gear icon in scrap cost labels is being shrunk for better visual balance on the grid.

## Glossary

- **DirectionFilter**: The client-side module (`src/logic/DirectionFilter.ts`) that filters claimable tiles by cardinal direction relative to the player's territory centroid. Being removed entirely.
- **GameScene**: The main gameplay scene (`src/scenes/GameScene.ts`) that handles input, state updates, and rendering delegation.
- **GameRoom**: The Colyseus server-side room (`server/rooms/GameRoom.ts`) that manages game state, message handlers, and player lifecycle.
- **Player_Schema**: The Colyseus schema class (`server/state/GameState.ts`) defining synced player fields including `direction` and `color`.
- **LobbyScene**: The client-side lobby scene (`src/scenes/LobbyScene.ts`) where players wait, pick names, pick colors, and the host starts the game.
- **GridRenderer**: The client-side rendering module (`src/rendering/GridRenderer.ts`) responsible for drawing tiles, highlights, icons, and cost labels.
- **NetworkManager**: The client-side network abstraction (`src/network/NetworkManager.ts`) that sends messages to the Colyseus server.
- **HUDManager**: The client-side HUD module (`src/ui/HUDManager.ts`) that renders stats, leaderboard, notifications, and upgrade buttons.
- **Color_Palette**: The set of 10 base colors (or 20 in extended mode) available for player assignment, defined identically on both server and client.
- **Scrap_Cost_Label**: The text label rendered on each claimable tile showing the scrap cost to claim it, currently formatted as `-{cost}⚙️`.
- **Hint_Popup**: The in-game help overlay triggered by the 💡 button in GameScene, showing control instructions.

## Requirements

### Requirement 1: Remove DirectionFilter Module

**User Story:** As a developer, I want the DirectionFilter module removed, so that the codebase no longer contains unused direction filtering logic.

#### Acceptance Criteria

1. THE Build_System SHALL compile successfully without the `src/logic/DirectionFilter.ts` file present.
2. THE GameScene SHALL not import or reference the DirectionFilter module.

### Requirement 2: Remove Direction Key Listeners from GameScene

**User Story:** As a player, I want arrow keys to have no gameplay effect, so that pressing them does not trigger any direction-related behavior.

#### Acceptance Criteria

1. THE GameScene SHALL not register keyboard listeners for arrow keys (up, down, left, right) that set a growth direction.
2. THE GameScene SHALL not store or track a `currentDirection` state variable for tile filtering purposes.
3. THE GameScene SHALL not call `sendSetDirection` on the NetworkManager.

### Requirement 3: Remove Server-Side Direction Handling

**User Story:** As a developer, I want the server to stop processing direction messages, so that the server has no unused message handlers.

#### Acceptance Criteria

1. THE GameRoom SHALL not register a `setDirection` message handler.
2. WHEN a player joins the game, THE GameRoom SHALL not initialize the `direction` field on the Player_Schema to any value used for direction filtering.

### Requirement 4: Remove Direction Parameter from Highlight Rendering

**User Story:** As a developer, I want the highlight rendering to stop accepting a direction parameter, so that all claimable tiles are rendered with uniform emphasis.

#### Acceptance Criteria

1. WHEN the GridRenderer renders claimable tile outlines, THE GridRenderer SHALL render all outlines with the same opacity and color (no direction-based brightness distinction).
2. THE GridRenderer SHALL not contain a method that checks whether a tile lies in a given cardinal direction.

### Requirement 5: Remove Direction References from NetworkManager

**User Story:** As a developer, I want the NetworkManager cleaned of direction methods, so that the client API has no unused direction-related calls.

#### Acceptance Criteria

1. THE NetworkManager SHALL not contain a `sendSetDirection` method.

### Requirement 6: Remove Direction References from Hint Popup

**User Story:** As a player, I want the help popup to show only current controls, so that I am not confused by references to removed features.

#### Acceptance Criteria

1. THE Hint_Popup in GameScene SHALL not mention arrow keys, direction steering, or growth direction in its control instructions.

### Requirement 7: Remove Direction-Related Tests

**User Story:** As a developer, I want direction-related test files removed, so that the test suite does not contain tests for deleted functionality.

#### Acceptance Criteria

1. THE test suite SHALL not contain test files for the DirectionFilter module (both unit and property tests).
2. THE test suite SHALL pass after the DirectionFilter test files are removed.

### Requirement 8: Auto-Assign Unique Color on Lobby Join

**User Story:** As a player, I want to receive a unique color automatically when I join the lobby, so that I can start playing without manually picking one.

#### Acceptance Criteria

1. WHEN a player joins the GameRoom during the waiting phase, THE GameRoom SHALL assign the player a color from the Color_Palette that is not already taken by another player.
2. WHEN all colors in the Color_Palette are taken, THE GameRoom SHALL leave the player's color unassigned (value -1).
3. WHEN an AI player is added to the lobby, THE GameRoom SHALL assign the AI a color from the Color_Palette that is not already taken, using the same auto-assignment logic as human players.
4. THE GameRoom SHALL preserve the existing `selectColor` message handler so that players can still manually change their color after auto-assignment.

### Requirement 9: Auto-Assign Colors Respecting Max Player Mode

**User Story:** As a host, I want auto-assigned colors to respect the current max player setting, so that extended colors are only used when 20-player mode is active.

#### Acceptance Criteria

1. WHILE the maxPlayers setting is 10, THE GameRoom SHALL auto-assign colors only from the 10-color base palette.
2. WHILE the maxPlayers setting is 20, THE GameRoom SHALL auto-assign colors from the full 20-color extended palette.

### Requirement 10: Shrink Gear Icon in Scrap Cost Label

**User Story:** As a player, I want the gear icon in the scrap cost label to be smaller, so that the cost number is easier to read and the label has better visual balance.

#### Acceptance Criteria

1. WHEN the GridRenderer renders a Scrap_Cost_Label on a claimable tile, THE GridRenderer SHALL display the gear icon at a smaller font size than the cost number text.
2. THE GridRenderer SHALL keep the cost number text at the current font size (calculated as `Math.max(8, Math.floor(tileSize * 0.385))`).

