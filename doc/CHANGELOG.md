# Changelog

All notable changes to Scrapyard Steal.

## [0.7.1] — 2026-04-25

### Added
- Wavedash integration — `@wvdsh/sdk-js` installed, `Wavedash.init()` called in Phaser postBoot callback, `wavedash.toml` config created
- Wavedash deploy step added to Prod Build & Deploy hook (`wavedash build push`)
- Leave Game button (🚪) — confirmation popup with AI takeover; departing player's noun gets "roid" suffix and AI takes control
- Absorbed player idle nudge — after 7 seconds of inactivity, a random motivational message appears for 3 seconds (or click to dismiss)
- Public Games refresh button (↻) in the server list popup
- Colorful spinning gear decorations on gear-related tutorial pages
- Color-coded lines in the in-game help hints popup (attack red, defense blue, gear amber)
- COL bots now return to unplaced pool when their gear tile is fully mined out (still stay on factory tiles)

### Changed
- Upgrade cost display fixed — client now shows `50 + (5 × level)` matching the server formula (was incorrectly showing `50 × level`)
- Color palette updates for better contrast:
  - Verdigris: `0x2eb8a6` → `0x00e5ff` (cyan)
  - Rusty Iron: `0x8b4513` → `0xff3b30` (bright red)
  - Oxidized Iron: `0xc44b2f` → `0xff375f` (vivid pink-red)
  - Tarnished Silver: `0x8a8a7a` → `0x8b5a2b` (warm brown)
  - Palladium → Uranium: `0xe6e0d4` → `0x32d74b` (bright green)
  - Molten → Molten Steel (label only)
- Gear icons on tiles and cost labels render as native colorful `⚙️` emoji (no color override)
- Tutorial page 3 ("Mining Gears") now uses colorful `⚙️` emoji instead of plain text `⚙`
- Help (💡) and Leave (🚪) buttons moved higher to avoid being clipped by scale-to-fit

### Fixed
- Color picker X marks not updating when a player disconnects — `selectedColorIndex` now syncs from server-assigned auto-color on each state change

## [0.6.0] — 2026-04-25

### Added
- Manual combat system — team leaders click enemy border tiles to initiate attacks; no more automatic border conflict
- Battle tick (2×/sec) — each tick removes 1 defense from the targeted tile; tile becomes unclaimed at 0 defense
- Defense bots (🛡) — purchasable bots placed on owned tiles, each adding +5 defense (max 4 per tile, permanent once placed)
- Per-tile defense display — shield icon with defense value shown at top of every owned tile (base 5 + 5 per bot)
- Defense bot repair — 50% chance a lost defense bot is returned as unplaced when a threshold is crossed
- Attacker attrition — every 5 damage dealt, 50% chance the attacker loses an attack bot
- Defense bot HUD icons — clickable 🛡 icons for placing unplaced defense bots (mirrors collector placement flow)
- Deathmatch mode — infinite time option (☠ Death), game ends only when one team remains
- Full-screen Stats popup — 📊 Stats button replaces always-visible leaderboard, shows all team stats (tiles, ATK, DEF, COL, factories, scrap)
- Timer display in right gutter (shows countdown or "☠ DEATHMATCH")
- AI players now initiate attacks on enemy border tiles (up to ATK bot count simultaneous attacks)
- Battle flash animations — attacker sees their color, all other players see white flash
- Attack pressure determines battle tick damage: `factories + floor(attackBots / activeBattles)`
- Simultaneous attack limit: 1 (leader) + ATK bot count
- Role-based permissions — non-leaders can buy/place DEF and COL bots, only leaders can buy ATK bots and attack
- Factory loss demotion — losing all factories sets player to non-leader, cancels active battles
- "Roles & Permissions" tutorial page with lead vs member action table
- `attackTile` and `placeDefenseBot` message handlers with corresponding network methods
- `defenseBotsJSON` field on Player schema for tracking placed defense bot positions
- `battleFlash` broadcast message for attack animations on all clients
- Colorful emoji icons — gear (⚙️), attack (⚔️), shield (🛡️), COL (⚙️) now use emoji presentation
- Inline emoji on tile labels — defense shows "5🛡" and cost shows "-10⚙️"
- "💡 Help" label on the in-game hint button, moved to bottom-left

