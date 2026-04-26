# Contributing to Scrapyard Steal

Thank you for your interest in contributing to Scrapyard Steal! Whether you're fixing a bug, adding a feature, improving documentation, or reporting an issue — every contribution helps make the game better.

## Getting Started

Before contributing, make sure you:

- [ ] Read the [README.md](README.md) for a project overview
- [ ] Set up your local development environment — follow the [Developer Onboarding Guide](docs/onboarding/developer-setup.md)
- [ ] Have access to the [GitHub repository](https://github.com/stephthedevops/ScrapyardSteal)

## How to Contribute

### Reporting Bugs

Found a bug? Open a [GitHub Issue](https://github.com/stephthedevops/ScrapyardSteal/issues) with:

- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior vs. actual behavior
- Browser and OS information
- Screenshots or console logs if applicable

### Requesting Features

Have an idea? Open a [GitHub Issue](https://github.com/stephthedevops/ScrapyardSteal/issues) with:

- A description of the feature and the problem it solves
- Any mockups or examples if applicable
- Whether you'd be willing to implement it

### Contributing Code

1. Fork the repository (or create a branch if you have write access)
2. Follow the development workflow below
3. Submit a pull request

## Development Workflow

### 1. Branch from main

Always create your branch from the latest `main`:

```bash
git checkout main
git pull origin main
git checkout -b your-branch-name
```

### 2. Branch naming

Use a descriptive prefix:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance, dependencies, config |

Examples:
- `feature/ai-difficulty-levels`
- `fix/defense-bot-placement-crash`
- `docs/update-architecture-diagrams`
- `test/conflict-engine-edge-cases`

### 3. Make your changes

Write your code, following the coding standards below.

### 4. Run tests

Before committing, make sure everything passes:

```bash
npm test
```

### 5. Commit your changes

Write a clear commit message following the Conventional Commits format (see below).

```bash
git add <files>
git commit -m "feat(server): add configurable AI difficulty"
```

### 6. Push and create a pull request

```bash
git push -u origin your-branch-name
```

Then open a pull request on GitHub against `main`.

## Commit Messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies |
| `ci` | CI/CD changes |
| `build` | Build system changes |

### Rules

- Use **imperative mood**: "add feature" not "added feature"
- No period at the end of the description
- Keep the description under 72 characters
- Scope and type must be lowercase

### Examples

```
feat(server): add configurable AI difficulty levels
fix(grid): prevent tile claim on occupied factory tile
test(conflict-engine): add property tests for attack pressure formula
docs(readme): update quick start instructions
refactor(lobby): extract color picker into separate component
perf(rendering): batch tile updates to reduce draw calls
chore: upgrade phaser to 3.85.0
```

### Breaking changes

Use `!` after the type/scope or add a `BREAKING CHANGE:` footer:

```
feat(server)!: change room config schema for match formats

BREAKING CHANGE: `timeLimit` field renamed to `timeLimitSeconds`
```

## Pre-Commit Checklist

Before every commit, verify:

- [ ] **Everything compiles** — `npm run build` and `npm run server:build` succeed with no errors
- [ ] **All tests pass** — `npm test` shows all tests passing
- [ ] **Documentation is up to date** — README, architecture docs, and code comments reflect your changes
- [ ] **No secrets in code** — No API keys, tokens, passwords, or credentials committed

## Coding Standards

This project uses **TypeScript in strict mode** across both client and server. For the full style guide, see [.kiro/steering/typescript-standards.md](.kiro/steering/typescript-standards.md).

### Key conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Functions and variables | `camelCase` | `getPlayerScore`, `tileCount` |
| Classes and interfaces | `PascalCase` | `GameRoom`, `PlayerState` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PLAYERS`, `BATTLE_TICK_RATE` |
| Files | `PascalCase` for classes, `camelCase` for utilities | `GameRoom.ts`, `sanitize.ts` |

### General guidelines

- Use `readonly` for properties that shouldn't change after initialization
- Prefer explicit types over `any` — strict mode enforces this
- Use type guards for runtime type checking
- Write JSDoc comments for public APIs and exported functions
- Keep functions focused — one function, one responsibility

## Testing Requirements

### Expectations

- **New features** must include tests covering the core behavior
- **Bug fixes** must include a regression test that would have caught the bug
- **Property-based tests** are encouraged for logic with wide input ranges — we use [fast-check](https://github.com/dubzzz/fast-check) extensively

### Test commands

| Command | What it runs |
|---------|-------------|
| `npm test` | All unit and property tests (Vitest) |
| `npm run test:coverage` | Tests with V8 code coverage report |
| `npm run test:e2e` | Playwright end-to-end tests (requires Chromium) |
| `npm run test:all` | Vitest tests + Playwright e2e tests |

### Test file locations

| Type | Directory | Naming pattern |
|------|-----------|---------------|
| Unit tests | `tests/unit/` | `*.test.ts` |
| Property tests | `tests/property/` | `*.prop.ts` |
| E2E tests | `tests/e2e/` | `*.spec.ts` |

### Writing property tests

Property tests live in `tests/property/` and use fast-check to generate random inputs. Example pattern:

```typescript
import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("MyModule", () => {
  it("should satisfy some property for all valid inputs", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        // Property assertion here
        expect(someFunction(n)).toSatisfySomeCondition();
      })
    );
  });
});
```

## Documentation

### When to update docs

- **README.md** — When you change setup steps, add features visible to players, or modify the tech stack
- **Architecture docs** (`docs/architecture/`) — When you change module structure, add endpoints, modify schemas, or alter data flows
- **Game design** (`doc/game-design.md`) — When you change gameplay mechanics or balance
- **Code comments / JSDoc** — When you add or change public APIs, exported functions, or complex logic

### JSDoc for public APIs

```typescript
/**
 * Calculate attack damage for a battle tick.
 * Damage = factories + floor(ATK bots / active battles)
 *
 * @param factories - Number of factories the attacker owns
 * @param atkBots - Number of ATK bots the attacker has
 * @param activeBattles - Number of concurrent battles the attacker is fighting
 * @returns Damage dealt this tick
 */
