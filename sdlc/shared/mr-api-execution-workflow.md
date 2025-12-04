# MR API Execution Workflow

## Overview

**CRITICAL**: This document provides EXPLICIT, STEP-BY-STEP instructions for executing GitLab API calls to retrieve MR information. This is the MANDATORY workflow - NO git command-line fallbacks are permitted.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Mandatory Execution Pattern

### RULE: API-First, No CLI Fallbacks

**YOU MUST:**
1. ✅ Use GitLab API calls via curl or HTTP requests
2. ✅ Execute actual API calls, not simulate them
3. ✅ Parse API responses to extract MR data

**YOU MUST NOT:**
1. ❌ Use `git log` to find MR information
2. ❌ Use `git branch` to discover MR details
3. ❌ Fall back to git CLI when API calls are available
4. ❌ Assume MR data without making API calls

### Why This Matters

Git CLI commands (`git log`, `git branch`) do NOT contain:
- MR discussions and reviewer comments
- MR approval status
- MR pipeline status
- MR metadata (title, description, assignees)
- MR state (open, merged, closed)

**Only GitLab API provides complete MR information.**

## Step-by-Step Execution Workflow

### Step 1: Extract MR Identifier from User Request

**Input:** User request (e.g., "Review MR #286")

**Action:** Parse request to extract MR identifier

**Patterns to Match:**
```python
import re

def extract_mr_identifier(user_input):
    """Extract MR identifier from user input."""
    
    # Pattern 1: Explicit MR number (#286, MR #286, MR 286, !286)
    mr_number_match = re.search(r'(?:MR\s*#?|#|!)(\d+)', user_input, re.IGNORECASE)
    if mr_number_match:
        return {
            'type': 'iid',
            'value': int(mr_number_match.group(1))
        }
    
    # Pattern 2: MR URL
    url_match = re.search(r'https?://[^\s]+/merge_requests/(\d+)', user_input)
    if url_match:
        return {
            'type': 'url',
            'value': url_match.group(0),
            'iid': int(url_match.group(1))
        }
    
    # Pattern 3: No explicit identifier - use branch discovery
    return {
        'type': 'branch_discovery'
    }
```

**Example Outputs:**
- Input: "Review MR #286" → `{'type': 'iid', 'value': 286}`
- Input: "status of MR 286" → `{'type': 'iid', 'value': 286}`
- Input: "https://gitlab.com/group/project/-/merge_requests/286" → `{'type': 'url', 'value': '...', 'iid': 286}`
- Input: "review current MR" → `{'type': 'branch_discovery'}`

### Step 2: Load Environment Variables

**CRITICAL:** Environment variables contain GitLab API credentials and configuration.

**Action:** Source the `.env` file to load variables

**Command:**
```bash
source .env
```

**Required Variables:**
- `GIT_TOKEN` - GitLab personal access token
- `GITLAB_API_URL` - GitLab API base URL (e.g., `https://gitlab.com/api/v4`)
- `GITLAB_PROJECT_ID` - Project ID (numeric, e.g., `15090`)

**Validation:**
```bash
# Verify variables are loaded
if [ -z "$GIT_TOKEN" ]; then
    echo "ERROR: GIT_TOKEN not set"
    exit 1
fi

if [ -z "$GITLAB_API_URL" ]; then
    echo "ERROR: GITLAB_API_URL not set"
    exit 1
fi

if [ -z "$GITLAB_PROJECT_ID" ]; then
    echo "ERROR: GITLAB_PROJECT_ID not set"
    exit 1
fi
```

### Step 3: Execute GitLab API Call

**CRITICAL:** This is where you MUST make the actual API call.

#### Case A: Explicit MR IID (Most Common)

**When:** User provided MR number (e.g., "Review MR #286")

**API Endpoint:**
```
GET {GITLAB_API_URL}/projects/{GITLAB_PROJECT_ID}/merge_requests/{IID}
```

**Executable Command:**
```bash
# Source environment variables
source .env

# Extract IID from user input (example: 286)
MR_IID=286

# Execute API call
curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}"
```

**Real Example for MR #286:**
```bash
source .env

curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "https://git.lab.smartsheet.com/api/v4/projects/15090/merge_requests/286"
```

