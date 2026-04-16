# Completed (cpt)

Items that have been implemented and verified.

## Gameplay

- [x] Game timer / win condition — End game after 5 minutes, declare winner by tile count
- [x] Spectator mode — Absorbed players help their absorber's team (click to claim/mine)
- [x] Gear tiles — Random gears with 50 scrap each, mined by clicking, yield = attack stat
- [x] Team absorption — Absorbed player joins absorber's team, adjective stacks on team name
- [x] Team members can earn scrap but only team lead can spend
- [x] Steering growth direction — Arrow keys to choose expansion direction, filters claimable tiles

## Lobby & Matchmaking

- [x] Player names — Random "Adjective Animalbot" names with ♻ reroll button
- [x] Room codes — 5-character uppercase codes with [COPY] and [PASTE] buttons
- [x] Host starts game — First player is host, START button only for host
- [x] Multiple lobbies — Create Game / Join Game flow with separate rooms
- [x] Menu screen — CREATE GAME / JOIN GAME with join code input, BACK, ENTER LOBBY buttons

## Visual & Audio

- [x] Metal-themed colors — Copper, Corroded Copper, Gold, Tarnished Silver, Titanium, Cobalt, Bismuth, Rusty Iron, Chromium, Tungsten
- [x] Red X on taken colors — Bright red ✕ overlay instead of dimming
- [x] Factory emoji on spawn tiles — 🏭 at 50% tile size
- [x] Gear emoji on gear tiles — ⚙ disappears when depleted
- [x] Equidistant starting positions — Circular placement on grid
- [x] Color persistence — Your team always renders in your chosen color on your screen

## UX & Polish

- [x] Tooltips — Hover over tiles to see owner name and gear scrap remaining
- [x] End-game screen — Winner announcement with "Back to Menu" button
- [x] Absorption notification — "Otterbot scrapped Falconbot" using nouns only
- [x] Fixed absorption message showing "someone" instead of absorber's name
- [x] Leaderboard — Full team names displayed

## Technical

- [x] Framework scaffold — Phaser 3 + Colyseus + TypeScript + Vite
- [x] Server game loop — 1-second tick with income, border conflict, absorption
- [x] Client-server sync — Colyseus state synchronization
- [x] Vitest + fast-check — Test infrastructure installed
- [x] Steering rule — npm commands formatted as clickable code blocks
