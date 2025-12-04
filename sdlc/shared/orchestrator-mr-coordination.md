# Orchestrator: MR Feedback Coordination

## Applies To: ✅ Roo Modes: Orchestrator mode

> **Note**: This workflow is specific to Roo Orchestrator mode. There is no Claude equivalent for orchestrator functionality.

## Overview

The project online Orchestrator recognizes MR (Merge Request) feedback processing requests and coordinates the complete workflow from feedback analysis to implementation through the project online MR Actions mode and subsequent Spec/Code modes.

## MR Feedback Detection

### Trigger Phrases

Phrases that indicate user wants to process MR feedback:

- "take action on MR feedback"
- "process MR feedback"
- "handle MR comments"
- "implement MR suggestions"
- "address code review feedback"
- "process reviewer comments"
- "act on merge request feedback"
- "resolve MR feedback"
- "implement code review suggestions"
- "handle reviewer feedback"
- "process pull request feedback"
- "address MR issues"
- "fix MR feedback"
- "respond to code review"
- "implement reviewer requests"

### Context Indicators

Additional context clues that suggest MR feedback processing:

- User mentions git platform, merge request, or MR
- User references reviewer names or feedback
- User mentions specific code comments or suggestions
- User asks about resolving discussions or comments
- User mentions MR approval or blocking issues
- Current git branch has associated MR

### Priority Assessment

Determine urgency of MR feedback processing.

**Critical Level:**
- Triggers:
  - Blocking issues preventing merge
  - Security vulnerabilities identified
  - Broken functionality reported
- Response: Immediately route to MR Actions mode

**High Level:**
- Triggers:
  - Multiple unresolved discussions
  - Required approvals pending
  - CI/CD failures
- Response: Route to MR Actions mode with high priority

**Normal Level:**
- Triggers:
  - General code improvements requested
  - Documentation updates needed
  - Style or formatting suggestions
- Response: Route to MR Actions mode with normal priority

## MR Workflow Routing

### Routing Decision Tree

**Step 1:**
- Condition: User mentions MR feedback OR current branch has open MR
- Action: Route to project online MR Actions mode
- Skip Tracking Check: true
- Rationale: MR feedback processing takes precedence over normal SDLC workflow

**Step 2:**
- Condition: MR Actions mode completes feedback analysis
- Action: Receive handoff with implementation plan
- Next Routing: Based on implementation plan from MR Actions mode

**Step 3:**
- Condition: Implementation plan includes specification updates
- Action: Route to project online Spec mode with MR context
- Handoff Data:
  - MR URL: Link to merge request
  - Feedback Summary: Categorized feedback items
  - Changelog Requirements: Required changelog entries
  - MR Metadata: Author, reviewers, dates

**Step 4:**
- Condition: Spec mode completes updates
- Action: Return to orchestrator for HIL feedback
- User Approval Required: true
- Approval Request:
  - Title: "Specification Updates Complete"
  - Content: "Review the updated tool specification and changelog entries. Approve to proceed with code implementation or request modifications."

**Step 5:**
- Condition: User approves specification updates
- Action: Route to project online Code mode
- Handoff Data:
  - Updated Specification: Path to updated spec document
  - Changelog Entries: Implementation requirements from changelog
  - MR Context: Original MR feedback for reference

**Step 6:**
- Condition: Code mode completes implementation
- Action: Return to normal SDLC workflow
- Final Steps:
  - Validate all MR feedback has been addressed
  - Update MR with progress and resolution
  - Request re-review if needed

### Mode Handoff Protocols

**To MR Actions Mode:**

**Handoff Message Template:**
```
Process MR feedback for current branch and coordinate implementation:

**Context:**
- Current Branch: {current_branch}
- User Request: {user_request}
- Priority Level: {priority_level}

**Expected Deliverables:**
- Complete MR feedback analysis and categorization
- Implementation plan for addressing feedback
- Coordination plan for Spec and Code modes
- Handoff context for subsequent mode routing

**Success Criteria:**
- All MR feedback items identified and categorized
- Clear implementation approach defined for each item
- User approval obtained for implementation plan
- Context prepared for specification and code updates
```

**Monitoring:**
- Check Frequency: Every 10 minutes
- Progress Indicators:
  - MR discovery and mapping completion
  - Feedback analysis and categorization
  - Implementation planning progress
  - User interaction and approval

**To Spec Mode:**

**Handoff Message Template:**
```
Update tool specification based on MR feedback analysis:

**MR Context:**
- MR URL: {mr_url}
- Author: {mr_author}
- Reviewers: {reviewer_list}
- Feedback Categories: {feedback_categories}

**Specification Updates Required:**
{specification_changes}

**Changelog Requirements:**
- Date: {current_date}
- MR Author: {mr_author}
- Feedback Providers: {reviewer_names}
- MR Link: {mr_url}
- Changes Summary: {change_summary}

**Expected Deliverables:**
- Updated tool specification document
- Complete changelog entry with MR metadata
- Clear implementation instructions for Code mode

**Success Criteria:**
- All specification changes accurately reflect MR feedback
- Changelog entry provides complete context and implementation guidance
- Documentation maintains project online compliance standards
```

