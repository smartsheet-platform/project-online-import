# Jira Project Key Workflow

## Critical Rule

**ALWAYS CHECK .env FILE FOR JIRA_PROJECT_KEY FIRST. ONLY ASK USER IF NOT FOUND.**

## Overview

This defines the MANDATORY workflow for obtaining the Jira project key. This rule takes precedence over ALL other Jira workflow instructions.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: All agents that need Jira project key

## Mandatory Workflow

### Step 1: Check .env File

**Action**: When user asks about Jira tickets or "what's next"

**Requirement**: IMMEDIATELY check .env file for JIRA_PROJECT_KEY

**Command**: `source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"`

**Note**: The .env file is the source of truth for project configuration

### Step 2: Use Value from .env

**If JIRA_PROJECT_KEY found in .env:**
- Use that value directly in all JQL queries
- Do NOT ask user - trust the .env configuration
- Always quote the project key in JQL to handle reserved words like SHARE, AND, OR, NOT

### Step 3: Prompt User if Not Found

**If JIRA_PROJECT_KEY NOT found in .env or .env doesn't exist:**
- Use ask_followup_question to prompt user
- Question format: "What is your Jira project key?"
- Provide suggestions:
  - Common examples like "PROJ", "DEV", "TEAM"
  - Explain where to find it (Jira project URL or settings)

### Step 4: Store Context

**After receiving project key from user (if .env was missing):**
- Use the provided value in all JQL queries
- Store in context for subsequent queries in same session
- Recommend user add JIRA_PROJECT_KEY to their .env file

## Correct Example

**User Request**: "What's my next open Jira ticket?"

**Correct Response**:
1. Check .env file for JIRA_PROJECT_KEY:
   ```bash
   source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"
   ```
2. If found (e.g., "BASE"), use it directly in JQL query with quotes:
   ```jql
   project = "BASE" AND assignee = currentUser() AND status != Closed
   ```
3. Project key is quoted to handle reserved words like SHARE, AND, OR, NOT

## Incorrect Examples

### ❌ Wrong: Asking user without checking .env first
```
Question: What is your Jira project key?
```
**Why wrong**: Violates "check .env first" rule - wastes user's time when config exists

### ❌ Wrong: Using value from .env.sample instead of .env
```jql
project = "JBS" AND ...
```
**Why wrong**: .env.sample is a template - must use actual .env file

### ❌ Wrong: Skipping .env check entirely
**Reasoning**: "I'll just ask the user to be safe"

**Why wrong**: Must check .env first - it's the source of truth for configuration

## Enforcement Rules

1. **CRITICAL**: Before ANY Jira query, you MUST check .env file for JIRA_PROJECT_KEY first
2. **CRITICAL**: Only ask user for project key if .env file doesn't exist or doesn't contain JIRA_PROJECT_KEY
3. **CRITICAL**: This rule overrides any instructions in other workflow files that suggest asking the user before checking environment variables
4. **CRITICAL**: Always quote the project key in JQL queries to handle reserved words

## Environment Variable Loading

### Critical Requirement

BEFORE constructing any JQL query, load JIRA_PROJECT_KEY from .env and substitute the actual value into the JQL string. Shell variables like $JIRA_PROJECT_KEY will NOT work in MCP tool arguments.

### Workflow Steps

1. **Execute ONCE**: `source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"`
   - On success: Extract the value from output (e.g., "JBS") and proceed to step 2
   - On failure: .env doesn't exist or isn't configured - stop and inform user
   - **CRITICAL**: If command succeeds and outputs a value, DO NOT verify or check again

2. **Substitute**: Replace placeholder with actual value in JQL with quotes: `project = "JBS" AND ...`
   - Use the actual value from step 1, not $JIRA_PROJECT_KEY
   - Always quote the project key to handle reserved words like SHARE

3. **Execute**: Pass complete JQL string to jira_search MCP tool

### Example with Substitution

**Command**: `source "$(pwd)/.env" && echo "${JIRA_PROJECT_KEY}"`

**Output**: `JBS`

**Action**: Value extracted successfully - proceed immediately to construct JQL

**Final JQL**: `project = "JBS" AND (assignee is EMPTY OR assignee = currentUser()) AND status in ("Open", "Backlog", "Selected for Development") ORDER BY priority DESC, created ASC`

**Note**: DO NOT check if .env exists, DO NOT read .env - the command already worked. Project key is quoted to handle reserved words.

## Session Context

Once user provides project key in a session, you may reuse it for subsequent Jira queries in the SAME conversation session.

**Note**: If starting a new conversation or task, check .env again - do not assume the same project key applies.