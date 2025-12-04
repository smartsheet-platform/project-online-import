# Jira Git Integration

## Overview

Git workflow integration for Jira-tracked work, including branch naming conventions and git commands.

## Applies To

- ✅ Roo Modes: Orchestrator mode, Code mode, Spec mode
- ✅ Claude Agents: All agents that create git branches for Jira work

## Branch Naming Convention

### Pattern

```
personal/{git_user_name}/{JIRA-KEY}-{sanitized-summary}
```

### Sanitization Rules

1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove special characters except hyphens
4. Remove consecutive hyphens
5. Limit to reasonable length (50 chars for summary part)

### Examples

| Input | Output |
|-------|--------|
| `JBS-001 Task Alert System` | `personal/ejacobsen/JBS-001-task-alert-system` |
| `JBS-015 Build Filter & Analysis` | `personal/ejacobsen/JBS-015-build-filter-analysis` |
| `PROJ-123 Add User Authentication` | `personal/bkurakula/PROJ-123-add-user-authentication` |

## Git Command Reference

### Fetch Updates
```bash
git fetch origin
```

### Update Main Branch
```bash
git checkout main && git pull origin main
```

### Create Feature Branch
```bash
git checkout -b personal/{git_user_name}/{JIRA-KEY}-{sanitized-summary}
```

### Stage Changes
```bash
git add .
```

### Commit Work
```bash
git commit -m "[{JIRA-KEY}] {Summary}: {description}"
```

**Commit Message Format**:
- Start with Jira issue key in brackets: `[JBS-123]`
- Follow with brief summary
- Optionally add description after colon

**Examples**:
- `[JBS-001] Add task alert system`
- `[JBS-015] Build filter and analysis: implement filtering logic`

### Push Branch
```bash
git push origin personal/{git_user_name}/{branch-name}
```

### Push with Upstream Tracking
```bash
git push -u origin personal/{git_user_name}/{branch-name}
```

## Extracting Jira Key from Branch

### Pattern Matching

Given branch: `personal/ejacobsen/JBS-123-add-feature`

**Extraction**:
1. Get current branch: `git branch --show-current`
2. Parse branch name using pattern: `personal/{user}/{KEY}-{desc}`
3. Extract KEY portion: `JBS-123`

### Regular Expression

```regex
^personal/[^/]+/([A-Z]+-\d+)-
```

**Capture Group 1**: The Jira issue key

## Git User Name

### Getting Git User Name

```bash
git config user.name
```

**Output**: Full name like "Erik Jacobsen-Watts" or configured username

### Sanitizing for Branch Name

1. Convert to lowercase
2. Replace spaces with hyphens or remove them
3. Use first initial + last name pattern (optional)

**Examples**:
- "Erik Jacobsen-Watts" → `ejacobsen-watts` or `ejacobsen`
- "Bala Kurakula" → `bkurakula`

## Workflow Integration

### Starting Work on Jira Issue

1. Get Jira issue key (e.g., `JBS-123`)
2. Get issue summary from Jira
3. Sanitize summary for branch name
4. Get git user name: `git config user.name`
5. Sanitize user name
6. Create branch: `git checkout -b personal/{sanitized-user}/{KEY}-{sanitized-summary}`

### Example Complete Workflow

```bash
# Issue: JBS-123 "Add User Authentication Feature"
# User: Erik Jacobsen-Watts

# 1. Fetch latest
git fetch origin

# 2. Update main
git checkout main && git pull origin main

# 3. Create feature branch
git checkout -b personal/ejacobsen/JBS-123-add-user-authentication-feature

# 4. Make changes...
# ...

# 5. Commit
git add .
git commit -m "[JBS-123] Add user authentication: implement OAuth2 flow"

# 6. Push
git push -u origin personal/ejacobsen/JBS-123-add-user-authentication-feature
```

## Best Practices

1. **Always create branches from updated main**: Ensures you're working from latest code
2. **Use descriptive but concise branch names**: Make it easy to identify the work
3. **Include Jira key in commits**: Enables automatic linking in Jira
4. **Use personal/ prefix**: Clearly identifies personal work branches vs. shared branches
5. **Sanitize properly**: Avoid special characters that cause git issues