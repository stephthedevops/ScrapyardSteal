# Requirements Document

## Introduction

This feature adds a 20-second initial delay to the per-tick gear spawning in `gameTick()`. During the first 20 seconds of a round, no gears spawn via the per-tick spawner. After the delay expires, gears spawn at 1 per second on a random unclaimed tile — the same behavior as today, just delayed. Initial gears placed during `startGame()` are unaffected. The existing `gearRespawnCountdown` field on GameRoom drives the countdown.

## Glossary

- **GameRoom**: The server-side room class that manages game state and runs the game loop via `gameTick()`.
- **GridManager**: The server-side utility module containing the `spawnNewGears()` function.
- **Tick**: One iteration of the game loop, occurring once per second.
- **Initial_Delay**: A 20-second countdown at the start of each round during which the per-tick gear spawner is suppressed.
- **Gear_Respawn_Countdown**: The `gearRespawnCountdown` field on GameRoom, used to track the remaining Initial_Delay ticks.

## Requirements

### Requirement 1: Suppress Per-Tick Gear Spawning During Initial Delay

**User Story:** As a game designer, I want no gears to spawn via the per-tick spawner during the first 20 seconds of a round, so that players must compete over the initial gear placement before new gears appear.

#### Acceptance Criteria

1. WHEN a game round starts, THE GameRoom SHALL set the Gear_Respawn_Countdown to 20.
2. WHILE the Gear_Respawn_Countdown is greater than zero, THE GameRoom SHALL NOT call `spawnNewGears()` during the Tick.
3. WHILE the Gear_Respawn_Countdown is greater than zero, THE GameRoom SHALL decrement the Gear_Respawn_Countdown by 1 on each Tick.

### Requirement 2: Resume Gear Spawning After Initial Delay

**User Story:** As a player, I want gears to start appearing one per second after the 20-second delay, so that new resources become available as the round progresses.

#### Acceptance Criteria

1. WHEN the Gear_Respawn_Countdown reaches zero or below, THE GameRoom SHALL spawn exactly 1 gear per Tick by calling `spawnNewGears()` with a count of 1.
2. WHEN a gear is spawned, THE GameRoom SHALL set `hasGear` to true and `gearScrap` to 50 on the selected tile.
3. THE GameRoom SHALL select the gear tile using the existing `spawnNewGears()` function, which picks a random unclaimed, non-spawn tile without an existing gear.

### Requirement 3: Initial Gear Placement Unchanged

**User Story:** As a game designer, I want the gears placed at game start to remain unaffected, so that the early game still has resources to fight over.

#### Acceptance Criteria

1. WHEN a game round starts via `startGame()` or `resetForNextRound()`, THE GameRoom SHALL place initial gears (1 per player) on random unclaimed tiles before the game loop begins.
2. THE Initial_Delay SHALL NOT affect the initial gear placement — those gears spawn immediately at round start.

### Requirement 4: Reset Countdown Between Rounds

**User Story:** As a game designer, I want the countdown to reset for each round in a series match, so that every round has the same 20-second delay.

#### Acceptance Criteria

1. WHEN `resetForNextRound()` is called, THE GameRoom SHALL set the Gear_Respawn_Countdown to 20.
2. WHEN a new round begins, THE GameRoom SHALL apply the same Initial_Delay rules as the first round (Requirements 1 and 2).
