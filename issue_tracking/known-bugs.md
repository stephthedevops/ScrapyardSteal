# Known Bugs (kb)

Tracked issues that need fixing.

## Critical

- [ ] Non-host players sometimes don't transition from lobby to game (relies on polling fallback)

## Gameplay

- [ ] Border conflict can transfer tiles from an already-absorbed player in the same tick
- [ ] Absorbed players can still receive resource income for one tick after absorption
- [ ] Gear mining doesn't animate or give visual feedback on click @steph
- [ ] Claiming a gear tile and mining it in the same click may double-deduct resources

## UI

- [ ] Color picker X marks don't update if a player disconnects and frees their color @steph
- [ ] Reroll button position is fixed and may overlap player list with many players

## Networking

- [ ] Room short code lookup uses HTTP GET which may fail with CORS on some deployments
- [ ] No validation that short code is unique across server restarts (in-memory only)
- [ ] Host should have a ♻ button next to room code to regenerate a new room and transfer lobby state
- [ ] Color is stored on the player but should conceptually be per-player not per-team (verify display logic)

## From Code Audit

- [ ] Absorbed players' tiles not transferred to absorber on absorption
- [ ] Room code lookup in NetworkManager has no timeout or retry logic
