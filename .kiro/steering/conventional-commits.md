---
title: "Conventional Commit Standards"
description: "Commit message formatting standards following the Conventional Commits specification"
version: "1.0.0"
lastUpdated: "2025-10-22"
lastUpdatedBy: "AI Assistant"
taskId: "SYNC-005"
inclusion: "manual"
patterns: ["**/*"]
---

# Conventional Commit Standards

All commit messages MUST follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

## Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Required Elements

### Type (Required)
Must be one of the following types:
- `feat:` - New features (correlates with MINOR in SemVer)
- `fix:` - Bug fixes (correlates with PATCH in SemVer)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring (no functional changes)
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependencies, etc.
- `ci:` - CI/CD changes
- `build:` - Build system changes

### Description (Required)
- Short, concise summary of changes
- Use imperative mood ("add" not "added")
- No period at the end
- Maximum 72 characters

## Optional Elements

### Scope (Optional)
- Provides additional context about the section of codebase
- Enclosed in parentheses: `feat(parser):`
- Examples: `feat(auth):`, `fix(api):`, `docs(readme):`

### Body (Optional)
- Detailed explanation of changes
- Separate from description by blank line
- Use imperative mood
- Explain what and why, not how

### Footer (Optional)
- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authored: `Co-authored-by: Name <email>`

## Breaking Changes

### Method 1: Footer
```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

### Method 2: Type/Scope with `!`
```
feat!: send an email to the customer when a product is shipped
```

## Examples

### Feature with scope
```
feat(auth): add OAuth2 authentication support
```

### Bug fix
```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.
```

### Documentation update
```
docs: correct spelling of CHANGELOG
```

### Breaking change
```
feat(api)!: send an email to the customer when a product is shipped

BREAKING CHANGE: API now requires email parameter in all requests
```

## Validation Rules

1. **Type must be lowercase** and one of the standard types
2. **Description must be imperative** ("add feature" not "added feature")
3. **No period at end** of description
4. **Maximum 72 characters** for description
5. **Body separated by blank line** from description
6. **Breaking changes** must use `!` or `BREAKING CHANGE:` footer
7. **Scope must be lowercase** and descriptive

## Common Mistakes to Avoid

- ❌ `Added new feature` → ✅ `feat: add new feature`
- ❌ `fix: bug in login.` → ✅ `fix: resolve login authentication issue`
- ❌ `FEAT: add user management` → ✅ `feat: add user management`
- ❌ `fix: something` → ✅ `fix(auth): resolve authentication token validation`
