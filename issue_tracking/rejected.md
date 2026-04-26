# Rejected (rej)

Items that were considered but decided against.

## Nathan's Feedback — Scrap & Economy

- Starting factory should generate inexhaustible scrap when clicked — Conflicts with "Removed passive scrap income" design decision
- Starting factory should auto-generate 1 scrap/sec passively (no click needed) — Conflicts with "Removed passive scrap income" design decision

## From Code Audit

- No direction filter indicator on HUD — Conflicts with "Remove growth direction feature" in core-priorities

## Nathan's ATK / DEF Rework

- Neutral tiles should also require time to capture (~1s), requiring at least 1 Attack Bot — Rejected during triage
- Progress bar / graphic when capturing a tile (show attack bot on tile) — Rejected during triage

## Gameplay — Accepted Risk

- Border conflict can transfer tiles from an already-absorbed player in the same tick — mitigated by absorption mechanic overhaul
- Absorbed players can still receive resource income for one tick after absorption — mitigated by absorption mechanic overhaul
- Claiming a gear tile and mining it in the same click may double-deduct resources — accepted risk; unclaimed gears are intentionally minable
