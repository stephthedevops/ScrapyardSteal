---
title: "Configuration Analysis"
description: "Documents all configuration surfaces: Vite, TypeScript, Colyseus Cloud, Wavedash, PM2, and in-game settings."
version: "1.0.0"
date: "2026-04-26"
---

# Configuration Analysis

## Overview

Configuration is spread across build tools, TypeScript compilers, deployment platforms, and runtime game settings. There is no centralized config service — each concern has its own file.

## Build Configuration

### Vite (`vite.config.ts`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `base` | `"./"` | Relative asset paths for static hosting |
| `define.__APP_VERSION__` | From `package.json` version | Injected build-time version string |
| `build.outDir` | `"dist"` | Client build output directory |
| `build.assetsDir` | `"assets"` | Asset subdirectory within dist |
| `server.port` | `3000` | Vite dev server port |

### Vitest (`vitest.config.ts`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `test.include` | `["tests/**/*.{test,prop}.ts"]` | Matches unit and property-based test files |
| `test.environment` | `"node"` | Node.js test environment |
| `test.globals` | `true` | Global test functions (describe, it, expect) |
| `resolve.alias.server` | `"/server"` | Allows `import from "server/..."` in tests |
| `resolve.alias.src` | `"/src"` | Allows `import from "src/..."` in tests |

### Playwright (`playwright.config.ts`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `testDir` | `"tests/e2e"` | E2E test directory |
| `timeout` | `30000` | 30-second test timeout |
| `use.baseURL` | `"http://localhost:3000"` | Dev server URL |
| `projects` | Chromium only | Single browser target |
| `webServer.command` | `"npm run dev"` | Auto-starts Vite dev server |
| `webServer.port` | `3000` | Expected dev server port |

## TypeScript Configuration

### Client (`tsconfig.json`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `target` | `ES2020` | Modern JavaScript output |
| `module` | `ESNext` | ES module syntax for Vite |
| `moduleResolution` | `bundler` | Vite-compatible resolution |
| `strict` | `true` | Full strict mode |
| `isolatedModules` | `true` | Required for Vite/esbuild |
| `lib` | `["ES2020", "DOM", "DOM.Iterable"]` | Browser + modern JS APIs |
| `include` | `["src/**/*"]` | Client source only |
| `exclude` | `["node_modules", "dist", "server"]` | Excludes server code |

### Server (`tsconfig.server.json`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `target` | `ES2020` | Modern JavaScript output |
| `module` | `commonjs` | Node.js-compatible modules |
| `moduleResolution` | `node` | Standard Node resolution |
| `strict` | `true` | Full strict mode |
| `experimentalDecorators` | `true` | Required for `@colyseus/schema` `@type` decorators |
| `outDir` | `build` | Compiled server output |
| `rootDir` | `server` | Server source root |
| `include` | `["server/**/*"]` | Server source only |

## Deployment Configuration

### Colyseus Cloud (`.colyseus-cloud.json`)

| Field | Value | Purpose |
|-------|-------|---------|
| `production.applicationId` | `"1449-scrapyardsteal"` | Application identifier |
| `production.token` | `<DEPLOYMENT_TOKEN>` | Authentication token for deployment CLI |

### Wavedash (`wavedash.toml`)

| Field | Value | Purpose |
|-------|-------|---------|
| `game_id` | `"j976g1g2xp93nmhwrynr49mc9185hbe6"` | Game identifier on Wavedash platform |
| `upload_dir` | `"./dist"` | Directory to upload |
| `entrypoint` | `"index.html"` | Entry HTML file |

### PM2 (`ecosystem.config.js`)

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `"scrapyard-steal"` | Process name |
| `script` | `"build/index.js"` | Compiled server entry point |
| `instances` | `1` | Single instance (Colyseus manages rooms internally) |
| `exec_mode` | `"fork"` | Fork mode (not cluster) |
| `env.NODE_ENV` | `"production"` | Production environment flag |
| `wait_ready` | `true` | Wait for process ready signal |
| `listen_timeout` | `10000` | 10-second startup timeout |
| `kill_timeout` | `5000` | 5-second graceful shutdown |

## Environment Variables

| Variable | Context | Default | Purpose |
|----------|---------|---------|---------|
| `VITE_SERVER_URL` | Client build-time | `ws://localhost:2567` | WebSocket server URL |
| `NODE_ENV` | Server runtime | — | Environment mode |

The production build script sets `VITE_SERVER_URL` inline:

```bash
VITE_SERVER_URL=wss://us-ord-ef0ec457.colyseus.cloud vite build
```

## In-Game Configuration Options

Configurable by the host during the lobby phase via the `setConfig` message handler.

### Time Limit

| Value | Display | Behavior |
|-------|---------|----------|
| `0` | ☠ Deathmatch | No timer; game ends only by elimination |
| `120` | 2 min | 2-minute round |
| `300` | 5 min | 5-minute round (default) |
| `420` | 7 min | 7-minute round |
| `600` | 10 min | 10-minute round |

### Match Format

| Value | Display | Win Condition |
|-------|---------|---------------|
| `"single"` | Single Match | One round determines the winner |
| `"bo3"` | Best of 3 | First to 2 round wins |
| `"bo5"` | Best of 5 | First to 3 round wins |

### Gear Scrap Supply

| Value | Description |
|-------|-------------|
| `50` | Very low scrap per gear pile |
| `100` | Low scrap |
| `500` | Medium scrap |
| `1000` | Default scrap |
| `2000` | High scrap |

### Max Players

| Value | Color Palette |
|-------|---------------|
| `10` | 10 base colors |
| `20` | 10 base + 10 extended colors |

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start Vite dev server |
| `build` | `tsc && vite build` | Type-check and build client |
| `build:prod` | Sets prod URL, builds, zips | Production client build |
| `server` | `ts-node server/index.ts` | Run server directly |
| `server:dev` | `nodemon` + `ts-node` | Run server with hot reload |
| `server:build` | `tsc --project tsconfig.server.json` | Compile server to `build/` |
| `test` | `vitest run` | Run all unit + property tests |
| `test:watch` | `vitest` | Watch mode testing |
| `test:coverage` | `vitest run --coverage` | Tests with coverage report |
| `test:e2e` | `playwright test` | Run Playwright e2e tests |
| `test:all` | `vitest run && playwright test` | Run all tests |