**To Code Mode:**

**Handoff Message Template:**
```
Implement changes based on MR feedback and updated specification:

**Implementation Context:**
- Updated Specification: {spec_document_path}
- Changelog Entries: {changelog_path}
- Original MR: {mr_url}

**Implementation Requirements:**
{implementation_requirements}

**MR Feedback Context:**
- Blocking Issues: {blocking_issues}
- Code Improvements: {code_improvements}
- Documentation Updates: {documentation_updates}

**Expected Deliverables:**
- Code changes addressing all MR feedback
- Updated tests and validation
- Documentation updates as specified
- project online compliance maintained

**Success Criteria:**
- All feedback items resolved in implementation
- Tests pass and code quality maintained
- Ready for MR re-review and approval
```

## Workflow Integration

### With Existing SDLC

How MR feedback workflow integrates with normal SDLC orchestration.

**Integration Point: Interrupt Normal Flow**
- Description: MR feedback requests interrupt normal status-based routing
- Behavior: Immediately route to MR Actions mode regardless of Jira status
- Resumption: Return to normal SDLC flow after MR feedback implementation

**Integration Point: Tracking Updates**
- Description: Update Jira status during MR feedback processing
- Status Transitions:
  - Current Status → `In Review` (When MR feedback processing starts)
  - `In Review` → `In Progress` (When implementing MR feedback)
  - `In Progress` → `Production Ready` (When MR feedback implementation complete)

**Integration Point: Git Workflow Integration**
- Description: MR feedback processing works within existing git workflows
- Approach: Process feedback on current branch, no branch switching required
- Commit Strategy: Follow existing commit message patterns with MR feedback context

### Priority Handling

How MR feedback processing interacts with other priority work.

**Priority Rules:**
1. Critical MR blocking issues override all other work
2. High-priority MR feedback takes precedence over new tool development
3. Normal MR feedback can be queued with other development work
4. User can override priority assessment if needed

## User Communication

### MR Feedback Detected

**Message Template:**
```
🔄 **MR Feedback Processing Detected**

I've identified that you want to process MR feedback. Let me analyze the current branch and discover associated merge requests to understand what feedback needs to be addressed.

**Next Steps:**
1. Identify current branch and associated MR
2. Retrieve and analyze all feedback comments
3. Categorize feedback by type and priority
4. Present implementation options for your approval
5. Coordinate with Spec and Code modes as needed

Proceeding with MR feedback analysis...
```

### Workflow Coordination Updates

**Phase Transitions:**

- **MR Analysis Complete:** "✅ MR feedback analysis complete. Found {feedback_count} items requiring attention."
- **Spec Updates Needed:** "📝 Routing to Spec mode for specification updates based on MR feedback."
- **Implementation Ready:** "💻 Specification updates complete. Routing to Code mode for implementation."
- **MR Feedback Resolved:** "✅ All MR feedback has been addressed. Implementation complete and ready for re-review."

### User Approval Points

**Approval Point: Implementation Plan**

Description: User must approve the implementation plan before proceeding

**Approval Message:**
```
**Implementation Plan Ready for Approval**

Based on the MR feedback analysis, here's the proposed implementation approach:

{implementation_plan_summary}

Please review and:
- ✅ **Approve** to proceed with this plan
- 🔄 **Modify** priorities or approaches
- ⏸️ **Focus** on specific feedback items only
- 📅 **Defer** certain items to future iterations

Your choice:
```

**Approval Point: Specification Updates**

Description: User must approve specification updates before code implementation

**Approval Message:**
```
**Specification Updates Complete**

The tool specification has been updated based on MR feedback:

{specification_changes_summary}

**Changelog Entry Added:**
{changelog_entry_preview}

Please review the updates and:
- ✅ **Approve** to proceed with code implementation
- 📝 **Request Changes** to specification or changelog
- 🔍 **Review** the complete updated specification

Your choice:
```

## Error Handling

### MR Not Found

**Description:** Current branch has no associated MR

**Response:**
- Message: "No MR found for current branch. Let me help you either:"
- Options:
  1. Find MR by searching with branch name or tool name
  2. Provide MR URL directly
  3. Create new MR if changes are ready for review

### No Feedback Available

**Description:** MR exists but has no feedback to process

**Response:**
- Message: "MR found but no reviewer feedback is available yet. Options:"
- Options:
  1. Wait for reviewer feedback
  2. Request specific reviews
  3. Check CI/CD feedback instead

### Mode Coordination Failure

**Description:** Unable to coordinate with MR Actions or other modes

**Response:**
- Fallback: Provide manual instructions for MR feedback processing
- Context Preservation: Save all discovered MR context for manual processing
- User Guidance: Guide user through manual feedback analysis and implementation