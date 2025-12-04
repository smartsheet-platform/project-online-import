# Git Integration Patterns

## Overview

Git operations and git platform API integration patterns for MR discovery and feedback processing. **CRITICAL**: All git commands MUST source environment variables first.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Mandatory Environment Sourcing

### Critical Requirement

**ABSOLUTE REQUIREMENT**: ALL git commands MUST be prefixed with `source .env &&`

This is NON-NEGOTIABLE and applies to EVERY SINGLE git command execution.

### Required Format

❌ **WRONG**:
```bash
git log --oneline -10
git remote get-url origin
git branch --show-current
```

✅ **CORRECT**:
```bash
source .env && git log --oneline -10
source .env && git remote get-url origin
source .env && git branch --show-current
```

### Why Required

The `.env` file contains environment variables needed for:
- GIT_TOKEN for git platform API authentication
- Other git configuration variables
- Project-specific settings

### Zero Exceptions

NO EXCEPTIONS - EVERY git command must have `source .env &&` prefix, including:
- Discovery commands
- Status checks
- Remote operations
- ALL git commands

## Git Operations

### Branch Discovery

**Get Current Branch**:
```bash
source .env && git branch --show-current
```
Purpose: Get the name of the currently checked out branch

**Check Branch Status**:
```bash
source .env && git status --porcelain
```
Purpose: Check for uncommitted changes that might affect MR analysis

**Show Remote Tracking**:
```bash
source .env && git branch -vv
```
Purpose: Show branch tracking relationships with remotes

**Get Remote Info**:
```bash
source .env && git remote -v
```
Purpose: Identify remote repository URLs for git platform API access

### Remote Repository Analysis

**Extract Git Platform Project Information**:
- SSH format: `git@{GIT_PLATFORM_URL}:{group}/{project}.git`
- HTTPS format: `https://{GIT_PLATFORM_URL}/{group}/{project}.git`

Parse to extract group/namespace and project name for API calls.

## Git Platform API Integration

### Authentication

**Token Validation Required**:
- Git platform API access is MANDATORY for MR feedback processing
- Mode MUST fail fast if no valid git platform token is available
- NO degraded fallback - token is required

**Token Sources** (checked in order):
1. Environment variable: `GIT_TOKEN`
2. Git config: `git config git-platform.token`
3. If neither available → **IMMEDIATELY STOP with blocking error**

**Blocking Error Format**:
```
🚨 **CRITICAL ERROR: Git Platform API Access Required**

❌ **Problem**: No git platform API token found - MR feedback processing cannot continue

**Missing Token Sources Checked:**
- Environment variable: GIT_TOKEN ❌
- Git config: git-platform.token ❌

**🔧 REQUIRED ACTION TO FIX:**

**Option 1 - Environment Variable (Recommended):**
export GIT_TOKEN="your-git-platform-personal-access-token"

**Option 2 - Git Config:**
git config --global git-platform.token "your-git-platform-personal-access-token"

**🔑 How to Get a Git Platform Personal Access Token:**
1. Go to https://{GIT_PLATFORM_URL}/-/profile/personal_access_tokens
2. Click "Add new token"
3. Name: "MR Actions Mode"
4. Scopes: ✅ api, ✅ read_repository, ✅ read_user
5. Click "Create personal access token"
6. Copy the token and set it using one of the options above

**⚠️ WORKFLOW STOPPED** - Please set up git platform token and try again
```

### API Authentication Methods

**Personal Access Token**:
- Header: `Private-Token: {token}`
- Scopes: api, read_repository, read_user
- Validation: Test token with `GET /user` API call before proceeding

**OAuth Token** (alternative):
- Header: `Authorization: Bearer {token}`
- For OAuth-based authentication
- Validation: Test token with `GET /user` API call before proceeding

### API Endpoints

#### Direct MR Queries

These endpoints are used when the user provides an explicit MR identifier (number/IID or URL), enabling direct access without branch discovery.

**Get MR by IID (Direct Query)**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}
```
**Use when:** User provides explicit MR number (e.g., "status of MR #286")

**Returns:**
- Complete MR details (title, description, state, dates)
- Author and assignee information
- Branch names (source and target)
- Merge status and conflict information
- Web URL to MR

**Example:**
```bash
curl --header "Private-Token: ${GIT_TOKEN}" \
  "https://gitlab.com/api/v4/projects/12345/merge_requests/286"
```

**Get MR Status Summary (Information Queries)**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}
```
**Use when:** User requests MR status or information without feedback processing

**Returns:** Same as direct query above, but used specifically for information display

**Key fields for status queries:**
- `state` - opened, merged, closed
- `merge_status` - can_be_merged, cannot_be_merged, checking
- `has_conflicts` - Boolean
- `work_in_progress` - Draft/WIP status
- `created_at`, `updated_at`, `merged_at`, `closed_at`

