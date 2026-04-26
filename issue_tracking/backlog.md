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
- [ ] Chat in game — Quick emotes or short messages during play
- [ ] Player profiles — Track wins, total tiles claimed, absorptions across sessions

## Visual & Audio

- [ ] Machine sprites — Unique factory/machine art per player
- [ ] Tile sprites — Replace colored rectangles with scrapyard tile art
- [ ] Sound effects — Claim, upgrade, conflict, absorption, gear mine
- [ ] Camera pan/zoom — Scroll and zoom on larger grids
- [ ] Minimap — Overview of the full grid when zoomed in
- [ ] Animations — Smooth tile transitions instead of instant color swaps

## UX

- [ ] Mobile touch support — Tap to claim, pinch to zoom, swipe for direction
- [ ] Keyboard shortcuts — Hotkeys for upgrade attack (A), upgrade defense (D)

## Technical

- [ ] Persistent room codes — Store short codes in Redis/DB instead of in-memory
- [ ] Server-side validation hardening — Fuzz test all message handlers
- [ ] CI/CD pipeline — Auto-deploy on push to main
- [ ] Analytics — Track player count, game duration, average tiles per game

## From Code Audit — Code Quality & Performance

- [ ] Full grid re-render every tick — implement dirty tile tracking, only update changed tiles
- [ ] Spawn/gear icons destroyed and recreated every render — pool or cache icon objects
- [ ] Duplicate state initialization in GameScene (setupStateListener + immediate check)
- [ ] No debouncing on pointer move for tooltips
- [ ] Notification timer not cleaned up on scene change
- [ ] No type safety on room messages — create typed message interfaces
- [ ] Leaderboard sorts players array on every state change — cache sorted order
- [ ] No object pooling for tween animations (absorption, claim effects)