**Expected Response (JSON):**
```json
{
  "id": 123456,
  "iid": 286,
  "title": "Add new feature",
  "description": "This MR adds...",
  "state": "opened",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "author": {
    "id": 789,
    "username": "developer",
    "name": "Developer Name"
  },
  "source_branch": "feature/new-feature",
  "target_branch": "main",
  "merge_status": "can_be_merged",
  "has_conflicts": false,
  "web_url": "https://git.lab.smartsheet.com/team-comms-integrations/notification-integrations/service-notification-integrations/-/merge_requests/286"
}
```

#### Case B: Branch Discovery (No Explicit MR)

**When:** User didn't provide MR number (e.g., "review current MR")

**Step B1: Get Current Branch**
```bash
source .env
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"
```

**Step B2: Search for MR by Branch**
```bash
source .env

curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests?source_branch=${CURRENT_BRANCH}&state=opened"
```

**Expected Response (JSON Array):**
```json
[
  {
    "id": 123456,
    "iid": 286,
    "title": "Add new feature",
    "source_branch": "feature/new-feature",
    "state": "opened",
    ...
  }
]
```

**Step B3: Extract MR IID from Response**
```bash
# Parse JSON response to get first MR's IID
MR_IID=$(echo "${RESPONSE}" | jq -r '.[0].iid')

if [ "$MR_IID" = "null" ] || [ -z "$MR_IID" ]; then
    echo "ERROR: No open MR found for branch ${CURRENT_BRANCH}"
    exit 1
fi

echo "Found MR #${MR_IID} for branch ${CURRENT_BRANCH}"
```

### Step 4: Retrieve Additional MR Data

**After getting basic MR info, retrieve additional details:**

#### Get MR Discussions (Comments/Feedback)

**API Endpoint:**
```
GET {GITLAB_API_URL}/projects/{GITLAB_PROJECT_ID}/merge_requests/{IID}/discussions
```

**Command:**
```bash
source .env

curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}/discussions"
```

**Response Contains:**
- Discussion threads
- Reviewer comments
- Code review feedback
- Resolved/unresolved status

#### Get MR Approvals

**API Endpoint:**
```
GET {GITLAB_API_URL}/projects/{GITLAB_PROJECT_ID}/merge_requests/{IID}/approvals
```

**Command:**
```bash
source .env

curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}/approvals"
```

**Response Contains:**
- Approval status (approved/not approved)
- Number of approvals required
- List of approvers
- Remaining approvals needed

#### Get MR Changes (Diff)

**API Endpoint:**
```
GET {GITLAB_API_URL}/projects/{GITLAB_PROJECT_ID}/merge_requests/{IID}/changes
```

**Command:**
```bash
source .env

curl --silent --show-error \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}/changes"
```

**Response Contains:**
- File changes
- Diff content
- Additions/deletions
- Modified files list

### Step 5: Parse and Present Results

**Action:** Parse JSON responses and format for user

**Example Parsing (using jq):**
```bash
# Extract key fields from MR response
TITLE=$(echo "${MR_DATA}" | jq -r '.title')
STATE=$(echo "${MR_DATA}" | jq -r '.state')
AUTHOR=$(echo "${MR_DATA}" | jq -r '.author.name')
SOURCE_BRANCH=$(echo "${MR_DATA}" | jq -r '.source_branch')
TARGET_BRANCH=$(echo "${MR_DATA}" | jq -r '.target_branch')
WEB_URL=$(echo "${MR_DATA}" | jq -r '.web_url')

# Present to user
echo "📋 Merge Request #${MR_IID}: ${TITLE}"
echo "Status: ${STATE}"
echo "Author: ${AUTHOR}"
echo "Branches: ${SOURCE_BRANCH} → ${TARGET_BRANCH}"
echo "URL: ${WEB_URL}"
```

## Complete Executable Example

**Scenario:** User says "Review MR #286"

