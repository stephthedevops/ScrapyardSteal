# Completed (cpt)

Items that have been implemented and verified.

## Gameplay

- [x] Game timer / win condition — End game after 5 minutes, declare winner by tile count
- [x] Win condition — Game ends when only one team remains for 2 seconds
- [x] Spectator mode — Absorbed players help their absorber's team (click to claim/mine)
- [x] Gear tiles — Random gears with 50 scrap each, mined by clicking, yield = attack × factories
- [x] Team absorption — Absorbed player joins absorber's team, adjective stacks on team name
- [x] Team members can earn scrap but only team lead can spend
- [x] Steering growth direction — Arrow keys to choose expansion direction, filters claimable tiles
- [x] Factory multiplier — Gear mining yields attack × factoryCount per click
- [x] Removed passive scrap income — Scrap only earned by clicking gears

## Lobby & Matchmaking

- [x] Player names — Random "Adjective Animalbot" names with ♻ reroll button
- [x] Name uniqueness — Server rejects duplicate adjectives/nouns, client auto-rerolls
- [x] Room codes — 5-character uppercase codes with [COPY] and [PASTE] buttons
- [x] Host starts game — First player is host, START button only for host
- [x] Multiple lobbies — Create Game / Join Game flow with separate rooms
- [x] Menu screen — CREATE GAME / JOIN GAME with join code input, BACK, ENTER LOBBY buttons
- [x] English as default language
- [x] Autopick colors — Automatically assign a unique color to each player when they enter the lobby

## Visual & Audio

- [x] Metal-themed colors — Copper, Corroded Copper, Gold, Tarnished Silver, Titanium, Cobalt, Bismuth, Rusty Iron, Chromium, Tungsten
- [x] Red X on taken colors — Bright red ✕ overlay instead of dimming
- [x] Factory emoji on spawn tiles — 🏭 at 50% tile size
- [x] Gear emoji on gear tiles — ⚙ disappears when depleted
- [x] Equidistant starting positions — Circular placement on grid
- [x] Color persistence — Your team always renders in your chosen color on your screen
- [x] New tagline — "expand. absorb. dominate the scrapyard."

## UX & Polish

- [x] Tooltips — Hover over tiles to see owner name and gear scrap remaining (clamped to bounds)
- [x] End-game screen — Winner announcement with "Back to Menu" button
- [x] Absorption notification — "Otterbot scrapped Falconbot" using nouns only
- [x] Fixed absorption message showing "someone" instead of absorber's name
- [x] Leaderboard — Full team names, dynamic width, timer in header
- [x] Stats panel — Moved to middle-left with team name title, role, factory count
- [x] Upgrade buttons — Moved to right side, off the board
- [x] Player identity text — "You are [team name]" or "You are the [adj] parts"

## Technical

- [x] Framework scaffold — Phaser 3 + Colyseus + TypeScript + Vite
- [x] Server game loop — 1-second tick with border conflict, absorption
- [x] Client-server sync — Colyseus state synchronization
- [x] Vitest + fast-check — Test infrastructure installed
- [x] Steering rule — npm commands formatted as clickable code blocks
- [x] Player schema restructure — nameAdj, nameNoun, teamId, teamName, isTeamLead, spawnX, spawnY
- [x] Magic numbers throughout codebase — extract to shared constants file

## v0.3 Additions

- [x] Tutorial scene — 8-page HOW TO PLAY with keyboard nav, accessible from menu
- [x] Public/private rooms — Host toggle, QUICK PLAY button joins random public room
- [x] Easter egg bots — 8 secret clickable letters in lobby tagline, each with unique elite adjective and bot image
- [x] Factory multiplier — Gear mining yields attack × owned factories per click
- [x] Removed passive income — Scrap only from clicking gears
- [x] Win condition: last team standing for 2 seconds
- [x] Timer moved to leaderboard header
- [x] Team name title on stats panel with dynamic resize
- [x] Player identity text below grid
- [x] Role display (Lead/Member) in stats panel
- [x] Factory count display (🏭: Nx) in stats panel
- [x] Name uniqueness enforcement — server rejects dupes, client auto-rerolls
- [x] Start game blocked if duplicate/missing names
- [x] Menu: HOW TO PLAY and QUICK PLAY buttons, proper show/hide in join mode
- [x] Lobby tagline: "Machines built to smash, weld, absorb, and kaboom."
- [x] Elite bot uniqueness — can't select a secret bot already in the lobby

## v0.4.1 Additions

