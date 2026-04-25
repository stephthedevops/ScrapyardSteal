# Known Bugs (kb)

Tracked issues that need fixing.

## Critical

(None — resolved)

## Gameplay

- [ ] Gears not spawning
- [x] Border conflict can transfer tiles from an already-absorbed player in the same tick [rej] — mitigated by absorption mechanic overhaul
- [x] Absorbed players can still receive resource income for one tick after absorption [rej] — mitigated by absorption mechanic overhaul
- [x] Claiming a gear tile and mining it in the same click may double-deduct resources [rej] — accepted risk

## UI

- [x] Color picker X marks don't update if a player disconnects and frees their color @steph
- [ ] Reroll button position is fixed and may overlap player list with many players

## Networking

- [ ] Room short code lookup uses HTTP GET which may fail with CORS on some deployments
- [ ] No validation that short code is unique across server restarts (in-memory only)
- [ ] Host should have a ♻ button next to room code to regenerate a new room and transfer lobby state
- [ ] Color is stored on the player but should conceptually be per-player not per-team (verify display logic)

## From Code Audit

- [ ] Room code lookup in NetworkManager has no timeout or retry logic
