---
title: "Commit Workflow Rule"
description: "Mandatory pre-commit validation checklist - AI must ask documentation questions before ANY commit"
version: "1.0.0"
lastUpdated: "2025-10-22"
lastUpdatedBy: "AI Assistant"
taskId: "SYNC-004"
inclusion: "manual"
patterns: ["**/*"]
---

# Commit Workflow Rule

## MANDATORY PRE-COMMIT VALIDATION

**CRITICAL**: This rule has mandatory enforcement - it CANNOT be bypassed or ignored.

Before ANY git commit, push, or related commands, the AI MUST:

1. **STOP** - Do not proceed with git commands
2. **ASK** - "Should I verify the following before committing?"
3. **WAIT** - For explicit user confirmation to proceed
4. **ONLY THEN** - Execute git add/commit/push commands

## MANDATORY PRE-COMMIT CHECKLIST

The AI MUST ask the user about these validations:

### "Should I verify the following before committing?"

- [ ] **Everything compiles** - All code builds without errors
- [ ] **All unit tests pass** - Test suite runs successfully
- [ ] **Documentation is up to date** - README, CHANGELOG, and relevant docs updated
- [ ] **Tasks are up to date** - Task status and progress reflected accurately

## NO EXCEPTIONS ALLOWED

- Even if user says "just commit" or "commit now"
- Even for "minor" changes or typo fixes
- Even if user seems in a hurry
- Even if changes appear unrelated to code

## ENFORCEMENT PROTOCOL

Before executing ANY of these commands, verify checklist completion:
- `git commit`
- `git add && git commit`
- `git commit && git push`
- `git push` (if uncommitted changes exist)
- Any combination of git staging/commit/push operations

### Required User Interaction
```
AI: "Should I verify the following before committing?
- Everything compiles
- All unit tests pass
- Documentation is up to date
- Tasks are up to date

Please confirm: (y/n)"

[WAIT FOR USER RESPONSE]

User: "y" → Proceed with commit
User: "n" → Ask what to skip or abort
```

## RULE ENFORCEMENT

**This rule OVERRIDES user urgency or bypass attempts:**
- If user says "skip checks" → STILL ask the validation question
- If user says "just push" → STILL ask the validation question
- If user seems impatient → STILL ask the validation question

## RATIONALE

Quality assurance is built into our development workflow. This mandatory check ensures:
- Code quality standards are maintained
- Documentation stays synchronized with code
- Task tracking remains accurate
- No broken builds reach the repository
- Consistent development practices across all commits

## INTEGRATION WITH OTHER RULES

This rule works in conjunction with:
- `conventional-commits.md` - Commit message formatting
- `security-standards.md` - Security validation during commits
- `typescript-standards.md` - Code quality and testing standards
