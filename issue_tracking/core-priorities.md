# Core Priorities (cpr)

Must-do items before jam submission on April 26th.

## Gameplay — Ship Blockers

- [ ] Win condition when only one team remains (end game early, don't wait for timer)
- [ ] Balance pass on tile claim cost, upgrade costs, and income rate
- [ ] Playtest with 4+ players and tune border conflict pressure formula
- [ ] Ensure absorbed players can reliably click tiles and mine gears for their team
- [ ] Equidistant starting positions — Players placed equally spaced around a circle, max 2 spaces from edge
- [ ] Decide min/max players — Verify and finalize supported player count range

## Deployment

- [ ] Deploy Colyseus server to us-ord-ef0ec457.colyseus.cloud
- [ ] Switch client to prod server URL and build for production
- [ ] Deploy client build to itch.io as jam submission
- [ ] Test full flow on itch.io (create game, join by code, play, end screen)

## Submission Requirements

- [ ] Game runs in browser without plugins (HTML5)
- [cpt] English as default language
- [ ] Theme "Machines" is clearly represented (scrapyard, factories, bots)
- [ ] New content created for the jam (not a pre-existing project)

## Challenge Tracks

- [ ] Build it with Phaser — confirm Phaser is the engine, submit to challenge
- [ ] Open Source by GitHub — add LICENSE and README to repo, submit to challenge
- [ ] Deploy to Wavedash — deploy and submit for cash prizes

## Polish — Must Have

- [bl] Fix non-host lobby transition bug (players stuck on lobby screen)
- [ ] Verify game end screen shows correct winner with full team name
- [ ] Test color persistence after absorption (your team stays your color)
