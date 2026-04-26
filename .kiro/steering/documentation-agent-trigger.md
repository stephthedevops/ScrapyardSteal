---
title: "Documentation Agent Trigger"
description: "Routes documentation-related requests to the Document Writer Agent"
version: "1.0.0"
lastUpdated: "2026-03-01"
inclusion: "always"
---

# Documentation Agent Trigger

When the user's request matches any of these categories, you MUST delegate via subagent. Do NOT handle documentation operations inline.

## Trigger Categories

- **Documentation Writing**: write documentation, create docs, technical writing, API documentation
- **Markdown Formatting**: markdown, format document, frontmatter, documentation template
- **Mermaid Diagrams**: mermaid, flowchart, sequence diagram, class diagram, state diagram, ER diagram, architecture diagram, Gantt chart
- **README/CHANGELOG**: update README, update CHANGELOG, changelog entry, release notes
- **Code Documentation**: JSDoc, docstring, code comments, document this function, document this class
- **Documentation Review**: review documentation, documentation validation, check docs

## Mandatory Subagent Delegation

When a trigger category is detected, invoke `invokeSubAgent` with `name: "general-task-execution"` and a prompt containing:
1. The user's original request and any relevant context
2. Instruction to read both skill files before executing:
   - `.kiro/skills/markdown-writing/SKILL.md` (documentation standards, templates, code docs)
   - `.kiro/skills/mermaid-diagrams/SKILL.md` (diagram types, default theme rules, accessibility)

The subagent owns the full workflow. Do not duplicate, override, or handle any part of the documentation operation yourself.
