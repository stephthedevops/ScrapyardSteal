# Requirements Document

## Introduction

When a player loses their last factory in Scrapyard Steal, the game currently absorbs them instantly in a single synchronous block within `battleTick()`. This causes race conditions: same-tick battles can transfer tiles from already-absorbed players, income can be awarded after absorption, and same-click operations can double-deduct resources.

This feature replaces instant absorption with a two-phase flow. When a player's last factory falls, they enter a `pendingAbsorption` state and are presented with a choice: surrender all tiles to the captor or drop them as unclaimed. While pending, the player is excluded from battles and income. Once the choice is made, absorption finalizes cleanly. Related adjective-transfer and broadcast mechanics are also formalized.

## Glossary

- **Game_Server**: The Colyseus server-side `GameRoom` instance that manages game state, ticks, and message handling
- **Client**: The Phaser 3 client application running in the player's browser
- **Player**: A `Player` schema object tracked in `GameState.players`, representing a human or AI participant
- **Tile**: A `Tile` schema object in the grid, with an `ownerId`, optional `isSpawn` (factory), and optional `hasGear`
- **Factory**: A Tile where `isSpawn === true`; factories enable attacking and provide income multipliers
- **Captor**: The Player whose attack caused the defending Player to lose their last factory
- **Pending_Player**: A Player whose `pendingAbsorption` flag is `true`, awaiting a surrender-or-drop choice
- **Absorption**: The process of moving a defeated Player onto the Captor's team, transferring or dropping tiles, and updating team names
- **Surrender**: The Pending_Player's choice to transfer all owned tiles to the Captor
- **Drop**: The Pending_Player's choice to set all owned tiles to unclaimed (neutral)
- **Adjective**: The `nameAdj` field on a Player, used as a prefix in team names upon absorption
- **Battle_Tick**: The 500ms server interval that processes active tile attacks
- **Game_Tick**: The 1-second server interval that processes income, AI actions, and gear spawning
- **HUD**: The client-side heads-up display managed by `HUDManager`
- **Choice_Timeout**: A server-side timer (default 10 seconds) that auto-resolves a pending choice if the player does not respond

## Requirements

### Requirement 1: Pending Absorption State

**User Story:** As a game designer, I want players who lose their last factory to enter a pending state before absorption, so that race conditions from instant absorption are eliminated.

#### Acceptance Criteria

1. WHEN a Player's last Factory tile falls to 0 defense in Battle_Tick, THE Game_Server SHALL set `pendingAbsorption = true` on the defending Player and record the Captor's id, instead of immediately absorbing the Player
2. WHEN a Player enters pending absorption, THE Game_Server SHALL cancel all active battles where the Pending_Player is the attacker
3. WHEN a Player enters pending absorption, THE Game_Server SHALL set `isTeamLead = false` on the Pending_Player
4. WHILE a Player has `pendingAbsorption = true`, THE Game_Server SHALL exclude that Player from all border conflict resolution in Battle_Tick
5. WHILE a Player has `pendingAbsorption = true`, THE Game_Server SHALL skip income awards (automine, collector income, factory passive income) for that Player in Game_Tick
6. WHILE a Player has `pendingAbsorption = true`, THE Game_Server SHALL reject `claimTile`, `upgradeAttack`, `upgradeDefense`, `upgradeCollection`, `placeDefenseBot`, `placeCollector`, `attackTile`, and `mineGear` messages from that Player

### Requirement 2: Capture Choice Prompt

**User Story:** As a player whose factory was just captured, I want to choose whether my tiles go to the captor or become neutral, so that I have agency in how my defeat affects the game.

#### Acceptance Criteria

1. WHEN a Player enters pending absorption, THE Game_Server SHALL send a `captureChoice` message to the Pending_Player's Client containing the Captor's team name
2. WHEN the Client receives a `captureChoice` message, THE HUD SHALL display a modal dialog with two buttons: "Surrender Tiles" and "Drop Tiles", along with the Captor's team name
3. WHILE the capture choice dialog is displayed, THE Client SHALL prevent all other game input (tile claims, upgrades, attacks, mining)
4. WHEN the Pending_Player is an AI, THE Game_Server SHALL automatically select "Surrender Tiles" after a 2-second delay without sending a client message

### Requirement 3: Surrender Tiles Resolution

**User Story:** As a captor, I want the defeated player's tiles to transfer to my team when they surrender, so that I gain territory from the conquest.

#### Acceptance Criteria

1. WHEN the Game_Server receives a `captureResponse` message with choice "surrender" from a Pending_Player, THE Game_Server SHALL transfer all tiles owned by the Pending_Player to the Captor by setting each tile's `ownerId` to the Captor's id
2. WHEN tiles are surrendered, THE Game_Server SHALL update the Captor's `tileCount` by adding the Pending_Player's tile count and set the Pending_Player's `tileCount` to 0
3. WHEN tiles are surrendered, THE Game_Server SHALL award the Captor bonus scrap equal to 25% of the Pending_Player's resources (floored to integer)

### Requirement 4: Drop Tiles Resolution

**User Story:** As a defeated player, I want the option to drop my tiles as neutral rather than giving them to my captor, so that I can deny territory to the enemy.

#### Acceptance Criteria

