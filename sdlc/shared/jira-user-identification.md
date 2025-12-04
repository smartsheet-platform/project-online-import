# Jira User Identification

## Overview

How to correctly identify the current user for Jira operations, especially for task assignment and filtering.

## Applies To

- ✅ Roo Modes: Orchestrator mode, Code mode
- ✅ Claude Agents: All agents that need user identification for Jira

## Critical Note

**The `currentUser()` function works in JQL queries but NOT when assigning issues via `jira_update_issue`.**

You must use the user's actual email address for assignments and certain field updates.

## Getting User Email

### Method: Git Config

Use `git config user.email` to get the user's email address.

**Command**: `git config user.email`

**Rationale**: With Okta SSO, the user's email is consistent across all services including Jira. Git config provides reliable access to the user's email without needing MCP settings.

### Example

```bash
git config user.email
```

**Output**: `user@company.com`

**Usage**: Use this email for Jira assignee field

## Usage Patterns

### For JQL Queries

**Option 1 - Using currentUser() (Preferred for queries)**:
```jql
project = "BASE" AND assignee = currentUser() AND status != Closed
```

**Option 2 - Using actual email**:
```bash
# Get email first
git config user.email
# Output: user@company.com

# Use in JQL
project = "BASE" AND assignee = "user@company.com" AND status != Closed
```

### For Issue Assignment

**❌ WRONG**:
```json
{"assignee": "currentUser()"}
```

**✅ CORRECT**:
```bash
# Step 1: Get email
git config user.email
# Output: user@company.com

# Step 2: Use actual email
{"assignee": "user@company.com"}
```

## Process for Task Assignment

1. Execute: `git config user.email`
2. Extract email from output
3. Use this email directly as the assignee value, NOT "currentUser()"

## Why This Matters

- Jira API expects actual user identifiers for field updates
- `currentUser()` is a JQL function, not a valid user identifier for assignments
- Git config provides the correct email that matches the user's Jira account (via SSO)

## Example Workflow

**Scenario**: Claiming an unassigned task

```bash
# 1. Get user email
git config user.email
# Output: user@company.com

# 2. Assign task using jira_update_issue
{
  "issue_key": "JBS-123",
  "fields": {
    "assignee": "user@company.com"
  }
}
```

**NOT**:
```json
{
  "issue_key": "JBS-123",
  "fields": {
    "assignee": "currentUser()"
  }
}
```