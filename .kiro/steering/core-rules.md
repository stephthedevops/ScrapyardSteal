---
title: "Core Rules"
description: "Fundamental rules that apply to all AI operations and development activities"
version: "1.0.0"
lastUpdated: "2025-10-22"
lastUpdatedBy: "AI Assistant"
taskId: "SYNC-006"
inclusion: "manual"
---

# Core Rules

## Time and Date Verification Rule

### MANDATORY: Always Check Internet Time for CST

**This Team operates in Central Standard Time (CST/CDT) timezone.**

Before using any date or time in documentation, commits, or timestamps, the AI MUST:

1. **Check current CST time from trusted internet sources**
2. **Use CST/CDT timezone for all timestamps**
3. **Verify accuracy against multiple sources when possible**

### Implementation Commands

```bash
# Primary method - WorldTimeAPI
curl -s "http://worldtimeapi.org/api/timezone/America/Chicago" | jq -r '.datetime' | cut -d'T' -f1

# Alternative method - TimeAPI
curl -s "https://timeapi.io/api/Time/current/zone?timeZone=America/Chicago" | jq -r '.date'

# Fallback - System date (less reliable for CST)
TZ='America/Chicago' date '+%Y-%m-%d'
```

### Scope Clarification

**This rule applies ONLY to documentation and metadata timestamps:**
- README.md "Last Updated" fields
- CHANGELOG.md entry dates
- Rule file metadata (lastUpdated fields)
- Commit message timestamps (for human readability)
- Project planning dates and milestones

**This rule does NOT apply to application code:**
- Database timestamp columns (use UTC)
- API request/response timestamps (use UTC)
- Application logs (use UTC with timezone info)
- System events and monitoring (use UTC)

**Best Practice**: Store all application data in UTC, convert to CST/user timezone only at presentation layer.

### When to Apply

- **Documentation updates** - README, CHANGELOG, rule files
- **Version control** - Commit timestamps, release dates
- **Persona metadata** - lastUpdated fields
- **Project planning** - Task dates, milestone planning
- **Documentation audit trails** - Rule updates, documentation compliance

### Error Handling

If internet time check fails:
1. **Notify user** of the failure
2. **Use system time** as fallback with CST conversion
3. **Note the limitation** in the timestamp
4. **Retry** on next operation

### Compliance

This rule ensures:
- **Timezone consistency** for distributed teams
- **Audit compliance** with proper time tracking
- **Documentation accuracy** with current dates
