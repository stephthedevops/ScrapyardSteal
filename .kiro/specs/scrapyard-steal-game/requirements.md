# Requirements Document

## Introduction

Scrapyard Steal is a multiplayer clicker/strategy game for the Gamedev.js Jam 2026 (theme: "Machines"). 10–20 players share a tile-grid scrapyard world, each controlling a stationary factory-machine. Players expand territory by claiming scrap tiles, manage a single resource, upgrade attack and defense stats, and absorb opponents rather than eliminating them. The game uses Phaser 3 + TypeScript on the client and Colyseus on the server, targeting HTML5 browsers.

## Glossary

- **Grid**: A two-dimensional array of Tiles representing the shared scrapyard world
- **Tile**: A single cell in the Grid that can be neutral or owned by a Player
- **Player**: A participant controlling a Machine in the game session
- **Machine**: The in-game entity a Player controls, represented by the cluster of Tiles the Player owns
- **Scrap**: The single resource type used for all in-game purchases and upgrades (V1)
- **Territory**: The set of contiguous Tiles owned by a single Player
- **Border**: The shared edge between two adjacent Territories belonging to different Players
- **Absorption**: The process by which a victorious Player takes over an opponent's Tiles along a contested Border
- **Neutral_Tile**: A Tile not owned by any Player, available for claiming
- **GameRoom**: The Colyseus server-side room managing a single game session
- **GameState**: The authoritative server-side schema holding all Players, Tiles, and game data
- **Client**: The Phaser 3 browser application that renders the game and sends player actions to the GameRoom

## Requirements

### Requirement 1: Game Session Lifecycle

**User Story:** As a Player, I want to join a game session and have the game start when enough players are present, so that I can play with others in a shared scrapyard world.

#### Acceptance Criteria

1. WHEN a Player connects to the GameRoom, THE GameRoom SHALL add the Player to the GameState with initial values of 0 Scrap, 1 attack, 1 defense, and 1 Tile
2. THE GameRoom SHALL support a minimum of 10 and a maximum of 20 concurrent Players per session
3. WHEN a Player disconnects from the GameRoom, THE GameRoom SHALL retain the Player's Territory as neutral Tiles claimable by other Players
4. WHEN the number of connected Players in the GameRoom reaches 2, THE GameRoom SHALL transition the game from a waiting state to an active state
5. IF a Player attempts to join a GameRoom that already contains 20 Players, THEN THE GameRoom SHALL reject the connection with a "room full" message

### Requirement 2: Grid Initialization

**User Story:** As a Player, I want the scrapyard world to be a tile grid with each player placed at a distinct starting position, so that all players begin with fair spacing.

#### Acceptance Criteria

1. WHEN the game transitions to the active state, THE GameRoom SHALL generate a Grid of Tiles sized proportionally to the number of Players (minimum 30×30 for 10 Players)
2. THE GameRoom SHALL assign each Player a starting Tile that is at least 5 Tiles away from every other Player's starting Tile
3. THE GameRoom SHALL mark all non-starting Tiles as Neutral_Tiles
4. THE Client SHALL render the Grid with visually distinct colors for each Player's Territory and a neutral color for unclaimed Tiles

### Requirement 3: Territory Expansion via Tile Claiming

**User Story:** As a Player, I want to click on neutral tiles adjacent to my territory to claim them, so that I can grow my Machine and increase my resource income.

#### Acceptance Criteria

1. WHEN a Player clicks a Neutral_Tile that is orthogonally adjacent to the Player's Territory, THE GameRoom SHALL deduct the tile-claim cost from the Player's Scrap and assign the Tile to the Player
2. IF a Player clicks a Tile that is not adjacent to the Player's Territory, THEN THE Client SHALL display a visual indicator that the action is invalid
3. IF a Player does not have enough Scrap to claim a Tile, THEN THE Client SHALL display a visual indicator that the Player lacks resources
4. WHEN a Player claims a Tile, THE GameRoom SHALL increment the Player's tileCount by 1
5. THE GameRoom SHALL calculate the tile-claim cost as a base cost of 10 Scrap multiplied by (1 + 0.02 × current tileCount), rounding down to the nearest integer

### Requirement 4: Resource Income

**User Story:** As a Player, I want to earn Scrap proportional to the number of tiles I control, so that expanding my territory rewards me with more resources.

#### Acceptance Criteria

1. THE GameRoom SHALL award each Player Scrap income equal to 1 Scrap per owned Tile at a fixed interval of once per second
2. WHEN a Player's tileCount changes, THE GameRoom SHALL update the Player's income rate to reflect the new tileCount
3. THE Client SHALL display the Player's current Scrap total and income rate in a heads-up display (HUD)

### Requirement 5: Attack Upgrade

**User Story:** As a Player, I want to spend Scrap to upgrade my attack strength, so that I can more effectively push into opponent territory along shared borders.

#### Acceptance Criteria

1. WHEN a Player requests an attack upgrade, THE GameRoom SHALL deduct the upgrade cost from the Player's Scrap and increment the Player's attack stat by 1
2. THE GameRoom SHALL calculate the attack upgrade cost as 50 Scrap multiplied by the Player's current attack value
3. IF a Player does not have enough Scrap for the attack upgrade, THEN THE Client SHALL display a visual indicator that the Player lacks resources
4. THE Client SHALL display the Player's current attack stat and the cost of the next upgrade in the HUD

### Requirement 6: Defense Upgrade