### Changed
- Attack pressure formula changed to `factories + floor(attackBots / activeBattles)` — scales with concentration
- Mining no longer uses attack stat — extraction is now `5 × factories owned`
- Defense is now per-tile (base 5 + placed bots) instead of a flat player stat multiplied by border tiles
- Player defense stat starts at 0 (was 1) — represents unplaced defense bots available
- Border conflict removed from automatic game tick — combat is now player-initiated
- Absorbed player tiles become unclaimed (neutral) instead of transferring to the absorber
- Grid size formula changed to `10 + playerCount`, clamped to [12, 20]
- Scrap cost label on claimable tiles — smaller font, bottom of tile, minus sign prefix, behind gear icon
- Purchase bot panel moved to bottom-right gutter (vertical stack below stats button)
- Leaderboard replaced with Stats button + full-screen popup with all team data
- About menu close button positioned dynamically below text content
- About menu version now reads from package.json correctly (v0.6.0)
- Server config panel — buttons reduced to 24px height, AI entries in two columns, Deathmatch option added
- Lobby player list renders in 3 columns, names tinted in player's chosen color
- Reroll button moved above color picker with 🎲 icon ("🎲 Reroll Name")
- Tutorial fully rewritten (13 pages) — new pages for Attacking, Defending, Bots & Upgrades, Roles & Permissions
- In-game hint popup updated for click-to-attack controls with colorful emoji icons
- Gear icon shrunk to 35% of tile size (was 50%) to prevent clipping
- Tile number labels 175% larger with automatic black/white contrast based on tile color
- Factory icon renders on unclaimed spawn tiles (was hidden when neutral)
- Growth direction feature removed from tutorial (functionality removal tracked in backlog)

### Fixed
- About menu `[CLOSE]` link no longer overlaps text content
- About menu showing wrong version (was 0.5.0, now correctly shows 0.6.0)
- Claimable tile outlines not rendering (caused by removed leaderboard fields crashing state update)
- Lobby scene not resetting state on re-entry after a game (stale `transitioned` flag)
- GameScene not resetting state on re-entry (stale `gameEnded`, `spawnTilesRegistered` flags)
- Battle tick interval not being started (was declared but never initialized)
- Client never sending `attackTile` message (click handler only sent `claimTile`)
- AI players attacking without owning a factory
- Factory icon not rendering on unclaimed spawn tiles

## [0.5.1] — 2025-04-22

### Added
- AI player behavior — AI bots now mine gears, claim adjacent tiles (prioritizing gear tiles), and upgrade ATK/DEF each tick
- Absorbed AI players mine on behalf of their team leader
- Tile claim cost preview — claimable tiles now show their scrap cost as a small overlay label
- "PURCHASE BOT" legend panel on right side grouping ATK, DEF, and COL upgrade buttons
- Collection Bot (COL Bot) upgrade button and cost label (placeholder, not yet wired to server)
- Nathan's playtest feedback file (`issue_tracking/nathan-suggestions.md`) with scrap generation, ATK/DEF rework, and upgrade scaling proposals
- Nathan's scrap & economy feedback triaged into core-priorities.md
- Backfilled CHANGELOG entries for v0.4.1, v0.4.2, and v0.5.0
- Bot stat card images added to `public/images/` (8 PNGs)

### Changed
- Re-themed ATK/DEF as "ATK Bot" / "DEF Bot" in HUD stats panel and upgrade buttons
- Initial gear placement reduced from 3× player count to 1× player count
- Gear respawn reworked from 20s cooldown to continuous spawning (1 new gear per tick on a random unclaimed tile)
- Game over screen shows full winner name instead of just the noun, with word-wrap and smaller font
- Lobby CONFIG button repositioned to (485, 575) and slightly reduced; BACK button moved to (325, 575) to sit side-by-side
- Stats panel labels updated: Attack → ATK Bots, Defense → DEF Bots, added COL Bots row
- Issue triage tag changed from `cpr` to `core` for core-priorities routing
- Issue triage hook trigger changed from `promptSubmit` to `postTaskExecution`

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
