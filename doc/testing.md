# Testing Guide — Scrapyard Steal

## Overview

The project uses three test approaches across two frameworks:

- **Vitest (unit)** — deterministic tests for game logic, server state, and pure functions. Fast, no browser required.
- **Vitest (property-based)** — uses [fast-check](https://github.com/dubzzz/fast-check) to verify behavioral invariants (monotonicity, linearity, bounds) across randomly generated inputs. Catches classes of bugs that specific test cases miss.
- **Playwright** — end-to-end tests that run in a real browser. Used for verifying the game loads, canvas rendering, UI overlays, and multiplayer flows.

## Directory Structure

```
tests/
├── unit/                    # Vitest unit tests
│   ├── nameGenerator.test.ts
│   ├── state/
│   │   └── GameState.test.ts
│   └── logic/
│       ├── GridManager.test.ts
│       ├── ConflictEngine.test.ts
│       └── DirectionFilter.test.ts
├── property/                # Vitest property-based tests (fast-check)
│   ├── nameGenerator.prop.ts
│   ├── GridManager.prop.ts
│   ├── ConflictEngine.prop.ts
│   └── DirectionFilter.prop.ts
└── e2e/                     # Playwright tests
    └── game-loads.spec.ts
```

Unit tests mirror the source tree they cover. For example, tests for `server/logic/ConflictEngine.ts` live at `tests/unit/logic/ConflictEngine.test.ts`.

Property-based tests live in `tests/property/` and use the `.prop.ts` extension. They test the same modules as unit tests but verify structural invariants rather than specific input/output pairs.

E2E tests are organized by feature or user flow rather than source file.

## Running Tests

| Command                  | What it does                                      |
|--------------------------|---------------------------------------------------|
| `npm test`               | Run all unit + property tests once                |
| `npm run test:watch`     | Run unit + property tests in watch mode           |
| `npm run test:coverage`  | Run unit + property tests with coverage report    |
| `npm run test:e2e`       | Run Playwright E2E tests (auto-starts dev server) |
| `npm run test:all`       | Run unit + property tests, then E2E tests         |

Both unit tests (`*.test.ts`) and property-based tests (`*.prop.ts`) are included in the Vitest config and run together with `npm test`.

## Writing Unit Tests (Vitest)

Unit tests are for anything that doesn't need a browser: state management, game logic, resource calculations, conflict resolution, etc.

### Conventions

- File naming: `<SourceFile>.test.ts`
- Place tests in `tests/unit/` mirroring the source path
- Use `describe` / `it` blocks with clear descriptions
- Vitest globals (`describe`, `it`, `expect`) are available without imports, but explicit imports are fine too

### Example

```ts
import { describe, it, expect } from "vitest";
import { Player } from "../../../server/state/GameState";

describe("Player", () => {
  it("should start with 1 attack", () => {
    const player = new Player();
    expect(player.attack).toBe(1);
  });
});
```

## Writing E2E Tests (Playwright)

E2E tests verify behavior from the player's perspective in a real browser. The Playwright config automatically starts the Vite dev server before running tests.

### Conventions

- File naming: `<feature-or-flow>.spec.ts`
- Place tests in `tests/e2e/`
- Screenshots are captured automatically on failure

### Working with the Phaser Canvas

Phaser renders to `<canvas>`, so standard DOM selectors won't find game objects. Strategies for asserting game state:

1. **Expose state on `window`** — In dev/test mode, attach game state to `window` so Playwright can read it via `page.evaluate()`.
2. **Screenshot comparison** — Use `expect(page).toHaveScreenshot()` for visual regression.
3. **Canvas pixel sampling** — Use `page.evaluate()` to read pixel data from the canvas at known coordinates.

### Example

```ts
import { test, expect } from "@playwright/test";

test("game canvas is visible", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("#game-container canvas");
  await expect(canvas).toBeVisible({ timeout: 5_000 });
});
```

## What to Test Where

| Category                        | Framework        | Examples                                        |
|---------------------------------|------------------|-------------------------------------------------|
| State defaults and mutations    | Vitest (unit)    | Player init values, resource calculations       |
| Game logic (pure functions)     | Vitest (unit)    | Border pressure, tile claim cost, grid init     |
| Behavioral invariants           | Vitest (PBT)     | Monotonicity, linearity, bounds, stalemate      |
| Direction filtering             | Vitest (unit+PBT)| Cardinal filtering, centroid-relative subsets    |
| Name generation                 | Vitest (unit+PBT)| Array integrity, uniqueness, format             |
| Server room behavior            | Vitest (unit)    | Player join/leave, state sync                   |
| Game loads and renders          | Playwright       | Canvas appears, no console errors               |
| Multiplayer flows               | Playwright       | Two browser contexts join the same room         |
| UI overlays and HUD             | Playwright       | Upgrade buttons, resource display               |
| Visual regression               | Playwright       | Screenshot comparisons of game states           |

## Writing Property-Based Tests (fast-check)

Property-based tests verify structural invariants that should hold across any reasonable implementation, regardless of specific formula values. They complement unit tests: unit tests pin current behavior, PBTs catch classes of bugs.

### Conventions

- File naming: `<SourceFile>.prop.ts`
- Place tests in `tests/property/`
- Use `fast-check` (`fc`) for random input generation
- Test invariants (monotonicity, positivity, linearity, subset relationships), not formula restatements

### When to Use PBTs vs Unit Tests

- **Unit tests**: Pin specific input/output pairs. Break when formulas change (intentional — forces review).
- **PBTs**: Verify properties that survive balance tweaks (e.g., "cost always increases with tile count"). Don't break on formula changes unless the structural guarantee is violated.

### Example

```ts
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateTileClaimCost } from "../../server/logic/ConflictEngine";

describe("ConflictEngine Properties", () => {
  it("tile claim cost is monotonically non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, offset) => {
          const b = a + offset;
          expect(calculateTileClaimCost(a)).toBeLessThanOrEqual(
            calculateTileClaimCost(b)
          );
        }
      )
    );
  });
});
```

### Tile Fixture Helper

Tests that need `Tile` objects define an inline helper per file:

```ts
function makeTile(x: number, y: number, ownerId = ""): Tile {
  const t = new Tile();
  t.x = x;
  t.y = y;
  t.ownerId = ownerId;
  return t;
}
```

## Configuration Files

- `vitest.config.ts` — Vitest settings (test paths, environment)
- `playwright.config.ts` — Playwright settings (browser, base URL, web server)