- [x] MIT LICENSE added
- [x] Equidistant starting positions — max 2 tiles from edge
- [x] Tutorial / onboarding — 8-page HOW TO PLAY scene
- [x] Game runs in browser without plugins (HTML5) — verified
- [x] Theme "Machines" clearly represented — verified
- [x] New content created for the jam — verified
- [x] Build it with Phaser — confirmed
- [x] Open Source by GitHub — MIT LICENSE, repo public
- [x] Open source cleanup — LICENSE and README in repo
- [x] Bounds checking on tile coordinates in claimTile/mineGear
- [x] gearScrap negative guard (Math.max)
- [x] Name sanitization (truncation on server)
- [x] Color validation against allowed palette
- [x] Attack/defense max cap (50)
- [x] About the Game button — team names, version, GitHub link
- [x] Colyseus Cloud deployment — server live at us-ord-ef0ec457.colyseus.cloud
- [x] ecosystem.config.js + @colyseus/tools integration
- [x] GitHub Pages site with itch.io embed
- [x] build:prod script with auto-zip

## v0.5.1 Additions

- [x] Visual feedback (graphic/animation) whenever scrap is generated — clicks or auto

## v0.5.2 — Issue Sync

- [x] Non-host players sometimes don't transition from lobby to game (gameStarted broadcast)
- [x] Gear mining animates with gold flash on click
- [x] Absorbed players' tiles transferred to absorber on absorption
- [x] Ensure absorbed players can reliably click tiles and mine gears for their team
- [x] Switch client to prod server URL and build for production (build:prod script)
- [x] Property-based tests — 15 property test files covering correctness properties
- [x] Game end screen shows correct winner with full team name
- [x] Color persistence after absorption (your team stays your color)
- [x] Sanitize player names before broadcast (strip control chars)
- [x] Gear respawn — 20-second delay then 1 gear/sec on unclaimed tiles
- [x] Scrap piles default to 1000 and configurable in server config (50, 100, 500, 1000, 2000)
- [x] Cost-to-capture shown on each claimable tile before clicking
- [x] ATK and DEF re-themed as "ATK Bots", "DEF Bots", added "COL Bots" (UI only)
- [x] Cancel/back button on host lobby page — return to menu without starting
- [x] Connection error handling — error popup with auto-kick to menu after 5 seconds
- [x] Hint button on game screen — 💡 quick popup with controls summary
- [x] Server config button in host lobby — ⚙ CONFIG with time limit, match format, gear scrap, AI players
- [x] Server config: match format — single match, best of 3, best of 5 with auto-rematch
- [x] Server config: AI players — host can add up to 4 AI with color picker and 🤖 icon
- [x] AI player naming — household items with "roid" suffix (35+ nouns), no duplicates
- [x] Reroll button discoverability — "reroll" label next to ♻
- [x] Game config in host lobby — timer, match format, gear scrap, AI players
- [x] Rematch / new round — series match with resetForNextRound()

## v0.5.3 — Issue Sync

- [x] Decide min/max players — 10 or 20 configurable in server config
- [x] Add Valokor to GitHub contributors — listed in README and About popup
- [x] Rate limiting on tile claims, upgrades, and gear mining (prevent click spam)
- [x] Gear mining flash animation uses the player's own color
- [x] Claimable tile outlines use the player's own color
- [x] Playtest with 4+ players and tune border conflict pressure formula
- [x] Deploy Colyseus server to us-ord-ef0ec457.colyseus.cloud
- [x] Deploy client build to itch.io as jam submission
- [x] Test full flow on itch.io (create game, join by code, play, end screen)
- [x] Rate-limit player clicks on scrap piles to 5–10/sec

## Nathan's ATK / DEF Rework

- [x] Attack Bots: click an opponent's tile to assault it over several seconds (~5s)
- [x] Number of Attack Bots limits how many tiles you can assault simultaneously
- [x] Defense Bots: select your own tiles to make them immune to conversion
- [x] Number of Defense Bots limits how many tiles can be protected at once
- [x] Visual indicator on defended tiles

## Nice-to-Haves — Completed

- [x] Particle effects — Sparks on conflict, smoke on absorption, sparks on gear mine
- [x] Update tutorial to mention Quick Play (join a random public game)
- [x] Public Servers button on join game page — show a list of public lobbies to browse and pick from

## Backlog — Completed

- [x] Performance profiling — Test with 20 players on max grid size

## Gameplay — V2

- [x] Factory capture choice — When a player's factory is claimed, give them the option to surrender their tiles to the captor or drop all tiles as unclaimed; broadcast "team absorbed [name]" only after the choice is made
- [x] Factory adjective transfer — When an absorbed player's spawn factory is unclaimed, the team that lost it loses the adjective associated with that factory's player; when another player claims that factory, they steal the player and its adjective
- [x] Factory capture broadcast — When an absorbed player's factory switches sides, broadcast "{claiming team} claimed the {switched player's adjective} Factory"
