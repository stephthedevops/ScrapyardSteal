# Changelog

All notable changes to Scrapyard Steal.

## [0.5.0] — 2025-04-22

### Added
- Gear respawn — when no unclaimed gears remain, new gears spawn on random unclaimed tiles every 20s (count = active players, gearScrap = 50)
- Server config panel — host can open ⚙ CONFIG from lobby to set match settings
- Time limit selector — 2, 5, 7, or 10 minute matches (default 5 min)
- Match format — Single Match, Best of 3, Best of 5 with auto-rematch and series score tracking
- AI players — host can add up to 4 computer players with color picker and 🤖 icon
- AI naming — household-roid noun pool (35 entries: Fridgeroid, Toasteroid, etc.) with no duplicate adj/noun across AI and human players
- 💡 Hint button on game screen — popup with controls summary, game continues behind overlay
- BACK button on lobby page — all players can return to menu without starting
- "reroll" label next to ♻ button for discoverability
- Connection error popup — styled overlay with error reason, "BACK TO MENU" button, auto-kick to menu after 5s
- Mid-lobby disconnect handling — "Disconnected from server" popup with same auto-kick behavior
- Series score display in leaderboard header during bo3/bo5 matches
- `sendSetConfig`, `sendAddAI`, `sendRemoveAI` methods on NetworkManager
- `sanitizeName()` pure function in `server/logic/sanitize.ts`
- `spawnNewGears()` pure function in `server/logic/GridManager.ts`
- `generateAIName()` and `HOUSEHOLD_ROID` array in `src/utils/nameGenerator.ts`
- `matchFormat`, `roundNumber`, `seriesScoresJSON` fields on GameState schema
- `isAI` field on Player schema
- Dynamic version in About popup via Vite `define` (reads from package.json)
- 13 property-based tests using fast-check (43 total tests across 8 files)

### Changed
- Name sanitization now strips all non-printable ASCII (0x20–0x7E) and trims whitespace, applied before duplicate check
- Game end logic refactored into `handleRoundEnd()` to support series play
- `resetForNextRound()` re-initializes grid, reassigns positions, resets player stats between rounds

### Fixed
- Color picker ✕ marks not updating when a player disconnects and frees their color
- Gear mining had no visual feedback on click (now plays gold flash animation, 300ms)

## [0.4.2] — 2025-04-17

### Added
- Bounds checking on tile coordinates in claimTile/mineGear
- gearScrap negative guard (Math.max to prevent negative values)
- Name sanitization — server truncates adj/noun to 16 characters
- Color validation against allowed palette on server
- Attack/defense max cap (50)
- About the Game button on menu — shows team names, version, GitHub link
- Colyseus Cloud deployment — server live at us-ord-ef0ec457.colyseus.cloud
- ecosystem.config.js + @colyseus/tools integration for Cloud hosting
- GitHub Pages site with itch.io embed
- build:prod script with auto-zip for itch.io submission

### Fixed
- Server build alignment with Colyseus Cloud expectations (build/ dir, ecosystem.config.js)
- Express routes for room code lookup and public room listing

## [0.4.1] — 2025-04-16

### Added
- MIT LICENSE
- Equidistant starting positions — max 2 tiles from edge
- Issue tracking system README

### Fixed
- Server split into app.config.ts + index.ts with listen() call per Colyseus Cloud template
- ecosystem.config.js with explicit instances:1 and exec_mode:fork
- build:prod script and .gitignore for dist.zip

## [0.4.0] — 2025-04-16

### Added
- Tutorial scene — 8-page step-by-step HOW TO PLAY with PREV/NEXT, arrow keys, Escape
- HOW TO PLAY button on main menu
- Public/private room toggle (🔒/🌐) for host in lobby
- QUICK PLAY button — joins a random public waiting room (on join game page)
- Easter egg tagline in lobby: "Machines built to smash, weld, absorb, and kaboom."
- 8 secret clickable letters → elite bots (Prismatic Macawbot, Phantom Bunnybot, Apex Tigerbot, Abyssal Seahorsebot, Feral Wolfbot, Mythic Axolotebot, Venomous Beebot, Lethal Mambabot)
- Secret bot image (160×160) displays on right side when selected
- Elite bot uniqueness — can't select a secret bot already taken in the lobby
- Name uniqueness enforcement — server rejects duplicate adj/noun, client auto-rerolls on rejection
- Start game blocked with error if duplicate or missing names
- Player identity text below grid ("You are [team name]" or "You are the [adj] parts")
- Role display in stats panel (Lead / Member)
- Factory count display in stats panel (🏭: Nx)
- Team name as title on stats panel with dynamic background resize
- Timer moved to leaderboard header
- Win condition: last team standing for 2 consecutive seconds ends game early
- Factory multiplier: gear mining yields attack × factoryCount per click
- Game design doc updated to reflect all current mechanics
- Tutorial doc with images
- Unicode reference doc
- Changelog doc

