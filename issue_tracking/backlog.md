# Backlog (bl)

Post-jam features and improvements. Not blocking submission but worth building after.

## Gameplay — V2

- [ ] Attack types — Rock-paper-scissors style (piercing, area, sustained) with strengths and weaknesses
- [ ] Multiple resource types — Add economic depth beyond single scrap resource
- [ ] Movement — Allow machines to physically move across the grid
- [ ] Power-ups — Special tiles that grant temporary buffs (double income, shield, speed)
- [ ] Alliances — Players can voluntarily merge teams before being absorbed
- [ ] Fog of war — Only see tiles near your territory, rest is hidden

## Lobby & Social

- [ ] Ready-up system — Players mark themselves ready, host can only start when all are ready
- [nth] Chat in lobby — Simple text chat while waiting
- [ ] Chat in game — Quick emotes or short messages during play
- [ ] Player profiles — Track wins, total tiles claimed, absorptions across sessions

## Visual & Audio

- [ ] Machine sprites — Unique factory/machine art per player
- [ ] Tile sprites — Replace colored rectangles with scrapyard tile art
- [ ] Sound effects — Claim, upgrade, conflict, absorption, gear mine
- [ ] Background music — Industrial/ambient scrapyard soundtrack
- [nth] Particle effects — Sparks on conflict, smoke on absorption, sparks on gear mine
- [ ] Camera pan/zoom — Scroll and zoom on larger grids
- [ ] Minimap — Overview of the full grid when zoomed in
- [ ] Animations — Smooth tile transitions instead of instant color swaps

## UX

- [cpr] Tutorial / onboarding — Brief overlay explaining controls on first play
- [ ] Mobile touch support — Tap to claim, pinch to zoom, swipe for direction
- [ ] Reconnection handling — Rejoin a game in progress after disconnect
- [ ] Game config in host lobby — Host can adjust timer length, grid size, gear count before starting
- [ ] Rematch / new round — Return to lobby after game ends without refreshing
- [ ] Keyboard shortcuts — Hotkeys for upgrade attack (A), upgrade defense (D)

## Technical

- [cp] Property-based tests — Implement the 16 correctness properties from the design doc
- [ ] Performance profiling — Test with 20 players on max grid size
- [ ] Persistent room codes — Store short codes in Redis/DB instead of in-memory
- [ ] Rate limiting — Prevent click spam on tiles and gears
- [ ] Server-side validation hardening — Fuzz test all message handlers
- [ ] CI/CD pipeline — Auto-deploy on push to main
- [ ] Analytics — Track player count, game duration, average tiles per game
- [cp] Open source cleanup — README, LICENSE, contributing guide for GitHub challenge
