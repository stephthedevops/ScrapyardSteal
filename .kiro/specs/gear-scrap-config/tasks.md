# Tasks

## Task 1: Add gearScrapSupply field to GameState

- [x] 1.1 In `server/state/GameState.ts`, add `@type("number") gearScrapSupply: number = 1000;` to the `GameState` class.

## Task 2: Extend setConfig handler for gearScrapSupply

- [x] 2.1 In `server/rooms/GameRoom.ts`, in the `setConfig` message handler, add validation and assignment for `gearScrapSupply` using `ALLOWED_SCRAP_VALUES = [50, 100, 500, 1000, 2000]`, following the same pattern as `timeLimit` and `matchFormat`.

## Task 3: Replace hardcoded 50s with gearScrapSupply

- [x] 3.1 In `server/rooms/GameRoom.ts` `startGame()`, replace `neutralTiles[i].gearScrap = 50` with `neutralTiles[i].gearScrap = this.state.gearScrapSupply`.
- [x] 3.2 In `server/rooms/GameRoom.ts` `gameTick()` step 6, replace `tile.gearScrap = 50` with `tile.gearScrap = this.state.gearScrapSupply`.
- [x] 3.3 In `server/rooms/GameRoom.ts` `resetForNextRound()`, replace `neutralTiles[i].gearScrap = 50` with `neutralTiles[i].gearScrap = this.state.gearScrapSupply`.

## Task 4: Update NetworkManager type signature

- [x] 4.1 In `src/network/NetworkManager.ts`, widen the `sendSetConfig` parameter type to include `gearScrapSupply?: number`.

## Task 5: Add gear scrap selector to LobbyScene config panel

- [x] 5.1 In `src/scenes/LobbyScene.ts` `openConfigPanel()`, add a "GEAR SCRAP" section between the match format section and the AI players section, with buttons for values [50, 100, 500, 1000, 2000]. Read initial value from `this.room?.state?.gearScrapSupply ?? 1000`. On click, call `this.networkManager.sendSetConfig({ gearScrapSupply: value })` and update button highlights.

## Task 6: Property-based tests for gear scrap config

- [x] 6.1 [PBT] In `tests/property/gearScrapConfig.prop.ts`, write Property 1: for any integer sent as `gearScrapSupply`, state updates only for values in {50, 100, 500, 1000, 2000}. Tag: `Feature: gear-scrap-config, Property 1: Gear scrap value validation`. Min 100 iterations.
- [x] 6.2 [PBT] In `tests/property/gearScrapConfig.prop.ts`, write Property 2: for any non-host sender, `gearScrapSupply` is never changed. Tag: `Feature: gear-scrap-config, Property 2: Gear scrap authorization`. Min 100 iterations.
- [x] 6.3 [PBT] In `tests/property/gearScrapConfig.prop.ts`, write Property 3: for any valid scrap value, all gear tiles created have `gearScrap` equal to that value. Tag: `Feature: gear-scrap-config, Property 3: Gear tiles use configured supply`. Min 100 iterations.
