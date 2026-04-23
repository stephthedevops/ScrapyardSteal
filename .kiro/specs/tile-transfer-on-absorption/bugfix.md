# Bugfix Requirements Document

## Introduction

When a player is absorbed during a border conflict in Scrapyard Steal (their tile count reaches zero), the absorbing player should take ownership of all the absorbed player's remaining tiles. Currently, the absorption logic in `gameTick()` marks the player as absorbed, transfers team membership, and awards bonus scrap, but never reassigns the absorbed player's tiles to the absorber. This leaves orphaned tiles still owned by the absorbed player's ID, which breaks territory continuity, inflates the absorber's effective territory without updating tile counts, and causes downstream issues with border detection and resource calculations.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a player is absorbed (their tileCount reaches 0 via border conflict) THEN the system leaves the absorbed player's tiles with their original ownerId instead of transferring them to the absorber

1.2 WHEN a player is absorbed THEN the absorber's tileCount is not increased to reflect the newly acquired tiles from the absorbed player

1.3 WHEN a player is absorbed and their tiles remain under the old ownerId THEN the system treats those tiles as belonging to a non-active player, causing border detection via `findBorders()` to still detect borders against the absorbed player's orphaned tiles

### Expected Behavior (Correct)

2.1 WHEN a player is absorbed (their tileCount reaches 0 via border conflict) THEN the system SHALL reassign all tiles with `ownerId === absorbedPlayer.id` to the absorber's id

2.2 WHEN a player is absorbed THEN the system SHALL increase the absorber's tileCount by the number of tiles transferred from the absorbed player

2.3 WHEN a player is absorbed and their tiles are transferred THEN the system SHALL ensure no tiles remain with the absorbed player's ownerId, so that `findBorders()` treats the transferred tiles as part of the absorber's territory

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a border conflict results in a single tile transfer (no absorption) THEN the system SHALL CONTINUE TO transfer exactly one tile from the loser to the winner per border per tick

3.2 WHEN a player is absorbed THEN the system SHALL CONTINUE TO set `absorbed = true` on the absorbed player

3.3 WHEN a player is absorbed THEN the system SHALL CONTINUE TO award the absorber 25% of the absorbed player's resources as bonus scrap

3.4 WHEN a player is absorbed THEN the system SHALL CONTINUE TO update team membership (teamId, isTeamLead, teamName) for the absorbed player and existing team members

3.5 WHEN a player is absorbed THEN the system SHALL CONTINUE TO prepend the absorbed player's name adjective to the absorber's team name

3.6 WHEN tiles are transferred on absorption THEN the system SHALL CONTINUE TO preserve the tile's grid position (x, y), spawn status (isSpawn), and gear properties (hasGear, gearScrap)

3.7 WHEN border conflicts are resolved between two non-absorbed players THEN the system SHALL CONTINUE TO skip borders involving already-absorbed players in the same tick