### Changed
- Tagline on menu: "expand. absorb. dominate the scrapyard."
- Lobby tagline: "Machines built to smash, weld, absorb, and kaboom."
- Stats panel moved to middle-left with team name, role, factory count
- Upgrade buttons moved to right side, stacked vertically
- Leaderboard dynamically resizes width, shows full team names
- Secret letter hover: subtle amber shift instead of bright white
- QUICK PLAY moved from main menu to join game page
- HOW TO PLAY and QUICK PLAY properly hide/show when toggling join mode

### Removed
- Passive scrap income (1 scrap/tile/second) — scrap now only earned by clicking gears

### Fixed
- Absorption message showing "someone" instead of absorber's noun
- Tooltip going off-screen (clamped to game bounds)
- Join game mode not hiding HOW TO PLAY and QUICK PLAY buttons
- Tutorial page 1 only mentioning timer win condition (now mentions both)

## [0.3.0] — 2025-04-15

### Added
- Win condition: game ends when only one team remains for 2 consecutive seconds
- Factory multiplier: gear mining yields `attack × factoryCount` scrap per click
- Player identity text below grid ("You are Turbo Hydraulic Otterbot." or "You are the Turbo parts.")
- Role display in stats panel (Lead / Member)
- Factory count display in stats panel (🏭: 2x)
- Team name as title on stats panel with dynamic resize
- Timer moved to leaderboard header
- Name uniqueness: server rejects duplicate adjectives/nouns, client auto-rerolls
- Start game blocked if duplicate or missing names (error shown to host)
- Changelog, tutorial, and unicode reference docs

### Changed
- Stats panel moved to middle-left, off the grid
- Upgrade buttons moved to right side, stacked vertically
- Leaderboard dynamically resizes width based on longest team name
- Tagline changed to "expand. absorb. dominate the scrapyard."
- Player schema restructured: nameAdj, nameNoun, teamId, teamName, isTeamLead, spawnX, spawnY
- Color names updated: Nickel → Corroded Copper, Steel → Rusty Iron, Silver → Tarnished Silver, Titanium → purple

### Removed
- Passive scrap income (1 scrap/tile/second) — scrap now only earned by clicking gears

### Fixed
- Absorption message showing "someone" instead of absorber's noun
- Tooltip going off-screen (now clamped to game bounds)
- Leaderboard truncating team names (now shows full names)
- Name generator could produce duplicates in the same lobby

## [0.2.0] — 2025-04-15

### Added
- Menu screen with CREATE GAME / JOIN GAME flow
- 5-character room codes with [COPY] and [PASTE] buttons
- Multiple simultaneous game rooms
- Host-starts-game lobby with START button
- Random "Adjective Animalbot" names with ♻ reroll
- 10 metal-themed color picker (Copper, Corroded Copper, Gold, Tarnished Silver, Titanium, Cobalt, Bismuth, Rusty Iron, Chromium, Tungsten)
- Red ✕ overlay on taken colors
- Team absorption — defeated players join victor's team and can click to help
- Adjective stacking on team names
- Team lead / team member roles (only lead can spend scrap)
- Gear tiles (⚙) with 50 scrap, mined at attack rate per click
- 🏭 factory emoji on spawn tiles at 50% tile size
- 5-minute game timer with HUD countdown
- Game over screen with winner and "Back to Menu" button
- Color persistence — your team renders in your chosen color
- Tooltips on tile hover (owner name, gear scrap remaining)
- Absorption notification using nouns ("Otterbot scrapped Falconbot")
- Equidistant circular spawn placement
- Player schema restructure: nameAdj, nameNoun, teamId, teamName, isTeamLead, spawnX, spawnY
- Direction steering with arrow keys
- README with badges, project structure, how to play
- Issue tracking system (core-priorities, backlog, known-bugs, completed, rejected)
- Lean Coffee doc for team discussion topics
- Triage hook (say "sync" / "resync" / "prime" to sort issues)
- Steering rule for npm command formatting

### Fixed
- Absorption message showing "someone" instead of absorber's name
- ts-node not using server tsconfig (experimentalDecorators)
- Non-host lobby transition (added polling fallback)

## [0.1.0] — 2025-04-15

### Added
- Phaser 3 + Colyseus + TypeScript + Vite project scaffold
- GameState schema (Player, Tile)
- GridManager — grid init, adjacency, starting positions
- ConflictEngine — border detection, pressure resolution, cost formulas
- GameRoom — join/leave lifecycle, message handlers, 1-second game loop
- Resource income (1 scrap per tile per second)
- Tile claiming with scaling cost
- Attack and defense upgrades with scaling cost
- Border conflict resolution (attack pressure vs defense)
- Player absorption with 25% scrap bonus
- NetworkManager — Colyseus client wrapper
- GridRenderer — tile rendering with scrapyard palette
- HUDManager — stats, leaderboard, upgrade buttons, notifications
- DirectionFilter — centroid-based directional tile filtering
- GameScene — full client integration
- Vitest + fast-check test infrastructure
- Game design document
