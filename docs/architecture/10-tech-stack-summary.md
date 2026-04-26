---
title: "Tech Stack Summary"
description: "Complete technology inventory with versions, purposes, and notes."
version: "1.0.0"
date: "2026-04-26"
---

# Tech Stack Summary

## Overview

Scrapyard Steal is a multiplayer clicker/strategy game built with TypeScript on both client and server. The client uses Phaser 3 for rendering and the server uses Colyseus for authoritative real-time multiplayer.

## Core Technologies

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| TypeScript | ^5.4.0 | Language for both client and server | Strict mode enabled in both tsconfigs |
| Node.js | — | Server runtime | Version determined by Colyseus Cloud environment |

## Client Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `phaser` | ^3.80.0 | 2D game framework (rendering, input, audio, scenes) | Canvas/WebGL auto-detection via `Phaser.AUTO` |
| `colyseus.js` | ^0.15.28 | WebSocket client for Colyseus server | Handles room joining, state sync, message passing |
| `@wvdsh/sdk-js` | ^1.2.4 | Wavedash platform SDK | Initialized in `postBoot` callback; dev dependency |

## Server Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `colyseus` | ^0.15.57 | Authoritative multiplayer game server | Room lifecycle, schema sync, WebSocket management |
| `@colyseus/tools` | ^0.15.49 | Server bootstrap utilities | `listen(app)` entry point, Express integration |
| `@colyseus/monitor` | ^0.15.0 | Real-time monitoring dashboard | Exposed at `/colyseus`; should be auth-protected in production |

## Build Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `vite` | ^5.4.0 | Client bundler and dev server | ES module-based, fast HMR |
| `ts-node` | ^10.9.0 | TypeScript execution for server | Used with `--project tsconfig.server.json` |
| `nodemon` | ^3.1.0 | Server hot-reload during development | Watches server files, restarts ts-node |

## Testing Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `vitest` | ^4.1.4 | Unit and property test runner | 157 tests across 25 files |
| `@vitest/coverage-v8` | ^4.1.4 | Code coverage via V8 | Coverage reports in `coverage/` directory |
| `fast-check` | ^4.6.0 | Property-based testing library | 18 property test files in `tests/property/` |
| `@playwright/test` | ^1.59.1 | End-to-end browser testing | 1 e2e test; Chromium only; auto-starts dev server |

## Deployment

| Platform | Purpose | Configuration |
|----------|---------|---------------|
| Colyseus Cloud | Server hosting (US-ORD region) | `.colyseus-cloud.json` |
| Wavedash | Client static hosting | `wavedash.toml` |
| PM2 | Process management on Colyseus Cloud | `ecosystem.config.js` |

## Architecture Characteristics

| Characteristic | Implementation |
|----------------|---------------|
| State management | In-memory Colyseus schema (no database) |
| Authentication | None (session-based identity) |
| Communication | WebSocket (primary) + HTTP REST (room discovery) |
| Rendering | Phaser 3 with `Phaser.AUTO` (Canvas/WebGL) |
| Resolution | 800×600 with `Phaser.Scale.FIT` and `CENTER_BOTH` |
| Module system | ESNext (client, via Vite) / CommonJS (server, via ts-node) |

## Compiler Settings

| Setting | Client | Server |
|---------|--------|--------|
| Target | ES2020 | ES2020 |
| Module | ESNext | CommonJS |
| Module Resolution | bundler | node |
| Strict | true | true |
| Decorators | — | experimentalDecorators |
| Output | dist/ | build/ |

## Concerns and Recommendations

| Concern | Severity | Details |
|---------|----------|---------|
| Monitor endpoint unprotected | Medium | `/colyseus` exposes room state without authentication. Add auth middleware for production. |
| No persistent storage | Low | All state is in-memory. Room disposal loses all data. Acceptable for a session-based game. |
| JSON-encoded schema fields | Low | `defenseBotsJSON`, `collectorsJSON`, `seriesScoresJSON` bypass schema typing. Consider Colyseus `ArraySchema` of a custom schema if nesting support improves. |
| Single-region deployment | Low | Server runs in US-ORD only. Players in other regions may experience higher latency. |
| Deployment token in repo | Medium | `.colyseus-cloud.json` contains a deployment token. Ensure this file is in `.gitignore` for public repositories. |
| No structured logging | Low | Server uses `console.log`. Consider a structured logger for production monitoring. |
| Client-server version coupling | Low | `colyseus.js` (^0.15.28) and `colyseus` (^0.15.57) must stay compatible. Pin to matching minor versions. |

## Test Coverage Summary

| Category | Files | Count |
|----------|-------|-------|
| Unit tests | 7 | `tests/unit/` |
| Property-based tests | 18 | `tests/property/` |
| E2E tests | 1 | `tests/e2e/` |
| **Total** | **26** | **~157 tests** |
