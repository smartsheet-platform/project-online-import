# MR Interactive Workflow

## Overview

MANDATORY INTERACTIVE APPROVAL: This workflow enforces individual approval for each MR feedback item rather than batch approval. Every feedback item must be presented individually with full context, and the user must explicitly approve or skip each item before any implementation occurs.

**CRITICAL**: All MR data retrieval MUST follow the executable workflow defined in [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md). This document describes the feedback processing workflow; that document describes how to retrieve MR data via API.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Workflow Override

This workflow COMPLETELY REPLACES batch approval approaches. When processing MR feedback, you MUST follow this interactive item-by-item approach instead of presenting all feedback items at once for bulk approval.

## Mandatory Behavior

- **NEVER** implement multiple feedback items without individual approval
- **NEVER** present bulk approval options
- **ALWAYS** process feedback items one at a time
- **ALWAYS** implement approved changes immediately after approval
- **ALWAYS** continue until all feedback items are processed or user terminates

## Workflow Phases

### Phase 1: MR Discovery and Categorization

Use MR discovery workflow to find the MR and analyze all feedback, preparing for individual item presentation.

**Steps**:
1. Execute MR discovery following [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md)
2. Retrieve all feedback using GitLab API (discussions endpoint)
3. Categorize each feedback item with full context
4. Prepare individual presentation format for each item

**API Execution:** Follow [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md) Steps 1-4 to retrieve MR data and discussions.

### Phase 2: Individual Item Processing

Present each feedback item with complete context and require explicit user approval before implementing any changes. Continue until all items are processed.

**Item Presentation Format**:

```
📋 **Feedback Item {item_number} of {total_items}**

**Location:** {file_path}:{line_number} (if applicable)
**Category:** {category} (Blocking Issue | Code Improvement | Documentation | Suggestion)
**Priority:** {priority_level} (Cdphaseritical | High | Medium | Low)

**Reviewer Comment:**
"{original_feedback_text}"
- {reviewer_name}

**Proposed Implementation:**
{detailed_implementation_approach}

**Impact:**
{scope_of_changes} | {affected_files} | {estimated_complexity}
```

**Approval Request**:

Present with options:
- Yes, implement this fix
- No, skip this item
- Show me the current content first
- Move to next feedback item

**Response Handling**:

- **If approved**: Implement the fix immediately, confirm completion before proceeding to next item
- **If skipped**: Mark item as skipped and continue to next
- **If show content**: Display current file content for relevant section, re-present the same approval question
- **If move to next**: Skip current item and proceed to next without implementing

**Loop Continuation**:

Continue until:
- All feedback items processed (approved, skipped, or deferred), OR
- User explicitly requests to stop, OR
- Critical error prevents continuation

### Phase 3: Session Completion

Provide comprehensive summary of all actions taken and items processed.

**Completion Summary Format**:

```
🎉 **Interactive MR Feedback Processing Complete**

**Processing Statistics:**
- **Total Items:** {total_feedback_items}
- **Implemented:** {implemented_count}
- **Skipped:** {skipped_count}
- **Deferred:** {deferred_count}

**Files Modified:**
{list_of_modified_files}

**Spec Updates:**
{specification_changes_summary}

**Code Changes:**
{code_changes_summary}

**Recommended Next Steps:**
- Review implemented changes
- Test modified functionality
- Update MR with progress
- Request re-review if all feedback addressed

**Items Not Implemented:** (if any)
{list_of_skipped_items_with_reasons}
```

## Implementation Patterns

### Immediate Implementation

Upon user approval, immediately implement the feedback item using appropriate agent coordination. Never batch implementations - each approved item is implemented before moving to the next.

**Implementation Routing**:

**Spec Required**:
- Condition: Feedback requires specification or documentation updates
- Action: Delegate to spec agent with specific item context

**Code Only Changes**:
- Condition: Feedback requires only code changes
- Action: Delegate to code agent with specific item context

**Direct Handling**:
- Condition: Simple documentation or configuration changes
- Action: Implement directly in mr-actions

