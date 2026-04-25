# Tasks

## Task 1: Set countdown to 20 in startGame()

- [x] 1.1 In `server/rooms/GameRoom.ts` `startGame()`, add `this.gearRespawnCountdown = 20` after the initial gear placement block and before the `this.clock.setInterval` call.

## Task 2: Gate gear spawning in gameTick()

- [x] 2.1 In `server/rooms/GameRoom.ts` `gameTick()`, wrap the existing gear-spawning block (step 6, the `spawnNewGears` call and its for-loop) in a countdown check: if `this.gearRespawnCountdown > 0`, decrement it and skip; otherwise run the existing spawn logic.

## Task 3: Reset countdown to 20 in resetForNextRound()

- [x] 3.1 In `server/rooms/GameRoom.ts` `resetForNextRound()`, change `this.gearRespawnCountdown = -1` to `this.gearRespawnCountdown = 20`.

## Task 4: Property-based tests for gear respawn delay

- [x] 4.1 [PBT] In `tests/property/gearRespawnDelay.prop.ts`, write Property 1: for any countdown > 0, a tick decrements countdown by 1 and spawns no gears. Tag: `Feature: gear-respawn, Property 1: Countdown suppresses spawning and decrements`. Min 100 iterations.
- [x] 4.2 [PBT] In `tests/property/gearRespawnDelay.prop.ts`, write Property 2: for any countdown <= 0, a tick spawns gears normally. Tag: `Feature: gear-respawn, Property 2: Spawning resumes after countdown expires`. Min 100 iterations.
- [x] 4.3 [PBT] In `tests/property/gearRespawnDelay.prop.ts`, write Property 3: for any player count N, initial gear placement produces exactly N gear tiles. Tag: `Feature: gear-respawn, Property 3: Initial gear count equals player count`. Min 100 iterations.
