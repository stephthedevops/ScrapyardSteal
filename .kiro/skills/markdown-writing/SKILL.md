---
name: "markdown-writing"
description: "AI-first markdown documentation standards, templates, code documentation (JSDoc/docstrings), README/CHANGELOG maintenance rules, and pre-commit documentation validation."
---

# Markdown Writing Standards

This skill consolidates AI-first documentation principles, markdown templates, code documentation standards, and mandatory pre-commit documentation validation.

## 1. AI-First Documentation Principles

### Structured for AI Consumption
- Use consistent formatting patterns across all documents
- Include clear section headers with logical hierarchy
- Provide explicit instructions and requirements
- Use standardized templates for repeatable document types
- Include metadata via YAML frontmatter

### Junior Developer Friendly
- Clear, simple language — avoid jargon without explanation
- Step-by-step instructions with numbered lists
- Visual aids and diagrams where concepts are complex
- Practical examples showing both good and bad implementations

### Pattern References
Always explicitly reference known design/architecture patterns:
```markdown
> **Pattern:** [Observer Pattern](https://refactoring.guru/design-patterns/observer)
>
> This implementation uses the Observer Pattern to notify multiple components
> when the transaction status changes.
```

## 2. Standard Documentation Template

```markdown
# [Title]

## Overview
Brief description of what this document covers and why it's important.

## Prerequisites
- [ ] Requirement 1
- [ ] Requirement 2

## Instructions
Step-by-step instructions with clear requirements.

## Examples
Practical examples showing good and bad implementations.

## References
- [Official Documentation](link)
```

## 3. Markdown File Structure

All markdown files should include YAML frontmatter:

```markdown
---
title: "Document Title"
description: "Brief description for AI consumption"
author: "Author Name"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2"]
version: "1.0.0"
---
```

## 4. Code Documentation Standards

### JSDoc Comments (TypeScript/JavaScript)

```typescript
/**
 * Creates a new user in the system.
 *
 * @param userData - The user data to create (required)
 * @param options - Additional options for user creation (optional)
 * @returns Promise<User> - The created user object
 * @throws {ValidationError} When user data is invalid
 * @example
 * ```typescript
 * const user = await createUser({ name: 'Jane', email: 'jane@example.com' });
 * ```
 */
async function createUser(
  userData: CreateUserRequest,
  options?: CreateUserOptions
): Promise<User> {
  // Implementation
}
```

## 5. Comment Standards — Explain WHY, Not WHAT

```typescript
// GOOD: Explains the reasoning
// Sanitize input to prevent XSS attacks per OWASP A03:2021
const sanitizedInput = DOMPurify.sanitize(userInput);

// BAD: States the obvious
// Set the user name
user.name = userName;
```

## 6. README and CHANGELOG Maintenance

### MANDATORY PRE-COMMIT DOCUMENTATION CHECK

Before ANY git commit, the AI MUST:
1. **ASK** — "Do these changes impact information in the README.md?"
2. **ASK** — "Should CHANGELOG.md be updated to reflect these changes?"
3. **WAIT** — For explicit user confirmation
4. **ONLY THEN** — Proceed with git commands

### CHANGELOG Format

```markdown
# Changelog

## [Unreleased]

## [1.0.0] - YYYY-MM-DD
### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Security
- Vulnerability fixes
```

## 7. Size Optimization

1. Use concise language — eliminate filler words
2. Focus on essential information only
3. Link to external resources instead of duplicating content
4. Use hierarchical structure to enable selective reading
5. Use tables for structured comparisons instead of prose

## References

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [JSDoc Documentation](https://jsdoc.app/)
- [Technical Writing Guidelines](https://developers.google.com/tech-writing)