**Validation After Implementation**:
1. Verify the specific feedback item has been addressed
2. Confirm no unintended side effects
3. Update item status before proceeding to next

### Agent Handoff Coordination

When delegating to other agents, provide complete context and integrate changes back properly.

**API Client Delegation**:

When MR feedback requires API client changes:

*Handoff Context to Include*:
- Original MR feedback related to API client
- Specific API client files mentioned in feedback
- Requested changes or improvements
- Priority and blocking status of API client changes

*Integration Back Process*:
1. Receive completed API client updates from api-client-code (via code)
2. Integrate API client changes into overall MR feedback resolution
3. Validate that API client changes address original MR feedback
4. Coordinate final testing and validation

*User Communication*:
```
I found MR feedback related to API client changes. I'll coordinate the resolution
by delegating the actual API client modifications to the api-client-code agent
to ensure specification fidelity.

I'll handle:
- MR feedback analysis and planning
- Coordination with api-client-code
- Integration of API client changes into overall resolution
- Final validation and testing coordination

API client implementation will be handled by the specialist agent.
```

**Spec Writer Delegation**:

When MR feedback requires specification updates:

*Handoff Context to Include*:
- MR URL and feedback context
- Specific specification sections needing updates
- Reviewer comments requiring spec changes
- Expected deliverables (updated spec + changelog)

*Integration Back Process*:
1. Receive updated specification and changelog from spec
2. Extract implementation instructions from changelog
3. Continue with code implementation if needed
4. Validate spec updates address MR feedback

**Implementer Delegation**:

When MR feedback requires code-only changes:

*Handoff Context to Include*:
- Specific file and line number from MR feedback
- Original reviewer comment
- Required code changes
- Testing requirements

*Integration Back Process*:
1. Receive completed code changes from code
2. Validate changes address specific MR feedback item
3. Mark feedback item as completed
4. Continue to next item

### Content Preview

When user requests to see current content, provide relevant file sections with clear context about what will be changed.

**Preview Format**:
```
📄 **Current Content Preview**

**File:** {file_path}
**Lines:** {start_line}-{end_line}

{current_file_content}

**Proposed Change:**
{description_of_proposed_modification}
```

Then re-present the approval question after preview.

## Error Handling

### User Interruption

**Detection**: User provides unexpected input or requests to stop

**Response**:
```
🛑 **Interactive Processing Interrupted**

**Progress Summary:**
- Items Processed: {processed_count} of {total_items}
- Items Implemented: {implemented_count}
- Items Skipped: {skipped_count}

**Current Item:** {current_item_description}

You can resume processing later or proceed with other work.
```

### Implementation Failure

**Detection**: Unable to implement an approved feedback item

**Response**:
```
⚠️ **Implementation Failed**

Unable to implement feedback item {item_number}:
**Error:** {error_description}

**Options:**
- Skip this item and continue with others
- Attempt manual implementation
- Stop processing to resolve the issue

Should I continue with the remaining feedback items?
```

## Feedback Categories

### Blocking Issues
- Description: Critical issues that prevent merge
- Examples: Security vulnerabilities, broken functionality, missing required documentation, failing tests
- Priority: Critical

### Code Improvements
- Description: Suggestions for better code quality
- Examples: Refactoring suggestions, performance optimizations, code style improvements, better error handling
- Priority: High

### Documentation Updates
- Description: Requests for documentation changes
- Examples: API documentation updates, README improvements, code comments, specification clarifications
- Priority: Medium

### Suggestions
- Description: Optional improvements or future considerations
- Examples: Feature enhancements, alternative approaches, future optimizations
- Priority: Low

## Best Practices

1. **Present Complete Context**: Every feedback item includes full context (location, priority, reviewer, proposed fix)
2. **Require Explicit Approval**: Never assume user wants all items implemented
3. **Immediate Implementation**: Implement approved items right away before moving to next
4. **Clear Progress Tracking**: User always knows which item they're on and how many remain
5. **Graceful Interruption**: Support stopping at any time with clear progress summary