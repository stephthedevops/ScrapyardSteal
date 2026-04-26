---
name: "git-commit-standards"
description: "Conventional commit formatting, mandatory pre-commit validation checklist, and CI skip optimization. Covers commit types, scopes, breaking changes, pre-commit verification workflow, and [ci skip] directives for pipeline efficiency."
---

# Git Commit Standards

This skill consolidates all commit-related standards: conventional commit formatting, mandatory pre-commit validation, and CI skip optimization for pipeline efficiency.

## 1. Conventional Commits

All commit messages MUST follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

### Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat:` - New features (MINOR in SemVer)
- `fix:` - Bug fixes (PATCH in SemVer)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, semicolons, etc.)
- `refactor:` - Code refactoring (no functional changes)
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependencies, etc.
- `ci:` - CI/CD changes
- `build:` - Build system changes

### Description Rules
- Use imperative mood ("add" not "added")
- No period at the end
- Maximum 72 characters
- Scope must be lowercase

### Breaking Changes
```
feat!: send an email to the customer when a product is shipped
```
or
```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

## 2. Pre-Commit Validation

### MANDATORY — Cannot Be Bypassed

Before ANY git commit, push, or related commands, the AI MUST:

1. **STOP** - Do not proceed with git commands
2. **ASK** - "Should I verify the following before committing?"
3. **WAIT** - For explicit user confirmation
4. **ONLY THEN** - Execute git operations

### Checklist
- [ ] Everything compiles
- [ ] All unit tests pass
- [ ] Documentation is up to date
- [ ] Tasks are up to date

This applies even if the user says "just commit" or "skip checks."

## 3. CI Skip Optimization

### When to Use `[ci skip]`
- Documentation-only changes (*.md, *.txt, *.rst)
- Comment-only changes in code
- License files, .gitignore updates
- IDE configuration files (.vscode/, .idea/)

### When NOT to Use `[ci skip]`
- Any code changes (*.ts, *.js, *.java, *.py, etc.)
- Build configuration changes (package.json, Dockerfile, etc.)
- CI/CD pipeline changes
- Dependency updates (package-lock.json, yarn.lock)
- Configuration affecting runtime
- Security-related changes

### Format
```
docs: update API documentation [ci skip]
```

Both `[ci skip]` and `[skip ci]` are acceptable. Be conservative — when in doubt, don't skip CI.