**User Story:** As a Player, I want to spend Scrap to upgrade my defense strength, so that I can resist opponents pushing into my territory.

#### Acceptance Criteria

1. WHEN a Player requests a defense upgrade, THE GameRoom SHALL deduct the upgrade cost from the Player's Scrap and increment the Player's defense stat by 1
2. THE GameRoom SHALL calculate the defense upgrade cost as 50 Scrap multiplied by the Player's current defense value
3. IF a Player does not have enough Scrap for the defense upgrade, THEN THE Client SHALL display a visual indicator that the Player lacks resources
4. THE Client SHALL display the Player's current defense stat and the cost of the next upgrade in the HUD

### Requirement 7: Border Conflict Resolution

**User Story:** As a Player, I want border conflicts with opponents to be resolved based on attack and defense stats and border length, so that strategic upgrades and positioning determine territorial outcomes.

#### Acceptance Criteria

1. THE GameRoom SHALL evaluate all Borders between opposing Players once per second during the active game state
2. WHEN two Players share a Border, THE GameRoom SHALL calculate each Player's border pressure as (attack × number of shared Border Tiles)
3. WHEN one Player's border pressure exceeds the opposing Player's (defense × number of the opponent's Border Tiles along that Border), THE GameRoom SHALL transfer one opponent Border Tile to the attacking Player per evaluation cycle
4. WHILE two Players have equal border pressure and defense along a shared Border, THE GameRoom SHALL maintain the current Border without transferring any Tiles (stalemate)
5. WHEN a Tile is transferred via border conflict, THE GameRoom SHALL update both Players' tileCounts accordingly

### Requirement 8: Player Absorption

**User Story:** As a Player, I want to absorb an opponent when I take all their tiles, so that I grow stronger by salvaging their parts.

#### Acceptance Criteria

1. WHEN a Player's tileCount reaches 0 as a result of border conflict, THE GameRoom SHALL mark the Player as absorbed
2. WHEN a Player is absorbed, THE GameRoom SHALL transfer a bonus of 25% of the absorbed Player's total accumulated Scrap (rounded down) to the absorbing Player
3. THE Client SHALL display a notification to all Players when an absorption event occurs, identifying the absorbing Player and the absorbed Player

### Requirement 9: Growth Direction Steering

**User Story:** As a Player, I want to choose a preferred expansion direction, so that I can strategically grow toward specific opponents or neutral territory.

#### Acceptance Criteria

1. WHEN a Player selects a direction on the Client (north, south, east, or west), THE Client SHALL highlight claimable Neutral_Tiles in the selected direction
2. THE Client SHALL prioritize displaying claimable Tiles in the selected direction at the top of any tile-selection interface
3. WHILE a Player has a direction selected, THE Client SHALL continue highlighting Tiles in that direction until the Player changes or clears the selection

### Requirement 10: Game State Synchronization

**User Story:** As a Player, I want the game state to stay synchronized across all clients in real time, so that every player sees the same scrapyard world.

#### Acceptance Criteria

1. THE GameRoom SHALL use the Colyseus state synchronization mechanism to broadcast GameState changes to all connected Clients
2. WHEN a Tile ownership change occurs, THE Client SHALL update the Grid rendering within one frame of receiving the state update
3. WHEN a Player's stats (Scrap, attack, defense, tileCount) change, THE Client SHALL update the HUD within one frame of receiving the state update
4. THE GameRoom SHALL process all Player actions (tile claims, upgrades) on the server and reject any Client-submitted state that conflicts with the authoritative GameState

### Requirement 11: HUD and Player Information Display

**User Story:** As a Player, I want to see my stats, resources, and a leaderboard, so that I can make informed strategic decisions.

#### Acceptance Criteria

1. THE Client SHALL display a HUD showing the Player's current Scrap, attack stat, defense stat, tileCount, and income rate
2. THE Client SHALL display a leaderboard ranking all active Players by tileCount in descending order
3. WHEN a Player's rank on the leaderboard changes, THE Client SHALL update the leaderboard within one frame of receiving the state update
4. THE Client SHALL display upgrade buttons for attack and defense with their respective costs

### Requirement 12: Visual Theming and Feedback

**User Story:** As a Player, I want the game to have a scrapyard visual theme with clear feedback for my actions, so that the game feels immersive and responsive.

#### Acceptance Criteria

1. THE Client SHALL render Tiles using an industrial/mechanical visual style consistent with the scrapyard theme (rust tones, metallic textures)
2. WHEN a Player claims a Tile, THE Client SHALL play a brief visual animation on the claimed Tile
3. WHEN a border conflict transfers a Tile, THE Client SHALL play a brief visual animation indicating the transfer
4. WHEN a Player is absorbed, THE Client SHALL play a visual effect on the absorbed Player's former Territory
5. THE Client SHALL render each Player's Machine with a distinct color or visual marker to differentiate territories on the Grid

### Requirement 13: Game State Serialization (Round-Trip)

**User Story:** As a developer, I want the GameState to serialize and deserialize correctly, so that state synchronization between server and clients is reliable.

#### Acceptance Criteria

1. THE GameState SHALL serialize all Player data (id, resources, attack, defense, tileCount) and Tile ownership data into the Colyseus schema format
2. THE Client SHALL deserialize the received GameState schema into a local representation that matches the server's authoritative state
3. FOR ALL valid GameState instances, serializing then deserializing SHALL produce an equivalent GameState object (round-trip property)
