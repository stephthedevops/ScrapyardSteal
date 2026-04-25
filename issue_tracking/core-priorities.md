# Core Priorities (cpr)

Must-do items before jam submission on April 26th.

## Gameplay — Ship Blockers

- [x] Remove growth direction feature — remove arrow key direction steering, DirectionFilter logic, and server-side direction handling (no longer in tutorial or hint popup)

## Challenge Tracks

- [x] Deploy to Wavedash — deploy and submit for cash prizes

## Gameplay — Factory Capture

- [x] Factory capture choice — When a player's factory is claimed, give them the option to surrender their tiles to the captor or drop all tiles as unclaimed; broadcast "team absorbed [name]" only after the choice is made
- [x] Factory adjective transfer — When an absorbed player's spawn factory is unclaimed, the team that lost it loses the adjective associated with that factory's player; when another player claims that factory, they steal the player and its adjective
- [x] Factory capture broadcast — When an absorbed player's factory switches sides, broadcast "{claiming team} claimed the {switched player's adjective} Factory"

## Lobby

- [x] Autopick colors — Automatically assign a unique color to each player when they enter the lobby

## Visual

- [x] Shrink gear icon in scrap cost label — Reduce the size of the gear icon displayed in the scrap cost label for better visual balance

## Nathan's Feedback — Scrap & Economy

- [x] Upgrade cost formula should be 50 + (5 × level) instead of flat 50×level
