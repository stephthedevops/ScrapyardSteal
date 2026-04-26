---
title: "Automated Rule Versioning"
description: "Automatically increment versions and update timestamps when steering files are modified"
version: "2.0.0"
lastUpdated: "2026-02-05"
lastUpdatedBy: "AI Assistant"
taskId: "VERSION-001"
inclusion: "manual"
---

# Automated Rule Versioning

## When to Apply
This rule applies to ANY modification of existing rule files:
- Content changes (not just typo fixes)
- Frontmatter updates
- New sections or examples
- Structural changes
- New rule creation

## Version Increment Rules

### Patch Version (x.x.+1)
- Content clarifications and improvements
- New examples or code snippets
- Minor wording changes
- Bug fixes in examples
- Documentation updates

### Minor Version (x.+1.0)
- New sections or significant additions
- New functionality or capabilities
- Additional configuration options
- New platform support
- Expanded scope

### Major Version (+1.0.0)
- Breaking changes to rule structure
- Incompatible frontmatter changes
- Complete rule overhauls
- Removal of existing functionality
- Structural reorganization

## Auto-Update Process

When modifying any rule file, the AI MUST:

1. **Detect Changes**: Identify the type and scope of modifications
2. **Classify Impact**: Determine if change is patch/minor/major
3. **Increment Version**: Update version number appropriately
4. **Update Metadata**: 
   - Set lastUpdated to current CST date
   - Set lastUpdatedBy to modifier name
   - Add taskId if part of larger effort
5. **Commit Message**: Include version change in commit message

## Implementation Guidelines

### For AI Assistants
- **Always check** current version before making changes
- **Always increment** version after content modifications
- **Always update** lastUpdated timestamp
- **Never skip** version updates, even for minor changes

### Version Calculation Examples
```
Current: 1.2.3
Patch:   1.2.4 (content clarification)
Minor:   1.3.0 (new section added)
Major:   2.0.0 (breaking structural change)
```

## Manual Override
Use `/scripts/update-rule-versions.sh` for manual version control when needed:
```bash
# Increment patch version
./scripts/update-rule-versions.sh path/to/rule.md patch

# Increment minor version
./scripts/update-rule-versions.sh path/to/rule.md minor

# Increment major version
./scripts/update-rule-versions.sh path/to/rule.md major
```

## Quality Assurance
- **Accurate change classification** (patch/minor/major)
- **Proper timestamp updates** in CST timezone
- **Meaningful commit messages** with version information

This rule ensures all steering file modifications are properly tracked and versioned automatically.
