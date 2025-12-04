# Merge Request Creation Workflow

## Overview

Automates merge request (MR) creation when code implementation is complete and JIRA ticket transitions to "In Review" status. This workflow ensures every completed feature has a proper MR for code review.

## Applies To

- ✅ Roo Modes: Orchestrator mode, Code mode
- ✅ Claude Agents: Orchestrator-equivalent agents, code agent

## Integration Point

This workflow integrates with the "Code Complete" checkpoint in the JIRA status update workflow:

**Checkpoint: Code Complete** (from [`jira-status-updates.md`](jira-status-updates.md:69-91))
- **Trigger**: When code implementation is complete and ready for review
- **Current Status**: In Progress → **Target Status**: In Review
- **Timing**: After code changes are committed and pushed
- **NEW**: Create merge request before status transition

## MR Creation Workflow

### Prerequisites

Before creating an MR, verify:

1. ✅ All code changes are committed
2. ✅ Branch is pushed to remote
3. ✅ Branch follows naming convention: `personal/{git_user_name}/{JIRA-KEY}-{sanitized-summary}`
4. ✅ GitLab token is configured (GIT_TOKEN in .env)

### Workflow Steps

**Step 1: Verify Git State**
```bash
# Check for uncommitted changes
git status

# Verify branch is pushed
git branch -vv
```

**Step 2: Extract MR Metadata**
```bash
# Get current branch
BRANCH=$(git branch --show-current)

# Extract JIRA key from branch name
# Pattern: personal/{user}/{KEY}-{description}
JIRA_KEY=$(echo "$BRANCH" | grep -oP 'personal/[^/]+/\K[A-Z]+-\d+')

# Get JIRA issue details for MR title and description
# Use jira_get_issue MCP tool
```

**Step 3: Construct MR Details**

**MR Title Format**:
```
[{JIRA-KEY}] {Issue Summary}
```

**MR Description Template**:
```markdown
## JIRA Ticket
{JIRA_URL}/{JIRA-KEY}

## Summary
{Brief description from JIRA issue}

## Changes
{Auto-generated from commit messages or specification}

## Testing
{Testing approach from specification or implementation notes}

## Checklist
- [ ] Code follows project standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented if present)
```

**Step 4: Create Merge Request**

```bash
# Load environment variables
source "$(pwd)/.env"

# Create MR using GitLab API
curl --request POST \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{
    "source_branch": "'"${BRANCH}"'",
    "target_branch": "main",
    "title": "['"${JIRA_KEY}"'] '"${ISSUE_SUMMARY}"'",
    "description": "'"${MR_DESCRIPTION}"'",
    "remove_source_branch": true
  }' \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests"
```

**Step 5: Link MR to JIRA**

After MR creation, add MR URL to JIRA ticket:

```json
{
  "tool": "jira_update_issue",
  "issue_key": "{JIRA-KEY}",
  "fields": {
    "comment": {
      "body": "Merge Request created: {MR_URL}"
    }
  }
}
```

**Step 6: Transition JIRA Status**

Only after successful MR creation, transition status:

```json
{
  "tool": "jira_transition_issue",
  "issue_key": "{JIRA-KEY}",
  "transition_id": "{IN_REVIEW_TRANSITION_ID}"
}
```

### Enhanced Code Complete Checkpoint

The complete "Code Complete" checkpoint now includes:

1. Verify all code changes are committed
2. Verify branch is pushed to remote
3. **NEW**: Create merge request with proper metadata
4. **NEW**: Link MR URL to JIRA ticket
5. Check current status using jira_get_issue
6. If status is "In Progress", transition to "In Review"
7. Use jira_get_transitions and jira_transition_issue
8. Confirm transition success

## Environment Variables Required

Add to `.env` file:

```bash
GIT_TOKEN=your_gitlab_personal_access_token
GITLAB_API_URL=https://git.lab.smartsheet.com/api/v4
GITLAB_PROJECT_ID=your_project_id
```

## Token Setup Instructions

### GitLab Personal Access Token

1. Navigate to https://git.lab.smartsheet.com/-/profile/personal_access_tokens
2. Click "Add new token"
3. Name: "SDLC MR Integration"
4. Select scopes:
   - `api` (full API access)
   - `read_repository` (read repository data)
   - `write_repository` (push code, create MRs)
5. Click "Create personal access token"
6. Copy token and add to `.env` as `GIT_TOKEN`

## Error Handling

### Scenario: MR Already Exists

**Detection**: API returns error indicating MR already exists for branch

