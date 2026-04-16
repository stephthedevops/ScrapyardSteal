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
