# Testing Guide — Scrapyard Steal

## Overview

The project uses two test frameworks:

- **Vitest** — unit and integration tests for game logic, server state, and pure functions. Fast, no browser required.
- **Playwright** — end-to-end tests that run in a real browser. Used for verifying the game loads, canvas rendering, UI overlays, and multiplayer flows.

## Directory Structure

```
tests/
├── unit/              # Vitest tests
│   └── state/
│       └── GameState.test.ts
└── e2e/               # Playwright tests
    └── game-loads.spec.ts
```

Unit tests mirror the source tree they cover. For example, tests for `server/state/GameState.ts` live at `tests/unit/state/GameState.test.ts`.

E2E tests are organized by feature or user flow rather than source file.

## Running Tests

| Command                  | What it does                                      |
|--------------------------|---------------------------------------------------|
| `npm test`               | Run all unit tests once                           |
| `npm run test:watch`     | Run unit tests in watch mode                      |
| `npm run test:coverage`  | Run unit tests with coverage report               |
| `npm run test:e2e`       | Run Playwright E2E tests (auto-starts dev server) |
| `npm run test:all`       | Run unit tests, then E2E tests                    |

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

| Category                        | Framework  | Examples                                        |
|---------------------------------|------------|-------------------------------------------------|
| State defaults and mutations    | Vitest     | Player init values, resource calculations       |
| Game logic                      | Vitest     | Tile claiming rules, border conflict resolution |
| Server room behavior            | Vitest     | Player join/leave, state sync                   |
| Game loads and renders           | Playwright | Canvas appears, no console errors               |
| Multiplayer flows               | Playwright | Two browser contexts join the same room         |
| UI overlays and HUD             | Playwright | Upgrade buttons, resource display               |
| Visual regression               | Playwright | Screenshot comparisons of game states           |

## Configuration Files

- `vitest.config.ts` — Vitest settings (test paths, environment)
- `playwright.config.ts` — Playwright settings (browser, base URL, web server)
