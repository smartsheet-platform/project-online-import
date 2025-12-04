# MR Information Query Workflow

## Overview

Handles information and status queries for merge requests without entering feedback processing mode. This workflow provides quick access to MR details, status, and metadata for informational purposes.

**CRITICAL**: All MR data retrieval MUST follow the executable workflow defined in [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md). This document describes WHAT to retrieve; that document describes HOW to retrieve it.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## When to Use This Workflow

This workflow is triggered when:
- User requests MR status or information
- Request contains information query keywords (status, show, display, get, tell, info, details, check)
- No feedback processing keywords present
- User wants to view MR details without taking action

**Routed by:** [`mr-request-router.md`](./mr-request-router.md) Phase 0

## Workflow Steps

### Step 1: Identify Target MR

**Input:** MR identifier from request router (IID, URL, or branch-discovered)

**Actions:**
1. Validate MR identifier is available
2. If using IID: Prepare direct API query
3. If using URL: Parse and extract project/IID
4. If from branch: Use discovered MR information

**Output:** Validated MR identifier ready for API query

**Implementation:** See [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md) Step 1

### Step 2: Retrieve MR Information

**MANDATORY**: Execute actual GitLab API calls as defined in [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md) Steps 2-4.

**API Calls Required:**

**Primary MR Details:**
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}
```

**Executable Command:** See [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md) Step 3, Case A

**Response includes:**
- `id` - Internal MR ID
- `iid` - User-facing MR number
- `title` - MR title
- `description` - Full MR description
- `state` - opened, merged, closed
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `merged_at` - Merge timestamp (if merged)
- `closed_at` - Close timestamp (if closed)
- `author` - Author information
- `assignees` - Assigned users
- `reviewers` - Requested reviewers
- `source_branch` - Source branch name
- `target_branch` - Target branch name
- `work_in_progress` - Draft/WIP status
- `merge_status` - can_be_merged, cannot_be_merged, checking
- `has_conflicts` - Boolean conflict status
- `web_url` - Link to MR

**Approval Status:**
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/approvals
```

**Response includes:**
- `approved` - Boolean approval status
- `approvals_required` - Number of approvals needed
- `approvals_left` - Remaining approvals needed
- `approved_by` - List of users who approved
- `suggested_approvers` - Suggested reviewers

**Discussion Summary:**
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/discussions
```

**Response includes:**
- Discussion threads
- Resolved/unresolved status
- Comment count
- Participant list

**Pipeline Status:**
```
GET /projects/{project_id}/merge_requests/{merge_request_iid}/pipelines
```

**Response includes:**
- Latest pipeline status
- Pipeline stages
- Job statuses
- Failure information (if applicable)

### Step 3: Format and Present Information

**Presentation Format:**

```markdown
📋 **Merge Request #{iid}: {title}**

**Status:** {state_emoji} {state_text}
**Author:** {author_name} (@{author_username})
**Created:** {created_date} ({relative_time})
**Last Updated:** {updated_date} ({relative_time})

**Branches:**
- Source: `{source_branch}`
- Target: `{target_branch}`

**Merge Status:** {merge_status_emoji} {merge_status_text}
{conflicts_warning_if_present}

**Approvals:** {approval_emoji} {approved_count}/{required_count}
{list_of_approvers}

**Pipeline:** {pipeline_emoji} {pipeline_status}
{pipeline_details_if_failed}

**Discussions:** {discussion_emoji} {total_discussions} total ({unresolved_count} unresolved)

**Description:**
{formatted_description}

**🔗 View MR:** {web_url}
```

**Status Emojis:**
- ✅ Merged
- 🟢 Open
- ⏸️ Draft/WIP
- ❌ Closed
- 🔄 Checking merge status

**Merge Status Emojis:**
- ✅ Can be merged
- ⚠️ Has conflicts
- 🔄 Checking
- ❌ Cannot be merged

**Approval Emojis:**
- ✅ Fully approved
- ⏳ Pending approvals
- ❌ No approvals yet

**Pipeline Emojis:**
- ✅ Passed
- ❌ Failed
- 🔄 Running
- ⏸️ Pending
- ⏭️ Skipped

**Discussion Emojis:**
- ✅ All resolved
- ⚠️ Has unresolved discussions
- 💬 No discussions

### Step 4: Offer Next Actions

After presenting information, provide actionable next steps:

```markdown
**What would you like to do next?**