**Complete Script:**
```bash
#!/bin/bash
set -e  # Exit on error

# Step 1: Extract MR IID
MR_IID=286
echo "Processing MR #${MR_IID}..."

# Step 2: Load environment variables
source .env

# Step 3: Validate required variables
if [ -z "$GIT_TOKEN" ] || [ -z "$GITLAB_API_URL" ] || [ -z "$GITLAB_PROJECT_ID" ]; then
    echo "ERROR: Required environment variables not set"
    echo "Please ensure .env contains: GIT_TOKEN, GITLAB_API_URL, GITLAB_PROJECT_ID"
    exit 1
fi

# Step 4: Get MR details
echo "Fetching MR details from GitLab API..."
MR_DATA=$(curl --silent --show-error --fail \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}")

# Step 5: Get MR discussions
echo "Fetching MR discussions..."
DISCUSSIONS=$(curl --silent --show-error --fail \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}/discussions")

# Step 6: Get MR approvals
echo "Fetching MR approvals..."
APPROVALS=$(curl --silent --show-error --fail \
  --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/${MR_IID}/approvals")

# Step 7: Parse and display results
TITLE=$(echo "${MR_DATA}" | jq -r '.title')
STATE=$(echo "${MR_DATA}" | jq -r '.state')
AUTHOR=$(echo "${MR_DATA}" | jq -r '.author.name')
SOURCE_BRANCH=$(echo "${MR_DATA}" | jq -r '.source_branch')
TARGET_BRANCH=$(echo "${MR_DATA}" | jq -r '.target_branch')
WEB_URL=$(echo "${MR_DATA}" | jq -r '.web_url')

echo ""
echo "📋 Merge Request #${MR_IID}: ${TITLE}"
echo "Status: ${STATE}"
echo "Author: ${AUTHOR}"
echo "Branches: ${SOURCE_BRANCH} → ${TARGET_BRANCH}"
echo "URL: ${WEB_URL}"
echo ""
echo "✅ MR data successfully retrieved from GitLab API"
```

## Error Handling

### Error: MR Not Found (404)

**API Response:**
```json
{
  "message": "404 Not Found"
}
```

**Action:**
```
❌ MR #286 not found

Possible reasons:
- MR number is incorrect
- MR is in a different project
- You don't have access to this MR

Please verify the MR number and try again.
```

### Error: Authentication Failed (401)

**API Response:**
```json
{
  "message": "401 Unauthorized"
}
```

**Action:**
```
🚨 CRITICAL ERROR: GitLab API Authentication Failed

Your GIT_TOKEN is invalid or expired.

To fix:
1. Go to https://git.lab.smartsheet.com/-/profile/personal_access_tokens
2. Create a new token with scopes: api, read_repository, read_user
3. Update .env file: GIT_TOKEN="your-new-token"
4. Try again
```

### Error: No Environment Variables

**Detection:**
```bash
if [ -z "$GIT_TOKEN" ]; then
    echo "ERROR: GIT_TOKEN not set in .env"
    exit 1
fi
```

**Action:**
```
🚨 CRITICAL ERROR: Environment Variables Not Loaded

The .env file was not sourced or is missing required variables.

Required variables:
- GIT_TOKEN
- GITLAB_API_URL
- GITLAB_PROJECT_ID

Please ensure .env exists and contains these variables.
```

## Verification Checklist

Before completing MR Actions workflow, verify:

- [ ] ✅ Executed actual GitLab API call (curl command)
- [ ] ✅ Received JSON response from GitLab
- [ ] ✅ Parsed MR data from API response
- [ ] ✅ Did NOT use `git log` or `git branch` for MR data
- [ ] ✅ Presented MR information to user
- [ ] ✅ Handled errors appropriately

## Common Mistakes to Avoid

### ❌ WRONG: Using git commands for MR data
```bash
# This is WRONG - git log doesn't contain MR information
git log --oneline -10
```

### ✅ CORRECT: Using GitLab API
```bash
# This is CORRECT - GitLab API provides MR information
source .env
curl --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/286"
```

### ❌ WRONG: Assuming MR exists without checking
```bash
# This is WRONG - no API call made
echo "MR #286 is open"
```

### ✅ CORRECT: Verifying MR exists via API
```bash
# This is CORRECT - API call verifies MR exists
source .env
RESPONSE=$(curl --silent --header "PRIVATE-TOKEN: ${GIT_TOKEN}" \
  "${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/merge_requests/286")

if echo "$RESPONSE" | grep -q "404 Not Found"; then
    echo "ERROR: MR #286 not found"
    exit 1
fi
```

## Integration with Other Workflows

This workflow is referenced by:
- [`mr-request-router.md`](./mr-request-router.md) - Routes requests to this workflow
- [`mr-information-workflow.md`](./mr-information-workflow.md) - Uses this for data retrieval
- [`mr-interactive-workflow.md`](./mr-interactive-workflow.md) - Uses this for feedback processing

**All MR workflows MUST use this API execution pattern.**