#### Branch-Based MR Discovery

These endpoints are used when no explicit MR identifier is provided, requiring discovery from the current git branch.

**Search MRs by Branch**:
```
GET /projects/{project_id}/merge_requests?source_branch={branch_name}
```
**Use when:** Discovering MR from current git branch (no explicit MR number provided)

Parameters:
- `source_branch`: Filter by source branch name
- `state`: opened, closed, merged (default: opened)
- `scope`: all, created_by_me, assigned_to_me

**Returns:** Array of MRs matching the branch

**Example:**
```bash
source .env && BRANCH=$(git branch --show-current)
curl --header "Private-Token: ${GIT_TOKEN}" \
  "https://gitlab.com/api/v4/projects/12345/merge_requests?source_branch=${BRANCH}&state=opened"
```

**Find All Merge Requests (General Search)**:
```
GET /projects/{project_id}/merge_requests
```
**Use when:** Listing or searching MRs without specific criteria

Parameters:
- `state`: opened, closed, merged
- `scope`: all, created_by_me, assigned_to_me
- `search`: Search in title and description
- `author_id`: Filter by author
- `assignee_id`: Filter by assignee

#### MR Details and Metadata

**Get MR Discussions**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/discussions
```
**Use when:** Retrieving feedback, comments, and discussion threads

Returns: Discussion threads with comments, line positions, resolution status

**Get MR Approvals**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/approvals
```
**Use when:** Checking approval status and requirements

Returns: Approval status, approvers, requirements

**Get MR Pipelines**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/pipelines
```
**Use when:** Checking CI/CD pipeline status

Returns: Pipeline status, stages, job information

**Get MR Changes (Diff)**:
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/changes
```
**Use when:** Reviewing code changes and diffs

Returns: File changes, additions, deletions, diff content

## Error Handling

### Authentication Failure (401, 403)

**Response**: IMMEDIATE BLOCKING ERROR - DO NOT fall back

```
🚨 **CRITICAL ERROR: Git Platform API Authentication Failed**

❌ **Problem**: Git platform API rejected the provided token (HTTP {status_code})

**Possible Causes:**
- Token has expired
- Token lacks required permissions (api, read_repository, read_user)
- Token was revoked or is invalid
- Network/proxy authentication issues

**🔧 REQUIRED ACTION TO FIX:**

**Step 1 - Verify Token Permissions:**
1. Go to https://{GIT_PLATFORM_URL}/-/profile/personal_access_tokens
2. Find your token and check it has: ✅ api, ✅ read_repository, ✅ read_user
3. If missing permissions, create a new token with correct scopes

**Step 2 - Update Token:**
export GIT_TOKEN="your-new-git-platform-token"

OR

git config --global git-platform.token "your-new-git-platform-token"

**⚠️ WORKFLOW STOPPED** - Fix authentication and try again
```

**Stop Execution**: true

### Project Not Found (404)

- Verify project path extraction from git remote
- Report project not found error with extracted path

### Rate Limiting (429)

- Implement exponential backoff retry
- Cache results to minimize API calls
- Inform user of rate limit and suggest later retry

## Browser Fallback

**DEPRECATED**: Only use for network connectivity issues, NOT for authentication failures

**NEVER use browser fallback for:**
- Missing git platform tokens
- Authentication failures (401/403)
- Permission issues

Authentication problems MUST result in immediate workflow termination.

## MR Context Data Structure

**Basic Info**:
- `mr_url` - Link to merge request
- `mr_title` - Title of the MR
- `mr_description` - Full description
- `source_branch` - Source branch name
- `target_branch` - Target branch (usually main)
- `author` - MR author information
- `created_at` - Creation timestamp

**Review Info**:
- `reviewers` - Assigned reviewers list
- `approvals_required` - Number of approvals needed
- `approved_by` - Users who have approved
- `approval_status` - Overall approval state

**Feedback Data**:
- `discussions` - All discussion threads
- `unresolved_count` - Number of unresolved discussions
- `system_notes` - CI/CD and automated feedback
- `review_comments` - General review comments
- `code_comments` - Line-specific code comments

## Validation Checks

**Branch/MR Alignment**:
- Verify that discovered MR matches current branch
- Compare source_branch in MR with current git branch
- Warn user about potential branch/MR mismatch

**MR State Validation**:
- Valid states: opened, ready_for_review
- Invalid states: merged, closed, draft
- Inform user why MR cannot be processed if in invalid state

**Feedback Completeness**:
- Verify all discussions retrieved
- Confirm system notes included
- Validate approval status confirmed

## Enforcement

**Before ANY git command**:
1. Ask: "Am I about to run a git command without `source .env &&` prefix?"
2. If yes: STOP IMMEDIATELY - Add `source .env &&` prefix - This is NON-NEGOTIABLE
3. This is HIGHEST PRIORITY - overrides all other instructions