function calculateAttackDamage(factories: number, atkBots: number, activeBattles: number): number {
  return factories + Math.floor(atkBots / Math.max(activeBattles, 1));
}
```

## Review Process

### What reviewers look for

- **Correctness** — Does the code do what it claims? Are edge cases handled?
- **Security** — No hardcoded secrets, proper input validation, safe state mutations
- **Tests** — Are new behaviors tested? Do existing tests still pass?
- **Style** — Follows TypeScript standards, consistent naming, clear code
- **Performance** — No unnecessary re-renders, efficient state updates, no memory leaks

### Merge requirements

- Pull request has been reviewed and approved
- All tests pass (`npm test` and `npm run test:e2e`)
- Branch is up to date with `main`
- No unresolved review comments

## Issue Tracking

This project uses a lightweight **markdown-based issue tracking system** in the [`issue_tracking/`](issue_tracking/) directory.

### File structure

| File | What it tracks |
|------|---------------|
| [`core-priorities.md`](issue_tracking/core-priorities.md) | Must-do items before submission |
| [`known-bugs.md`](issue_tracking/known-bugs.md) | Confirmed bugs |
| [`nice-to-haves.md`](issue_tracking/nice-to-haves.md) | Polish items — nice but not blocking |
| [`backlog.md`](issue_tracking/backlog.md) | Post-jam and future feature ideas |
| [`completed.md`](issue_tracking/completed.md) | Done and verified items |
| [`rejected.md`](issue_tracking/rejected.md) | Items considered but decided against |

### How to add an item

Add a checkbox line to the appropriate file:

```markdown
- [ ] Short description of the task @yourname
```

If you're unsure which file, add it to `backlog.md`. See [`issue_tracking/00_README.md`](issue_tracking/00_README.md) for the full guide on tagging, assigning, and triaging issues.

## License

This project is licensed under the [MIT License](LICENSE). By contributing, you agree that your contributions will be licensed under the same MIT License.