1. 🔄 **Process MR feedback** - Review and implement reviewer suggestions
2. 💬 **Show detailed discussions** - View all discussion threads and comments
3. 🔍 **Check another MR** - Query a different merge request
4. 📊 **View pipeline details** - See detailed CI/CD pipeline information
5. ✅ **Done** - Return to main workflow
```

## Information Display Variations

### For Open MRs

**Emphasis on:**
- Approval status and remaining approvals
- Unresolved discussions
- Pipeline status
- Merge conflicts (if any)
- Next actions for moving forward

### For Merged MRs

**Emphasis on:**
- Merge date and who merged
- Final approval status
- Deployment information (if available)
- Related issues/tickets closed

### For Closed MRs

**Emphasis on:**
- Close reason (if available)
- Who closed and when
- Whether it was merged or abandoned
- Related context

### For Draft/WIP MRs

**Emphasis on:**
- Draft status indicator
- Work in progress notice
- What's needed before ready for review
- Author's progress notes

## Error Handling

### MR Not Found (404)

**Response:**
```
❌ **MR Not Found**

I couldn't find MR #{iid} in this project.

**Possible reasons:**
- MR number is incorrect
- MR is in a different project
- You don't have access to this MR

**What to try:**
1. Verify the MR number
2. Check if you're in the correct project
3. Confirm you have access permissions
```

### Access Denied (403)

**Response:**
```
🔒 **Access Denied**

You don't have permission to view MR #{iid}.

**This could mean:**
- The MR is in a private project
- Your access token lacks required permissions
- The MR has restricted visibility

**To resolve:**
1. Verify your git platform token has 'read_repository' scope
2. Confirm you're a member of the project
3. Check with project maintainers about access
```

### API Rate Limit (429)

**Response:**
```
⏳ **Rate Limit Reached**

The git platform API rate limit has been exceeded.

**Please try again in a few minutes.**

Rate limits typically reset within 1-15 minutes depending on your API tier.
```

### Network/Connection Error

**Response:**
```
🌐 **Connection Error**

Unable to connect to git platform API.

**Possible causes:**
- Network connectivity issues
- Git platform service disruption
- Firewall/proxy blocking requests

**To resolve:**
1. Check your internet connection
2. Verify git platform is accessible
3. Check firewall/proxy settings
```

## Integration with Feedback Processing

If user decides to process feedback after viewing information:

**Transition Message:**
```
🔄 **Switching to Feedback Processing Mode**

I'll now retrieve and analyze the feedback for MR #{iid}.

This will include:
- All discussion threads and comments
- Reviewer suggestions and requests
- Blocking issues and required changes
- Item-by-item approval workflow

Proceeding with feedback analysis...
```

**Handoff to:** [`mr-interactive-workflow.md`](./mr-interactive-workflow.md)

**Context Preserved:**
- MR IID
- MR title and description
- Current state and status
- Approval information
- Discussion count

## Performance Optimization

### Caching Strategy

**Cache MR information for:**
- 5 minutes for open MRs (status may change)
- 1 hour for merged/closed MRs (static information)

**Cache Key Generation:**
```
cache_key = f"mr:{project_id}:{mr_iid}:{user_id}"
```
- Includes project ID to handle multiple projects
- Includes MR IID for unique identification
- Includes user ID to handle different user permissions
- Example: `mr:12345:286:user789`

**Cache invalidation triggers:**
- User explicitly requests refresh
- Transitioning to feedback processing
- MR state change detected
- Cache TTL expires

**Race Condition Handling:**
- Use atomic cache operations (get-or-set pattern)
- If cache miss during concurrent access, first request fetches and caches
- Subsequent requests wait briefly (100-200ms) then retry cache
- Maximum 3 retry attempts before fetching independently
- Prevents duplicate API calls for same MR from multiple users

**Implementation Note:**
Caching is optional and implementation-specific. The workflow should function correctly without caching, but caching improves performance and reduces API rate limit issues.

### Parallel API Calls

When retrieving MR information, execute these API calls in parallel:
1. MR details (primary)
2. Approval status
3. Discussion summary
4. Pipeline status

**Benefits:**
- Faster information retrieval
- Better user experience
- Reduced total wait time

**Error Handling for Parallel Calls:**
- If primary MR details fail: Stop and report error (cannot proceed without basic info)
- If secondary calls fail (approvals, discussions, pipeline): Display partial information with warnings
- Example partial display: "⚠️ Pipeline status unavailable - API error"
- Always show what data is available rather than failing completely
- Log failed API calls for debugging but don't block user workflow

### Minimal Data Retrieval

For information queries, retrieve only:
- Summary information (not full discussion content)
- Latest pipeline (not all pipelines)
- Discussion counts (not all comments)

**Full data retrieval only when:**
- User requests detailed discussions
- Transitioning to feedback processing
- User explicitly asks for complete information

## Best Practices

1. **Fast Response Time**: Information queries should complete in <3 seconds
2. **Clear Formatting**: Use emojis and structure for easy scanning
3. **Actionable Next Steps**: Always offer relevant follow-up actions
4. **Error Recovery**: Provide clear guidance when errors occur
5. **Context Preservation**: Maintain MR context for potential follow-up actions

## Examples

### Example 1: Open MR with Pending Approvals

**User Input:** "status of MR #286"

**Response:**
```markdown
📋 **Merge Request #286: Add user authentication feature**

