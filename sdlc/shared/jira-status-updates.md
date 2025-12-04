# Jira Automatic Status Updates

## Overview

Automatic Jira status update enforcement to ensure ticket status accurately reflects work progress throughout the development lifecycle. Status transitions happen automatically at key checkpoints.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: Orchestrator-equivalent agents

## Status Update Philosophy

1. Status updates should be automatic and transparent to the user
2. Status should always reflect the current state of work
3. Failed status updates should not block work progress
4. Status transitions should follow Jira workflow rules

## Automatic Update Checkpoints

### Checkpoint: Work Start

**Trigger**: When user selects or is assigned a task to work on (spec or code work)

**Current Status**: Open, Backlog, or Selected for Development

**Target Status**: In Progress

**Timing**: Immediately after task assignment/selection or when starting any work

#### Critical Validation: Story Points

**Condition**: If issue type is "Story"

**Requirement**: Story Points (customfield_10025) must be set

**Validation Workflow**:
1. Use jira_get_issue to check issue type and customfield_10025
2. If Story and Story Points is null/empty, prompt user
3. Present options: 0, 1, 3, or 5 Story Points
4. Update Story Points using jira_update_issue
5. Then proceed with status transition

**User Prompt**:
```
This is a Story and requires Story Points before moving to "In Progress".
Please select Story Points value:
- 0: Trivial/No effort
- 1: Very small task
- 3: Small to medium task
- 5: Medium to large task
```

#### Workflow Steps

1. Verify task is assigned to current user (use `git config user.email`)
2. Validate Story Points if issue type is "Story"
3. Check current status using jira_get_issue
4. If status is "Open", "Backlog", or "Selected for Development", transition to "In Progress"
5. Use jira_get_transitions to get available transitions
6. Use jira_transition_issue to execute the transition
7. Confirm transition success before proceeding

**User Communication**:
```
Starting work on {ISSUE_KEY}. Status updated to "In Progress".
```

### Checkpoint: Code Complete

**Trigger**: When code implementation is complete and ready for review

**Current Status**: In Progress

**Target Status**: In Review

**Timing**: After code changes are committed and pushed

#### Workflow Steps

1. Verify all code changes are committed
2. Verify branch is pushed to remote
3. **Create merge request** (see [MR Creation Workflow](mr-creation-workflow.md))
   - Extract JIRA key from branch name
   - Get issue details for MR title and description
   - Create MR using git platform API (GitLab/GitHub)
   - Link MR URL back to JIRA ticket
4. Check current status using jira_get_issue
5. If status is "In Progress", transition to "In Review"
6. Use jira_get_transitions and jira_transition_issue
7. Confirm transition success

**User Communication**:
```
✅ Code implementation complete for {ISSUE_KEY}

**Merge Request Created:**
- Title: [{ISSUE_KEY}] {Summary}
- URL: {MR_URL}
- Status updated to "In Review"

Awaiting code review.
```

**Note**: MR creation is now a mandatory step before status transition. See [mr-creation-workflow.md](mr-creation-workflow.md) for complete details on MR creation, error handling, and platform-specific configuration.

### Checkpoint: MR Feedback Processing

**Trigger**: When processing MR feedback and making changes

**Current Status**: In Review

**Target Status**: In Progress

**Timing**: When starting to address MR feedback

#### Workflow Steps

1. Detect that MR feedback requires code changes
2. Check current status using jira_get_issue
3. If status is "In Review", transition back to "In Progress"
4. Use jira_get_transitions and jira_transition_issue
5. Proceed with MR feedback implementation

**User Communication**:
```
Processing MR feedback for {ISSUE_KEY}. Status updated to "In Progress" while addressing reviewer comments.
```

### Checkpoint: MR Feedback Complete

**Trigger**: When MR feedback has been addressed and changes are ready for re-review

**Current Status**: In Progress

**Target Status**: In Review

**Timing**: After MR feedback changes are committed and pushed

#### Workflow Steps

1. Verify all MR feedback items have been addressed
2. Verify changes are committed and pushed
3. Check current status using jira_get_issue
4. If status is "In Progress", transition to "In Review"
5. Use jira_get_transitions and jira_transition_issue
6. Notify user that issue is ready for re-review

**User Communication**:
```
MR feedback addressed for {ISSUE_KEY}. Status updated to "In Review" for re-review.
```

## Status Transition Matrix

Valid status transitions and when they occur automatically:

| From | To | Trigger | Automatic | Prerequisite |
|------|----|---------|-----------| ------------|
| Open | In Progress | Task selection or any work start | Yes | Story Points for Stories |
| Backlog | In Progress | Task selection or any work start | Yes | Story Points for Stories |
| Selected for Development | In Progress | Any work start (legacy tickets) | Yes | Story Points for Stories |
| In Progress | In Review | Code complete or MR feedback addressed | Yes | None |
| In Review | In Progress | MR feedback requires changes | Yes | None |
| In Review | Production Ready | Manual - requires approval | No | N/A |
| Production Ready | Closed | Manual - after production verification | No | N/A |

## Implementation Details

### Jira Issue Key Detection

**Method 1 (Priority 1)**: Git branch name
- **Pattern**: `personal/{git_user_name}/{JIRA-KEY}-{description}`
- **Command**: `git branch --show-current`
- **Extraction**: Extract JIRA-KEY from branch name

