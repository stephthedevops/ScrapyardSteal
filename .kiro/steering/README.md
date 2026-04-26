---
title: "Steering Directory Inventory"
description: "Index of all active steering files for this project"
version: "1.0.0"
lastUpdated: "2026-04-26"
lastUpdatedBy: "AI Assistant"
inclusion: "manual"
---

# Kiro Steering Directory

This directory contains steering files for Kiro AI that define coding standards, processes, and tool configurations for the Scrapyard Steal project.

## Steering File Inventory

### Universal Standards (always or manual inclusion)

| File | Description | Inclusion |
|---|---|---|
| `core-rules.md` | Time/date verification, fundamental rules (CST timezone) | manual |
| `security-standards.md` | OWASP Top 10 and NIST compliance, secure coding practices | manual |
| `conventional-commits.md` | Conventional Commits specification compliance | manual |
| `commit-workflow.md` | Mandatory pre-commit validation checklist | manual |
| `automated-rule-versioning.md` | Automatic version management for steering files | manual |
| `npm-code-blocks.md` | Format npm commands as clickable bash code blocks | auto |

### Tech-Stack Specific (fileMatch inclusion)

| File | Description | Patterns |
|---|---|---|
| `typescript-standards.md` | Google TypeScript Style Guide, security patterns | `**/*.{ts,tsx,js,jsx}` |
| `reverse-engineering.md` | Architecture patterns and conventions from codebase analysis | `server/**/*.ts`, `src/**/*.ts`, `tests/**/*.ts` |

### Trigger/Router Files (always inclusion)

| File | Description |
|---|---|
| `git-operations-trigger.md` | Routes git-related requests to Git Operations subagent |
| `documentation-agent-trigger.md` | Routes documentation requests to Document Writer subagent |

## Inclusion Types

- **always**: Loaded into AI context on every interaction
- **fileMatch**: Loaded when file patterns match the current context
- **manual**: Only loaded when explicitly requested via `#` context key
- **auto**: Automatically included (legacy, equivalent to always)

## Maintenance

When adding or updating steering files:
1. Follow the frontmatter schema (title, description, version, inclusion, patterns)
2. Use `automated-rule-versioning.md` rules for version increments
3. Update this README inventory
4. Use `scripts/update-rule-versions.sh` for manual version bumps

## Related Resources

- **Skills**: `.kiro/skills/` — On-demand capabilities (git-commit-standards, markdown-writing, mermaid-diagrams)
- **Hooks**: `.kiro/hooks/` — Automated workflow triggers
