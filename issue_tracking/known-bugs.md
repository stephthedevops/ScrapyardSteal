# Known Bugs (kb)

Tracked issues that need fixing.

## Critical

(None — resolved)

## Gameplay

(None — resolved)

## UI

(None — resolved)

## Networking

- [ ] Room short code lookup uses HTTP GET which may fail with CORS on some deployments
- [ ] No validation that short code is unique across server restarts (in-memory only)
- [ ] Host should have a ♻ button next to room code to regenerate a new room and transfer lobby state

## From Code Audit

- [ ] Room code lookup in NetworkManager has no timeout or retry logic