**Method 2 (Priority 2)**: User message or task context
- **Pattern**: Jira issue key format (e.g., JBS-1, PROJ-123)
- **Extraction**: Parse issue key from context

**Method 3 (Priority 3)**: Orchestrator context
- **Pattern**: Issue key passed from previous mode or workflow
- **Extraction**: Use provided issue key directly

### User Email Retrieval

**Critical Note**: Always use `git config user.email` to get the user's email address. The `currentUser()` function works in JQL queries but NOT for assignments or field updates.

**Command**: `git config user.email`

**Usage**: Use the email address for all Jira assignee field updates

**Example**:
```bash
git config user.email
# Output: user@company.com

# Use in Jira update
{"assignee": "user@company.com"}
```

### MCP Tool Sequence

Standard sequence for status updates:

**Step 1**: Use jira_get_issue
- **Purpose**: Get current issue status and details
- **Arguments**: `issue_key`, `fields: status,issuetype,customfield_10025`

**Step 2**: Use jira_get_transitions
- **Purpose**: Get available status transitions
- **Arguments**: `issue_key`

**Step 3**: Use jira_transition_issue
- **Purpose**: Execute the status transition
- **Arguments**: `issue_key`, `transition_id` (from get_transitions response)

### Story Points Handling

**Requirement**: Stories must have Story Points before transitioning to "In Progress"

**Field ID**: customfield_10025

**Validation Workflow**:
1. Check if issue type is "Story"
2. If Story, check if customfield_10025 has a value
3. If null or empty, prompt user for Story Points
4. Update using jira_update_issue before status transition

**Valid Values**: 0, 1, 3, 5

**Update Example**:
```json
{
  "tool": "jira_update_issue",
  "issue_key": "JBS-123",
  "fields": {
    "customfield_10025": 3
  }
}
```

## Error Handling

**Principle**: Status update failures should not block work progress

### Scenario: Transition Not Available

**Detection**: Requested transition is not in available transitions list

**Response**:
- Log the issue but continue with work
- Message: "Note: Could not transition {ISSUE_KEY} to {TARGET_STATUS}. Current status: {CURRENT_STATUS}. Continuing with work."
- User may need to manually update status in Jira

### Scenario: MCP Tool Failure

**Detection**: MCP tool returns error or times out

**Response**:
- Log the error and continue with work
- Message: "Note: Could not update Jira status due to API error. Continuing with work. Please verify status manually."
- Do not retry automatically - continue with work

### Scenario: Permission Error

**Detection**: User lacks permission to transition issue

**Response**:
- Inform user and continue with work
- Message: "Note: You may not have permission to update {ISSUE_KEY} status. Please ask a project admin to update it to {TARGET_STATUS}."
- User should contact project administrator

### Scenario: Story Points Missing

**Detection**: Story requires Story Points but user doesn't provide value

**Response**:
- Block transition until Story Points are set
- Message: "Story Points are required for Stories before transitioning to 'In Progress'. Please select a value: 0, 1, 3, or 5."
- **Blocking**: Yes - this is a hard requirement

### Scenario: No Issue Key Detected

**Detection**: Cannot detect Jira issue key from context

**Response**:
- Continue with work without status updates
- Message: "No Jira issue detected. Proceeding with work without status tracking."
- Note: Not all work is tracked in Jira

## User Communication Guidelines

### Principles

1. Status updates should be transparent but not intrusive
2. Always inform user when status is updated
3. Explain why status updates failed if they do
4. Don't overwhelm user with technical Jira details

### Message Templates

**Successful Transition**:
```
✅ Updated {ISSUE_KEY} status: {OLD_STATUS} → {NEW_STATUS}
```

**Already Correct Status**:
```
ℹ️ {ISSUE_KEY} is already in "{CURRENT_STATUS}" status. Continuing with work.
```

**Transition Failed**:
```
⚠️ Could not update {ISSUE_KEY} status to "{TARGET_STATUS}". Current status: {CURRENT_STATUS}. Continuing with work.
```

**Story Points Required**:
```
📊 This Story requires Story Points before moving to "In Progress". Please select: 0, 1, 3, or 5.
```

## Integration with Modes

### Orchestrator Responsibility

- Orchestrator mode is responsible for all automatic status updates
- Status updates happen before routing to other modes
- Other modes receive tasks with correct status already set

### Spec Mode Integration

- Spec mode receives tasks in "Selected for Development" status
- Status was updated by Orchestrator before routing
- Spec mode does not update status - focuses on documentation

### Code Mode Integration

- Code mode receives tasks in "In Progress" status
- Status was updated by Orchestrator before routing
- Code mode verifies status but does not update it
- **Fallback**: If status is not "In Progress", Code mode can update it as fallback

### MR Actions Mode Integration

- MR Actions mode coordinates status updates during feedback processing
- Workflow:
  1. MR Actions detects feedback requires changes
  2. Orchestrator transitions status: "In Review" → "In Progress"
  3. Work proceeds on addressing feedback
  4. When complete, Orchestrator transitions: "In Progress" → "In Review"

## Best Practices

1. **Update Status Before Work Begins**: Always update status before routing to specialized modes
2. **Validate Prerequisites**: Check and enforce prerequisites like Story Points before transitions
3. **Fail Gracefully**: Never block work due to status update failures
4. **Communicate Clearly**: Always inform user of status changes and any issues
5. **Use Correct User Identity**: Always use `git config user.email` for user identification