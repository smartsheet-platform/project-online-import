# Jira JQL Query Patterns

## Overview

Common JQL query patterns for Jira searches via MCP tools, with correct substitution requirements.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: All agents that query Jira

## Critical Substitution Note

**ALL JQL queries require TWO substitutions**:

1. **$JIRA_PROJECT_KEY** → actual project key from: `source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"`
   - **IMPORTANT**: Keep quotes around project key to handle reserved words like SHARE, AND, OR, NOT

2. **currentUser()** or **$USER_EMAIL** → actual email from: `git config user.email`
   - `currentUser()` does NOT work in all environments - always use actual email address

## Common Query Patterns

### Unassigned Ready Tasks

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND assignee is EMPTY AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC
```

**Purpose**: Find unassigned work ready to start

**Substitution Required**: Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)

**Example After Substitution**:
```jql
project = "BASE" AND assignee is EMPTY AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC
```

### My Active Work

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND assignee = "$USER_EMAIL" AND status in ("In Progress", "In Review") ORDER BY updated DESC
```

**Purpose**: Find user's current work items

**Substitution Required**:
- Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)
- Replace `$USER_EMAIL` with actual email from: `git config user.email`

**Example After Substitution**:
```bash
# Get email
git config user.email
# Output: user@company.com

# Final JQL
project = "BASE" AND assignee = "user@company.com" AND status in ("In Progress", "In Review") ORDER BY updated DESC
```

### Ready for Implementation

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND status = "Selected for Development" AND (assignee is EMPTY OR assignee = "$USER_EMAIL") ORDER BY priority DESC
```

**Purpose**: Find prioritized work ready to implement

**Substitution Required**:
- Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)
- Replace `$USER_EMAIL` with actual email from: `git config user.email`

**Example After Substitution**:
```jql
project = "BASE" AND status = "Selected for Development" AND (assignee is EMPTY OR assignee = "user@company.com") ORDER BY priority DESC
```

### All My Work

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND assignee = "$USER_EMAIL" AND status != "Closed" ORDER BY status ASC, priority DESC
```

**Purpose**: All non-closed work assigned to user

**Substitution Required**:
- Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)
- Replace `$USER_EMAIL` with actual email from: `git config user.email`

**Example After Substitution**:
```jql
project = "BASE" AND assignee = "user@company.com" AND status != "Closed" ORDER BY status ASC, priority DESC
```

### In Review

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND status = "In Review" AND type = Task ORDER BY updated ASC
```

**Purpose**: Find all tasks currently in review

**Substitution Required**: Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)

**Example After Substitution**:
```jql
project = "BASE" AND status = "In Review" AND type = Task ORDER BY updated ASC
```

### Blocked Items

**JQL Template**:
```jql
project = "$JIRA_PROJECT_KEY" AND status = "BLOCKED" AND assignee = "$USER_EMAIL"
```

**Purpose**: Find user's blocked work items

**Substitution Required**:
- Replace `$JIRA_PROJECT_KEY` with actual value from .env (keep quotes to handle reserved words)
- Replace `$USER_EMAIL` with actual email from: `git config user.email`

**Example After Substitution**:
```jql
project = "BASE" AND status = "BLOCKED" AND assignee = "user@company.com"
```

## Complete Substitution Example

### Template
```jql
project = "$JIRA_PROJECT_KEY" AND (assignee is EMPTY OR assignee = "$USER_EMAIL") AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC
```

### Step-by-Step Substitution

**Step 1**: Get user email
```bash
git config user.email
```
**Output**: `user@company.com`
**Extracted email**: `user@company.com`

**Step 2**: Get project key
```bash
source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"
```
**Output**: `BASE`
**Extracted project key**: `BASE`

**Step 3**: Create final JQL with BOTH substitutions
```jql
project = "BASE" AND (assignee is EMPTY OR assignee = "user@company.com") AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC
```

**Step 4**: Send the final JQL with BOTH substitutions to the MCP tool. Project key is quoted to handle reserved words like SHARE.

## JQL Syntax Reference

### Status Filters

- Single status: `status = "In Progress"`
- Multiple statuses: `status in ("Open", "Backlog", "In Progress")`
- Not a status: `status != "Closed"`
- Not in statuses: `status not in ("Closed", "Production Ready")`

### Assignee Filters

- Specific user: `assignee = "user@company.com"`
- Current user (JQL only): `assignee = currentUser()`
- Unassigned: `assignee is EMPTY`
- Anyone or empty: `(assignee is EMPTY OR assignee = "user@company.com")`

### Project Filters

- Single project: `project = "BASE"` (always use quotes)
- Multiple projects: `project in ("BASE", "PROJ")`

### Type Filters

- Specific type: `type = Task`
- Multiple types: `type in (Task, Story, Bug)`

### Ordering

- By priority: `ORDER BY priority DESC`
- By created date: `ORDER BY created ASC`
- By updated date: `ORDER BY updated DESC`
- Multiple fields: `ORDER BY priority DESC, created ASC`

## Reserved Words in JQL

**Critical**: Always quote project keys to handle reserved JQL words.

**Reserved words**: SHARE, AND, OR, NOT, EMPTY, NULL, ORDER, BY

**Example**: If your project key is "SHARE", you MUST use quotes:
```jql
project = "SHARE" AND status = "Open"
```

Not:
```jql
project = SHARE AND status = "Open"  ❌ Will fail
```