1. WHEN the Game_Server receives a `captureResponse` message with choice "drop" from a Pending_Player, THE Game_Server SHALL set all tiles owned by the Pending_Player to unclaimed by clearing each tile's `ownerId`
2. WHEN tiles are dropped, THE Game_Server SHALL set the Pending_Player's `tileCount` to 0
3. WHEN tiles are dropped, THE Game_Server SHALL award the Captor bonus scrap equal to 25% of the Pending_Player's resources (floored to integer)

### Requirement 5: Absorption Finalization

**User Story:** As a game designer, I want absorption to complete cleanly after the choice is made, so that team state is consistent.

#### Acceptance Criteria

1. WHEN a capture choice (surrender or drop) is resolved, THE Game_Server SHALL set `absorbed = true` and `pendingAbsorption = false` on the Pending_Player
2. WHEN absorption finalizes, THE Game_Server SHALL move the absorbed Player to the Captor's team by setting `teamId` to the Captor's id
3. WHEN absorption finalizes, THE Game_Server SHALL prepend the absorbed Player's `nameAdj` to the Captor's `teamName`
4. WHEN absorption finalizes, THE Game_Server SHALL update the `teamName` of all Players on the Captor's team to match the new team name
5. WHEN absorption finalizes, THE Game_Server SHALL broadcast a "team absorbed [absorbed player's adjective + noun]" notification to all Clients
6. WHEN absorption finalizes, THE Game_Server SHALL remove all defense bots and collectors placed on tiles previously owned by the absorbed Player from the absorbed Player's `defenseBotsJSON` and `collectorsJSON`

### Requirement 6: Choice Timeout

**User Story:** As a game designer, I want a timeout on the capture choice so that the game does not stall indefinitely waiting for a disconnected or unresponsive player.

#### Acceptance Criteria

1. WHEN a Player enters pending absorption, THE Game_Server SHALL start a 10-second Choice_Timeout timer
2. IF the Choice_Timeout expires before the Pending_Player responds, THEN THE Game_Server SHALL automatically resolve the choice as "drop"
3. WHEN the Client receives a `captureChoice` message, THE HUD SHALL display a countdown timer showing the remaining seconds

### Requirement 7: Same-Tick Battle Guard

**User Story:** As a game designer, I want battles involving a pending or absorbed player to be skipped, so that tile transfers cannot occur from already-defeated players.

#### Acceptance Criteria

1. WHILE processing battles in Battle_Tick, THE Game_Server SHALL skip any battle where the defending tile's owner has `pendingAbsorption = true` or `absorbed = true`
2. WHILE processing battles in Battle_Tick, THE Game_Server SHALL skip any battle where the attacker has `pendingAbsorption = true` or `absorbed = true`
3. WHEN a Player enters pending absorption during a Battle_Tick iteration, THE Game_Server SHALL cancel all remaining battles in that tick where the Pending_Player is the tile owner

### Requirement 8: Same-Tick Income Guard

**User Story:** As a game designer, I want absorbed and pending players excluded from income processing, so that no extra resources are awarded after defeat.

#### Acceptance Criteria

1. WHILE processing automine in Game_Tick, THE Game_Server SHALL skip any Player where `pendingAbsorption = true` or `absorbed = true`
2. WHILE processing collector income in Game_Tick, THE Game_Server SHALL skip any Player where `pendingAbsorption = true` or `absorbed = true`

### Requirement 9: Factory Adjective Transfer

**User Story:** As a game designer, I want adjectives to follow factory ownership, so that capturing a factory steals the associated player identity.

#### Acceptance Criteria

1. WHEN an absorbed Player's spawn Factory tile becomes unclaimed (via drop or battle), THE Game_Server SHALL remove the absorbed Player's `nameAdj` from the team that previously held the absorbed Player
2. WHEN a Player claims an unclaimed spawn Factory tile that was originally another Player's spawn, THE Game_Server SHALL transfer the original Player's `nameAdj` to the claiming Player's team name by prepending the adjective
3. WHEN a Factory adjective is transferred, THE Game_Server SHALL update the `teamName` of all Players on both the losing and gaining teams

### Requirement 10: Factory Capture Broadcast

**User Story:** As a player, I want to see a broadcast when a factory changes hands, so that I know which team gained a strategic advantage.

#### Acceptance Criteria

1. WHEN a Player claims an unclaimed spawn Factory tile that was originally another Player's spawn, THE Game_Server SHALL broadcast "{claiming team name} claimed the {original Player's nameAdj} Factory" to all Clients
2. WHEN the Client receives a factory capture broadcast, THE HUD SHALL display the message as a notification for 3 seconds

### Requirement 11: Client Choice Dialog Dismissal

**User Story:** As a player, I want the choice dialog to disappear after I make my selection, so that I can continue playing as a team member.

#### Acceptance Criteria

1. WHEN the Pending_Player clicks "Surrender Tiles", THE Client SHALL send a `captureResponse` message with choice "surrender" to the Game_Server and dismiss the dialog
2. WHEN the Pending_Player clicks "Drop Tiles", THE Client SHALL send a `captureResponse` message with choice "drop" to the Game_Server and dismiss the dialog
3. WHEN the Game_Server resolves the choice (including timeout), THE Game_Server SHALL send a `captureResolved` message to the Client
4. WHEN the Client receives a `captureResolved` message, THE HUD SHALL dismiss the capture choice dialog if still displayed
