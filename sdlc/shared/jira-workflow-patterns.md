# Jira Workflow Patterns

## Overview

Common Jira workflow patterns for task discovery, assignment, and description enhancement via MCP tools.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: Orchestrator-equivalent agents

## MCP Tools Available

### jira_search
**Purpose**: Search Jira issues using JQL
**Usage**: Query issues, filter by project, status, assignee

### jira_get_issue
**Purpose**: Get full details of a specific issue
**Usage**: Retrieve issue by key (e.g., JBS-123)

### jira_update_issue
**Purpose**: Update issue fields (assignee, status, description, Story Points)
**Usage**: Claim tasks, update fields, enhance descriptions

### jira_create_issue
**Purpose**: Create new Jira issues
**Usage**: Create tasks for new tool development

### jira_get_transitions
**Purpose**: Get available status transitions
**Usage**: Determine valid status changes

### jira_transition_issue
**Purpose**: Transition issue to new status
**Usage**: Update workflow status during development

## Pattern: Task Discovery

### Description
Query Jira via MCP tools for task status and assignment.

### Critical Note
`currentUser()` does NOT work in JQL queries in all environments. Always get user email first: `git config user.email`

### MCP Tool Usage

```json
{
  "tool": "jira_search",
  "jql": "project = \"BASE\" AND (assignee is EMPTY OR assignee = \"user@company.com\") AND status in (\"Open\", \"Backlog\", \"Selected for Development\")",
  "fields": "summary, description, status, assignee, priority, issuetype, created, updated"
}
```

**Substitutions Required**:
1. Replace `BASE` with actual project key from .env
2. Replace `user@company.com` with actual email from: `git config user.email`
3. Keep quotes around project key to handle reserved words

### Filtering Logic

1. Include tasks with empty assignee field (unassigned)
2. Include tasks where assignee matches current user
3. Exclude tasks assigned to other users
4. Filter by status categories: To Do → In Progress → Done

### Status Mapping

**Ready Statuses**:
- Backlog
- Open
- Selected for Development

**In Progress Statuses**:
- In Progress
- In Review
- BLOCKED

**Done Statuses**:
- Production Ready
- Closed

## Pattern: Task Assignment

### Description
Claim unassigned tasks to prevent conflicts.

### When to Use

- Task has empty assignee field
- About to start work on any task

### Critical Assignee Guidance

**Issue**: The `currentUser()` function works in JQL queries but NOT for assignments via `jira_update_issue`

**Solution**: Use `git config user.email` to get the user's email address

**Command**: `git config user.email`

**Rationale**: With Okta SSO, the user's email is consistent across all services including Jira. Git config provides reliable, local access to the user's email without needing MCP settings.

### Assignment Process

1. Use jira_search to find unassigned task
2. Check if task assignee field is null/empty
3. Execute: `git config user.email` to get user's email
4. Use jira_update_issue with the email from git config (not "currentUser()") to assign task

### MCP Tool Usage

```json
{
  "tool": "jira_update_issue",
  "issue_key": "JBS-123",
  "fields": {
    "assignee": "user@company.com"
  }
}
```

**Note**: Use email from `git config user.email`, NOT "currentUser()"

### Wrong vs. Correct

**❌ Wrong**:
```json
{"assignee": "currentUser()"}
```

**✅ Correct**:
1. Run: `git config user.email`
2. Output: `user@company.com`
3. Use: `{"assignee": "user@company.com"}`

## Pattern: Description Enhancement

### Description
Enhance task descriptions in-place before documentation generation.

### When to Use

- Task has basic description that needs enhancement
- Task status indicates ready for documentation phase
- Description appears brief or incomplete for comprehensive work
- Description is missing comprehensive specification sections

### When NOT to Use

- Description already contains all comprehensive specification elements
- Description includes functionality details, user workflow, API integrations, architecture, security, error handling, performance, and acceptance criteria
- **Only enhance if description lacks these comprehensive elements**

### Enhancement Process

1. Use jira_get_issue to extract current description
2. Apply enhancement template to create comprehensive specification
3. Use jira_update_issue to update description field with enhanced content
4. Use enhanced description for subsequent mode routing

### Enhancement Template

Create a comprehensive task specification based on this description:

**Original Description**: {current_description}

**Enhanced Specification Requirements**:
- Expand functionality details with specific use cases
- Define user workflow and interaction patterns
- Identify required API integrations and dependencies
- Specify architectural approach and design patterns
- Include authorization and security considerations
- Define error handling scenarios and edge cases
- Specify performance requirements and limitations
- Add acceptance criteria and success metrics

Generate a detailed, comprehensive specification that provides clear guidance for implementation.

### MCP Tool Usage

**Step 1 - Get Current Description**:
```json
{
  "tool": "jira_get_issue",
  "issue_key": "JBS-123"
}
```

**Step 2 - Update with Enhanced Description**:
```json
{
  "tool": "jira_update_issue",
  "issue_key": "JBS-123",
  "fields": {
    "description": "{enhanced_description_content}"
  }
}
```

## Pattern: Task Creation

### Description
Create new Jira tasks for feature or enhancement development.

### When to Use

- New feature or enhancement development identified
- Feature request needs tracking

### Creation Process

1. Define task summary (concise title)
2. Create comprehensive description
3. Set issue type (Task for features or enhancements, Story for user stories)
4. Set priority if known
5. Use jira_create_issue to create task

### MCP Tool Usage

```json
{
  "tool": "jira_create_issue",
  "project": "BASE",
  "issuetype": "Task",
  "summary": "Add user authentication feature",
  "description": "Comprehensive description of the feature...",
  "priority": "High"
}
```

**Note**: Replace `BASE` with actual project key from .env

## Quick Query Workflow

### Description
Streamlined workflow for "What's next?" type queries.

### Trigger Phrases

- "What's next?"
- "What should I work on?"
- "What task needs attention?"
- "Next task to work on?"
- "What's ready for implementation?"

### Strict Query Requirements

1. ONLY query the configured JIRA_PROJECT_KEY project
2. ONLY include tasks where assignee is EMPTY OR assignee = currentUser()
3. ONLY include status in ("Open", "Backlog", "Selected for Development")
4. DO NOT make additional queries with different filters
5. DO NOT try to be creative or find work outside these constraints

### Streamlined Steps

1. Get user email: `git config user.email`
2. Load project key: `source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"`
3. Query Jira ONCE with exact JQL: `project = "{KEY}" AND (assignee is EMPTY OR assignee = "{EMAIL}") AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC`
4. If results found, identify priority item and present to user
5. If no results, inform user - DO NOT make additional queries
6. If approved by user to start work:
   - Claim item (assign using the email from git config via jira_update_issue)
   - If Story: validate Story Points are set (prompt user if missing: 0, 1, 3, or 5)
   - Transition to "In Progress" status (using jira_get_transitions then jira_transition_issue)
   - Set up git branch: `personal/{git_user_name}/{KEY}-{sanitized-summary}`
   - Route to appropriate mode for work (spec/documentation or code)
   - MANDATORY: Route to Spec mode FIRST for specification creation
   - ONLY AFTER spec approved: Route to Code mode for implementation

### Example Execution

```bash
# 1. Get user email
git config user.email
# Output: user@company.com

# 2. Get project key
source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"
# Output: BASE

# 3. Search with substituted values (note quotes around project key)
{
  "tool": "jira_search",
  "jql": "project = \"BASE\" AND (assignee is EMPTY OR assignee = \"user@company.com\") AND status in (\"Open\", \"Backlog\", \"Selected for Development\") ORDER BY priority DESC, created ASC",
  "fields": "summary,status,priority,issuetype"
}
```