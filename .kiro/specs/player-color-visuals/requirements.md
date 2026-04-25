# Requirements Document

## Introduction

The game currently uses hardcoded gold/yellow colors for two visual effects: claimable tile outlines and gear mine flash animations. These generic colors provide no player identity and clash with the game's core mechanic of choosing a personal color in the lobby. This feature replaces those hardcoded colors with the local player's chosen color, reinforcing ownership and visual identity during gameplay.

## Glossary

- **GridRenderer**: The client-side rendering module (`src/rendering/GridRenderer.ts`) responsible for drawing the tile grid, highlights, and animations.
- **GameScene**: The main gameplay scene (`src/scenes/GameScene.ts`) that orchestrates state updates, input handling, and delegates rendering to the GridRenderer.
- **Player_Color**: The hex color value chosen by a player in the lobby, stored as `player.color` (a numeric hex value like `0xb87333`) on the Player schema and synced to all clients via Colyseus room state.
- **Claimable_Tile**: A neutral (unowned) tile adjacent to the local player's territory that can be claimed by clicking on it.
- **Direction_Matched_Tile**: A claimable tile that falls within the player's currently selected expansion direction (north, south, east, west), rendered with higher visual emphasis.
- **Mine_Flash**: A brief animated overlay that plays on a gear tile when the player clicks to mine scrap from it.
- **Highlight_Color**: The outline color used to indicate claimable tiles around the player's territory.
- **playerColorMap**: An existing `Map<string, number>` in GridRenderer that stores each player's assigned color, populated from the synced room state.

## Requirements

### Requirement 1: Pass Player Color to Claimable Tile Highlighting

**User Story:** As a player, I want the claimable tile outlines to use my chosen color, so that the expansion hints feel like part of my territory rather than a generic gold overlay.

#### Acceptance Criteria

1. WHEN the GameScene calls the highlight method on the GridRenderer, THE GameScene SHALL pass the local player's Player_Color as a parameter.
2. IF the local player has no Player_Color assigned (color value is less than zero), THEN THE GameScene SHALL fall back to the existing default highlight color (`0xffcc44`).

### Requirement 2: Render Claimable Tile Outlines in Player Color

**User Story:** As a player, I want claimable tile outlines drawn in my color, so that I can visually distinguish my expansion options from other UI elements.

#### Acceptance Criteria

1. WHEN the GridRenderer renders a Claimable_Tile outline, THE GridRenderer SHALL use the provided player color instead of the hardcoded `0xffcc44` gold constant.
2. WHEN the GridRenderer renders a Direction_Matched_Tile outline, THE GridRenderer SHALL use a brightened variant of the provided player color instead of the hardcoded `0xffee88` brighter gold constant.
3. THE GridRenderer SHALL render Direction_Matched_Tile outlines at full opacity (1.0) and non-direction-matched Claimable_Tile outlines at reduced opacity (0.6), preserving the existing visual distinction between direction-matched and non-matched tiles.

### Requirement 3: Render Claimable Tile Cost Labels in Player Color

**User Story:** As a player, I want the cost numbers on claimable tiles to match my color, so that the cost labels are visually consistent with the tile outlines.

#### Acceptance Criteria

1. WHEN the GridRenderer renders a cost label on a Claimable_Tile, THE GridRenderer SHALL use the provided player color for the label text instead of the hardcoded `#ffcc44` gold color string.

### Requirement 4: Pass Player Color to Mine Flash Animation

**User Story:** As a player, I want the gear mining flash to use my chosen color, so that the feedback feels personal and consistent with my territory color.

#### Acceptance Criteria

1. WHEN the GameScene triggers a mine flash animation, THE GameScene SHALL pass the local player's Player_Color as a parameter to the GridRenderer.
2. IF the local player has no Player_Color assigned (color value is less than zero), THEN THE GameScene SHALL fall back to the existing default mine flash color (`0xffd700`).

### Requirement 5: Render Mine Flash Animation in Player Color

**User Story:** As a player, I want the mine flash rectangle to appear in my color, so that the mining feedback is visually tied to my identity.

#### Acceptance Criteria

1. WHEN the GridRenderer plays a Mine_Flash animation, THE GridRenderer SHALL use the provided player color for the flash rectangle instead of the hardcoded `0xffd700` gold value.
2. THE GridRenderer SHALL preserve the existing flash animation behavior: initial opacity of 0.6, scale to 1.3x, fade to 0 alpha over 300ms with Power2 easing.

### Requirement 6: Brighten Player Color for Direction-Matched Highlights

**User Story:** As a developer, I want a reliable method to brighten any player color, so that direction-matched tiles are visually distinct from regular claimable tiles regardless of which color the player chose.

#### Acceptance Criteria

1. THE GridRenderer SHALL provide a color brightening utility that lightens any given hex color value for use as the Direction_Matched_Tile highlight.
2. WHEN the brightening utility receives a dark color (e.g., `0x36454f` Tungsten), THE GridRenderer SHALL produce a visibly lighter variant.
3. WHEN the brightening utility receives an already bright color (e.g., `0xdbe4eb` Chromium), THE GridRenderer SHALL clamp channel values to a maximum of 255 to avoid overflow.
