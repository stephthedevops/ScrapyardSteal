# Requirements Document

## Introduction

This feature bundles three economy rebalance changes from Nathan's playtesting feedback into a single coordinated update. The current economy has three pain points: (1) upgrade costs scale linearly (`50 × level`), making late-game upgrades trivially cheap relative to income — a percentage-based compound formula creates a more satisfying cost curve; (2) players have no passive income, forcing constant clicking on gear piles as the sole scrap source — factories should auto-generate scrap each tick; (3) gear scrap piles are hardcoded to 50 and not configurable — the host should be able to tune scrap supply via the existing server config panel, with a much higher default of 1000.

## Glossary

- **Game_Room**: The Colyseus server-side room (`server/rooms/GameRoom.ts`) that manages game state, message handlers, and the game tick loop.
- **Game_State**: The synchronized schema (`server/state/GameState.ts`) containing players, tiles, grid dimensions, and match configuration.
- **Player**: A schema object within Game_State representing a human or AI participant, with properties including `resources`, `attack`, `defense`, `tileCount`, and `id`.
- **Tile**: A schema object within Game_State representing a single grid cell, with properties including `ownerId`, `isSpawn`, `hasGear`, and `gearScrap`.
- **Factory**: A Tile where `isSpawn === true`. Each player starts with one factory; additional factories are captured by claiming opponent spawn tiles.
- **Upgrade_Cost_Calculator**: The pure function (`calculateUpgradeCost` in `server/logic/ConflictEngine.ts`) that computes the scrap cost for the next level of attack or defense.
- **Game_Tick**: The 1-second server loop in Game_Room that processes income, border conflicts, absorptions, and timer countdown.
- **Config_Panel**: The host-only overlay UI in the lobby (`src/scenes/LobbyScene.ts`) where match settings (time limit, match format, AI players) are configured before the game starts.
- **HUD**: The in-game heads-up display (`src/ui/HUDManager.ts`) showing player stats, upgrade buttons, and the leaderboard.
- **Scrap**: The in-game currency (`Player.resources`) used to claim tiles and purchase upgrades.
- **Gear_Pile**: A Tile where `hasGear === true` and `gearScrap > 0`, representing a mineable scrap source on the grid.
- **Base_Upgrade_Cost**: The cost of the first upgrade level (level 1 → level 2), set to 50 scrap.
- **Upgrade_Growth_Rate**: The percentage increase applied per level, set to 10% (0.10).
- **Gear_Scrap_Supply**: The configurable amount of scrap contained in each newly spawned Gear_Pile.

## Requirements

### Requirement 1: Percentage-Based Upgrade Cost Scaling

**User Story:** As a player, I want upgrade costs to increase by a percentage each level, so that the economy has a smooth exponential curve instead of a flat linear one.

#### Acceptance Criteria

1. WHEN a Player requests an attack or defense upgrade, THE Upgrade_Cost_Calculator SHALL compute the cost as `floor(Base_Upgrade_Cost × (1 + Upgrade_Growth_Rate) ^ current_stat_level)` where Base_Upgrade_Cost is 50 and Upgrade_Growth_Rate is 0.10.
2. THE Upgrade_Cost_Calculator SHALL return 50 when the current stat level is 1 (first upgrade).
3. WHEN the current stat level is 2, THE Upgrade_Cost_Calculator SHALL return 60 (floor of 50 × 1.10²).
4. WHEN the current stat level is 10, THE Upgrade_Cost_Calculator SHALL return 129 (floor of 50 × 1.10¹⁰).
5. THE Upgrade_Cost_Calculator SHALL accept a stat level and return a non-negative integer cost.
6. WHEN a Player has fewer resources than the computed upgrade cost, THE Game_Room SHALL reject the upgrade request and leave the Player resources and stat level unchanged.
7. WHEN a Player has sufficient resources, THE Game_Room SHALL deduct the computed cost from Player resources and increment the stat level by 1.

### Requirement 2: Factory Passive Scrap Income

**User Story:** As a player, I want each factory I own to automatically generate 1 scrap per second, so that I have a baseline income without needing to click.

#### Acceptance Criteria

1. WHILE the game phase is "active", THE Game_Tick SHALL award 1 scrap per owned Factory to each non-absorbed Player every second.
2. WHEN a Player owns 3 Factories, THE Game_Tick SHALL award 3 scrap to that Player per tick.
3. WHEN a Player owns 0 Factories, THE Game_Tick SHALL award 0 passive scrap to that Player per tick.
4. THE Game_Tick SHALL apply passive income to the team leader when a Factory is owned by a team leader whose teammates have been absorbed.
5. WHEN a Factory changes ownership mid-game (via tile capture or absorption), THE Game_Tick SHALL award passive income to the new owner starting from the next tick.
6. THE HUD SHALL display the current factory count for the player so the passive income rate is visible.

### Requirement 3: Configurable Gear Scrap Supply

**User Story:** As a host, I want to configure how much scrap each gear pile contains via the server config panel, so that I can tune the economy for different play styles.

#### Acceptance Criteria

1. THE Config_Panel SHALL display a "SCRAP SUPPLY" setting with selectable options for the host.
2. THE Config_Panel SHALL offer at least the following Gear_Scrap_Supply values: 50, 200, 500, 1000.
3. THE Config_Panel SHALL default the Gear_Scrap_Supply to 1000.
4. WHEN the host selects a Gear_Scrap_Supply value, THE Config_Panel SHALL send the value to Game_Room via the existing `setConfig` message.
5. WHEN Game_Room receives a valid Gear_Scrap_Supply value, THE Game_Room SHALL store the value and use it for all Gear_Piles spawned during the match.
6. WHEN the game starts, THE Game_Room SHALL set `gearScrap` on each initial Gear_Pile to the configured Gear_Scrap_Supply value.
7. WHEN new Gear_Piles spawn during the match (gear respawn), THE Game_Room SHALL set `gearScrap` on each new Gear_Pile to the configured Gear_Scrap_Supply value.
8. IF the host sends a Gear_Scrap_Supply value that is not in the allowed list, THEN THE Game_Room SHALL ignore the value and retain the current setting.
9. WHEN a series match resets for the next round, THE Game_Room SHALL use the same configured Gear_Scrap_Supply for the new round's Gear_Piles.

### Requirement 4: Client-Side Upgrade Cost Display Update

**User Story:** As a player, I want the HUD to show accurate upgrade costs reflecting the new percentage-based formula, so that I can make informed spending decisions.

#### Acceptance Criteria

1. THE HUD SHALL display the upgrade cost for attack and defense using the same formula as the Upgrade_Cost_Calculator: `floor(50 × 1.10 ^ current_stat_level)`.
2. WHEN a Player completes an upgrade, THE HUD SHALL immediately recalculate and display the new cost for the next level.
3. THE HUD upgrade cost display SHALL match the server-side cost calculation exactly, preventing desync between what the player sees and what the server charges.

### Requirement 5: AI Player Economy Compatibility

**User Story:** As a player competing against AI opponents, I want AI players to use the same economy rules, so that the game is fair.

#### Acceptance Criteria

1. WHILE the game phase is "active", THE Game_Tick SHALL award passive Factory income to AI Players using the same 1 scrap per Factory per tick rule as human Players.
2. WHEN an AI Player requests an upgrade, THE Game_Room SHALL compute the cost using the same percentage-based Upgrade_Cost_Calculator formula.
3. WHEN the game starts with a configured Gear_Scrap_Supply, THE Game_Room SHALL apply the same Gear_Scrap_Supply to Gear_Piles regardless of whether Players are human or AI.