**Status:** 🟢 Open
**Author:** Jane Developer (@jdeveloper)
**Created:** 2025-01-15 (11 days ago)
**Last Updated:** 2025-01-25 (1 day ago)

**Branches:**
- Source: `feature/user-auth`
- Target: `main`

**Merge Status:** ✅ Can be merged (no conflicts)

**Approvals:** ⏳ 1/2 approvals received
- ✅ John Reviewer (@jreviewer)
- ⏳ Pending: Sarah Lead (@slead)

**Pipeline:** ✅ Passed (all checks successful)

**Discussions:** ⚠️ 8 total (3 unresolved)

**Description:**
Implements JWT-based authentication system with:
- User login/logout endpoints
- Token refresh mechanism
- Password reset functionality
- Session management

**🔗 View MR:** https://gitlab.com/project/repo/-/merge_requests/286

---

**What would you like to do next?**

1. 🔄 **Process MR feedback** - Review and implement reviewer suggestions
2. 💬 **Show detailed discussions** - View all discussion threads and comments
3. 🔍 **Check another MR** - Query a different merge request
4. ✅ **Nothing** - Information query complete
```

### Example 2: Merged MR

**User Input:** "show me MR 250"

**Response:**
```markdown
📋 **Merge Request #250: Fix database connection pooling**

**Status:** ✅ Merged
**Author:** Bob Engineer (@bengineer)
**Created:** 2025-01-10 (16 days ago)
**Merged:** 2025-01-12 (14 days ago) by Alice Maintainer (@amaintainer)

**Branches:**
- Source: `fix/db-pooling`
- Target: `main`

**Approvals:** ✅ 2/2 approvals received
- ✅ Alice Maintainer (@amaintainer)
- ✅ Charlie Reviewer (@creviewer)

**Pipeline:** ✅ Passed

**Discussions:** ✅ 5 total (all resolved)

**Description:**
Fixes connection pool exhaustion issue by:
- Implementing proper connection lifecycle management
- Adding connection timeout configuration
- Improving error handling for pool exhaustion

**🔗 View MR:** https://gitlab.com/project/repo/-/merge_requests/250

---

**What would you like to do next?**

1. 🔍 **Check another MR** - Query a different merge request
2. 📊 **View deployment info** - See where this was deployed
3. ✅ **Nothing** - Information query complete
```

### Example 3: MR with Conflicts

**User Input:** "tell me about MR #305"

**Response:**
```markdown
📋 **Merge Request #305: Update API documentation**

**Status:** 🟢 Open
**Author:** David Writer (@dwriter)
**Created:** 2025-01-20 (6 days ago)
**Last Updated:** 2025-01-26 (today)

**Branches:**
- Source: `docs/api-update`
- Target: `main`

**Merge Status:** ⚠️ **Has merge conflicts**
⚠️ This MR has conflicts with the target branch that must be resolved before merging.

**Approvals:** ❌ 0/1 approvals (pending review)

**Pipeline:** ⏸️ Pending (waiting for conflicts to be resolved)

**Discussions:** 💬 2 total (0 unresolved)

**Description:**
Updates API documentation to reflect recent endpoint changes:
- New authentication endpoints
- Updated request/response examples
- Added error code reference

**🔗 View MR:** https://gitlab.com/project/repo/-/merge_requests/305

---

**⚠️ Action Required:** Resolve merge conflicts before this MR can proceed.

**What would you like to do next?**

1. 🔄 **Process MR feedback** - Review and implement reviewer suggestions
2. 🔧 **Get help resolving conflicts** - Guidance on conflict resolution
3. 🔍 **Check another MR** - Query a different merge request
4. ✅ **Nothing** - Information query complete