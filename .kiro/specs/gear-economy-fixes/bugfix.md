# Bugfix Requirements Document

## Introduction

This document covers three interrelated bugs in the gear economy system of Scrapyard Steal. Together they affect gear spawning, resource accounting on gear tiles, and upgrade pricing — all core economy mechanics.

- **Bug 1: Gears not spawning** — After the initial 20-second delay, the `gameTick()` gear-spawning step calls `spawnNewGears(this.state.tiles.toArray(), 1)`. The `toArray()` method on Colyseus `ArraySchema` may not exist or may not return a plain array compatible with the function's expectations, causing the spawn logic to silently fail. Additionally, the hardcoded `1` means at most one gear spawns per tick regardless of player count, which may be too few for larger games.
- **Bug 2: Claiming a gear tile and mining it in the same click may double-deduct resources** — When a player clicks an unclaimed tile that has a gear, the client sends both `claimTile` and `mineGear` messages in the same frame. The server processes `claimTile` first (deducting the claim cost and assigning ownership), then `mineGear` fires on the now-owned tile. Because the `mineGear` handler allows mining on tiles owned by the player, both operations succeed — the player pays the claim cost AND extracts gear scrap in a single click, bypassing the intended one-action-per-click design.
- **Bug 3: Upgrade cost formula wrong** — `calculateUpgradeCost` in `ConflictEngine.ts` uses `50 * currentStatValue`, but the intended formula is `50 + (5 * currentStatValue)`. This makes early upgrades free (level 0 costs 0) and later upgrades far too expensive.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the game is active and the gear respawn countdown has reached zero THEN the system calls `spawnNewGears(this.state.tiles.toArray(), 1)` which may fail silently if `toArray()` does not return a compatible plain array, resulting in no gears spawning after the initial placement

1.2 WHEN a player clicks an unclaimed tile that contains a gear THEN the client sends both a `claimTile` message and a `mineGear` message in the same frame, causing the server to deduct the tile claim cost AND extract gear scrap in a single click

1.3 WHEN a player upgrades attack or defense THEN the system calculates the cost as `50 * currentStatValue`, which produces 0 cost at level 0 (free first upgrade) and excessively high costs at higher levels (e.g., level 10 costs 500 instead of the intended 100)

1.4 WHEN a player has attack or defense at level 0 THEN the system calculates upgrade cost as `50 * 0 = 0`, allowing a free upgrade with no resource expenditure

### Expected Behavior (Correct)

2.1 WHEN the game is active and the gear respawn countdown has reached zero THEN the system SHALL pass a proper array of tile data to `spawnNewGears` and new gear tiles SHALL appear on valid unclaimed, non-spawn tiles each game tick

2.2 WHEN a player clicks an unclaimed tile that contains a gear THEN the server SHALL process only the tile claim on that click, and the `mineGear` handler SHALL reject the request if the tile was unclaimed at the start of the click (i.e., the player must own the tile before mining can occur, requiring a separate action)

2.3 WHEN a player upgrades attack or defense THEN the system SHALL calculate the cost as `50 + (5 * currentStatValue)`, producing a base cost of 50 at level 0 and scaling linearly (e.g., level 0 → 50, level 1 → 55, level 10 → 100)

2.4 WHEN a player has attack or defense at level 0 THEN the system SHALL charge 50 resources for the upgrade (not 0)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the game is in the first 20 seconds after round start THEN the system SHALL CONTINUE TO suppress gear spawning via the countdown mechanism

3.2 WHEN a player clicks a tile they already own that contains a gear THEN the system SHALL CONTINUE TO allow mining that gear tile normally

3.3 WHEN a player clicks an unclaimed tile that does not contain a gear THEN the system SHALL CONTINUE TO process the tile claim normally with the standard claim cost formula

3.4 WHEN a player upgrades attack or defense and has sufficient resources THEN the system SHALL CONTINUE TO increment the stat by 1 and deduct the calculated cost

3.5 WHEN a player has attack or defense at the maximum cap of 50 THEN the system SHALL CONTINUE TO reject the upgrade request

3.6 WHEN initial gears are placed during `startGame()` or `resetForNextRound()` THEN the system SHALL CONTINUE TO place exactly one gear per player on neutral tiles with `gearScrap` set to the configured supply value