**Response**:
- Retrieve existing MR URL
- Update JIRA ticket with existing MR URL
- Proceed with status transition
- Message: "Merge request already exists: {MR_URL}. Proceeding with status update."

### Scenario: GitLab Token Missing

**Detection**: GIT_TOKEN not found in environment

**Response**:
- Block MR creation (this is required)
- Provide token setup instructions
- Message: "GitLab token required to create merge request. Please configure GIT_TOKEN in .env file. See token setup instructions at https://git.lab.smartsheet.com/-/profile/personal_access_tokens"
- **Blocking**: Yes - MR creation is mandatory for "In Review" transition

### Scenario: API Request Fails

**Detection**: API returns error (network, permissions, etc.)

**Response**:
- Log error details
- Provide manual MR creation instructions
- Message: "Failed to create merge request automatically. Please create manually: {MANUAL_INSTRUCTIONS}. Error: {ERROR_DETAILS}"
- **Blocking**: No - allow status transition but inform user

### Scenario: Branch Not Pushed

**Detection**: Local branch has no remote tracking or is ahead of remote

**Response**:
- Push branch automatically: `git push -u origin {BRANCH}`
- Retry MR creation
- If push fails, block and request user action

## User Communication

### Successful MR Creation

```
✅ Merge request created successfully!

**MR Details:**
- Title: [{JIRA-KEY}] {Summary}
- URL: {MR_URL}
- Source: {BRANCH}
- Target: main

**Next Steps:**
- JIRA ticket {JIRA-KEY} status updated to "In Review"
- MR link added to JIRA ticket
- Awaiting code review
```

### MR Creation Failed

```
⚠️ Could not create merge request automatically.

**Error:** {ERROR_MESSAGE}

**Manual Steps:**
1. Visit: https://git.lab.smartsheet.com
2. Navigate to your project
3. Create new merge request:
   - Source branch: {BRANCH}
   - Target branch: main
   - Title: [{JIRA-KEY}] {Summary}
4. Add MR URL to JIRA ticket {JIRA-KEY}

JIRA status updated to "In Review" - please create MR manually.
```

## Integration with Existing Workflows

### With JIRA Status Updates

This workflow enhances the existing "Code Complete" checkpoint in [`jira-status-updates.md`](jira-status-updates.md:69-91):

**Before** (existing):
1. Verify commits
2. Verify push
3. Transition to "In Review"

**After** (enhanced):
1. Verify commits
2. Verify push
3. **Create MR** ← NEW
4. **Link MR to JIRA** ← NEW
5. Transition to "In Review"

### With Git Integration

This workflow uses branch naming from [`jira-git-integration.md`](jira-git-integration.md:12-35):
- Branch pattern: `personal/{git_user_name}/{JIRA-KEY}-{sanitized-summary}`
- Commit format: `[{JIRA-KEY}] {Summary}: {description}`

### With MR Feedback Processing

Once MR is created, the MR feedback workflow in [`orchestrator-mr-coordination.md`](orchestrator-mr-coordination.md) handles:
- Processing reviewer comments
- Implementing feedback
- Re-requesting review

## Best Practices

1. **Always Create MR Before Status Transition**: Ensures reviewers have access to code immediately
2. **Include JIRA Link in MR**: Provides context for reviewers
3. **Use Descriptive MR Titles**: Include JIRA key and clear summary
4. **Auto-Delete Source Branch**: Keep repository clean after merge
5. **Link MR Back to JIRA**: Enables tracking from both systems

## GitLab Features

- Supports draft MRs (prefix title with "Draft:" or "WIP:")
- Can assign reviewers via API
- Supports MR templates in repository
- Auto-closes MR when source branch is deleted
- Smartsheet GitLab instance: https://git.lab.smartsheet.com

## Validation Checklist

Before considering MR creation complete:

- [ ] MR created successfully with valid URL
- [ ] MR title includes JIRA key
- [ ] MR description includes JIRA link
- [ ] Source branch is correct
- [ ] Target branch is correct (usually main)
- [ ] MR URL added to JIRA ticket
- [ ] JIRA status transitioned to "In Review"
- [ ] User notified of MR creation

## Future Enhancements

Potential improvements to this workflow:

1. **Auto-assign reviewers** based on code ownership or team configuration
2. **Add labels/tags** to MR based on JIRA issue type or priority
3. **Link to CI/CD pipeline** results in MR description
4. **Include test coverage** metrics in MR description
5. **Auto-create draft MR** earlier in development for early feedback