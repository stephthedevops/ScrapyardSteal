# Known Bugs (kb)

Tracked issues that need fixing.

## Critical

- [ ] Non-host players sometimes don't transition from lobby to game (relies on polling fallback)
- [ ] Game doesn't check for win condition when only one team remains (only timer-based end)

## Gameplay

- [ ] Border conflict can transfer tiles from an already-absorbed player in the same tick
- [ ] Absorbed players can still receive resource income for one tick after absorption
- [ ] Gear mining doesn't animate or give visual feedback on click
- [ ] Claiming a gear tile and mining it in the same click may double-deduct resources

## UI

- [ ] Move team info box (Scrap, Attack, Defense, etc.) to middle-left, avoid covering grid tiles
- [ ] Move attack/defense upgrade buttons to the right side, off the board
- [ ] Leaderboard background doesn't resize dynamically for very long team names
- [ ] Tooltip follows cursor off-screen without clamping to game bounds
- [ ] Color picker X marks don't update if a player disconnects and frees their color
- [ ] Reroll button position is fixed and may overlap player list with many players
- [ ] New tag line needed on start page (replace "multiplayer territory game")

## Networking

- [ ] Room short code lookup uses HTTP GET which may fail with CORS on some deployments
- [ ] No validation that short code is unique across server restarts (in-memory only)
- [ ] Player names can have duplicate adjectives or nouns across players in the same lobby
- [ ] Host should have a ♻ button next to room code to regenerate a new room and transfer lobby state
- [ ] Color is stored on the player but should conceptually be per-player not per-team (verify display logic)
