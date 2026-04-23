# Core Priorities (cpr)

Must-do items before jam submission on April 26th.

## Gameplay — Ship Blockers

- [ ] Balance pass on tile claim cost, upgrade costs, and income rate
- [ ] Playtest with 4+ players and tune border conflict pressure formula
- [ ] Ensure absorbed players can reliably click tiles and mine gears for their team
- [ ] Decide min/max players — Verify and finalize supported player count range

## Deployment

- [ ] Deploy Colyseus server to us-ord-ef0ec457.colyseus.cloud
- [ ] Switch client to prod server URL and build for production
- [ ] Deploy client build to itch.io as jam submission
- [ ] Test full flow on itch.io (create game, join by code, play, end screen)

## Submission Requirements

(All verified — moved to completed)

## Challenge Tracks

- [ ] Deploy to Wavedash — deploy and submit for cash prizes
- [ ] Property-based tests — Implement the 16 correctness properties from the design doc

## Polish — Must Have

- [ ] Verify game end screen shows correct winner with full team name
- [ ] Test color persistence after absorption (your team stays your color)
- [ ] Add Valokor to GitHub contributors

## From Code Audit — Security & Validation

- [ ] Rate limiting on tile claims, upgrades, and gear mining (prevent click spam)
- [ ] Sanitize player names before broadcast (strip control chars) @steph
- [ ] Gear respawn — when no unclaimed gears remain, spawn new gears (count = player count) on unclaimed tiles every 20 seconds @steph

## Nathan's Feedback — Scrap & Economy

- [ ] Scrap piles should have much higher supply (1000) and be configurable in server config
- [ ] Starting factory should generate inexhaustible scrap when clicked
- [ ] Starting factory should auto-generate 1 scrap/sec passively (no click needed)
- [ ] Show very small cost-to-capture on each tile before clicking
- [ ] Re-theme ATK and DEF as crafting "Attack Bots", "Defense Bots" and add "Collection Bots"
- [ ] Upgrade cost should scale by % (e.g. 10% increase) instead of flat 50×level
