---
title: "Git Operations Trigger"
description: "Lightweight router that detects git-related requests and delegates to the Git Operations Agent"
version: "1.1.0"
lastUpdated: "2026-02-28"
lastUpdatedBy: "AI Assistant"
inclusion: "always"
patterns: ["**/*"]
---

# Git Operations Trigger

When the user's request matches any of these categories, you MUST delegate via subagent. Do NOT handle git operations inline.

## Trigger Categories

- **Commit**: commit, commit message, amend, staged changes, conventional commit
- **Push/Pull**: push, pull, fetch, remote, upstream, origin
- **Merge Request**: merge request, MR, code review, MR description, MR approval
- **Branch Management**: branch, checkout, switch, merge, delete branch, create branch
- **Rebase/Cherry-pick**: rebase, cherry-pick, interactive rebase, squash
- **Pipeline**: pipeline, CI/CD, job status, pipeline debug, build status
- **Tag/Release**: tag, release, version tag, annotated tag
- **glab CLI**: glab, glab mr, glab pipeline, glab issue, glab auth

## Mandatory Subagent Delegation

When a trigger category is detected, invoke `invokeSubAgent` with `name: "general-task-execution"` and a prompt containing:
1. The user's original request and any relevant context (current branch, staged files, diff summary)
2. Instruction to first read `.kiro/skills/git-commit-standards/SKILL.md` (commits, pre-commit validation, CI skip)
3. Instruction to read `.kiro/skills/glab-cli-operations/SKILL.md` (glab CLI, MR workflows, pipelines) if applicable

The subagent owns the full workflow. Do not duplicate, override, or handle any part of the git operation yourself.
