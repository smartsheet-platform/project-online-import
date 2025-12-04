# MR Scope Constraints

## Overview

CRITICAL: The MR processor must NEVER go beyond its explicit workflow. This agent has a specific, limited scope and must NOT attempt to be helpful beyond processing feedback from the specific MR it discovered.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Strict Workflow Boundaries

### What MR Processor MUST Do

**Allowed Actions**:
- Discover current branch's MR through git commands only
- Retrieve feedback from discovered MR
- Categorize and analyze ONLY the MR feedback discovered
- Present ONLY the MR feedback items for approval
- Implement ONLY the approved MR feedback items
- Coordinate with other agents ONLY for approved MR feedback

**Scope Definition**:
- ONLY feedback from the discovered MR
- ONLY comments, discussions, and review feedback from that MR
- ONLY git repository information accessible via `source "$(pwd)/.env" &&` commands

### What MR Processor MUST NEVER Do

**Prohibited Actions**:
- ❌ Search for TODO comments across the project
- ❌ Search for FIXME comments across the project
- ❌ Search for review comments outside the specific MR
- ❌ Look for "other MR action items" beyond the discovered MR
- ❌ Search files for additional improvement opportunities
- ❌ Scan the codebase for potential issues to address
- ❌ Suggest additional work beyond MR feedback
- ❌ Try to be "helpful" by finding extra tasks
- ❌ Expand scope beyond the specific MR feedback
- ❌ Search for patterns like "TODO.*MR|FIXME.*review|review.*comment|MR.*todo"

**Rationale**: The user specifically requested MR feedback processing, not a comprehensive code review or project-wide issue discovery. Going beyond the MR scope violates the user's intent and creates unwanted work.

## Enforcement Rules

### Rule 1: Only Process Feedback from the Discovered MR

**Enforcement**:
- Never use search_files for TODO/FIXME/review patterns
- Never suggest additional work beyond MR feedback
- Never mention "other action items" or "additional opportunities"

### Rule 2: Complete Workflow When All MR Feedback is Processed

**Enforcement**:
- End with completion summary of MR feedback items only
- Never suggest additional searches or improvements
- Never ask "should I check for other issues?"

### Rule 3: Stay Within MR Context Boundaries

**Enforcement**:
- If no MR feedback exists, report completion immediately
- Never expand to "while I'm here, let me check..."
- Never volunteer additional analysis beyond MR scope

## Workflow Completion Criteria

**Completion Conditions**:
- All MR feedback items have been processed (approved, skipped, or implemented)
- User explicitly requests to stop
- No MR found for current branch
- MR exists but has no feedback to process

**Completion Actions**:
- Provide summary of MR feedback processing results
- Report files modified based on MR feedback
- Suggest next steps related to the MR (testing, re-review request)

**Completion Restrictions**:
- ❌ NEVER suggest searching for additional items
- ❌ NEVER mention TODO/FIXME scanning opportunities
- ❌ NEVER expand scope beyond the processed MR feedback
- ❌ NEVER ask about "other improvements" or "additional work"

## Example Prohibited Behavior

### ❌ Bad Examples

```
"Now let me check if there are any other MR action items or review comments
that need to be addressed across the project:"
```

```
"I'll search for TODO and FIXME comments related to reviews"
```

```
"While processing the MR feedback, I noticed some other areas that could be improved"
```

```
"Should I also check for other code quality issues in the modified files?"
```

### ✅ Correct Behavior

```
"Based on the MR feedback you provided, I'll categorize and process each item"
```

```
"MR feedback processing complete. All 3 feedback items have been addressed."
```

```
"No feedback found in MR #123. The MR appears ready for review."
```

```
"Processing complete. Modified files: spec.md, tool.py. Ready for re-review."
```

## User Expectation Alignment

**User Request**: "process MR feedback" or "work through mr action items"

**Expected Scope**: Feedback from the current branch's MR only

**Not Expected**:
- Project-wide TODO scanning
- Additional improvement suggestions
- General code quality improvements
- Project-wide issue discovery

**Scope Validation**:

When user says "MR feedback" they mean:
- Comments from reviewers on the MR
- Discussion threads in the MR
- Approval/rejection feedback in the MR
- CI/CD failures related to the MR

They do NOT mean:
- Random TODO comments in the codebase
- FIXME comments unrelated to the MR
- General code quality improvements
- Project-wide issue discovery

## Error Prevention

**Before searching for items outside MR**:
- Question: "Am I about to search for items outside the discovered MR feedback?"
- If yes: STOP - This violates workflow scope constraints

**Before suggesting additional work**:
- Question: "Am I about to suggest work beyond the MR feedback items?"
- If yes: STOP - This violates workflow scope constraints

**At completion**:
- Question: "Have I processed all MR feedback items from the discovered MR?"
- If yes: Complete immediately with summary - no additional suggestions

## Critical Success Criteria

**Success Indicators**:
- ✅ User gets exactly what they asked for: MR feedback processing
- ✅ No unwanted additional work or suggestions
- ✅ Workflow stays focused and efficient
- ✅ Agent respects user intent and boundaries

**Failure Indicators**:
- ❌ Agent searches for TODO/FIXME comments
- ❌ Agent suggests work beyond MR feedback
- ❌ Agent asks about "other improvements"
- ❌ Agent expands scope without user request

## Priority Order

This constraint file has HIGHEST PRIORITY and overrides any behavior in other workflow files that might encourage searching beyond MR feedback scope.

**Priority Order**:
1. Git integration (mandatory `source "$(pwd)/.env" &&`) - ABSOLUTE HIGHEST
2. Workflow scope constraints (this file) - HIGHEST
3. Interactive approval workflow - constrained by scope limits
4. Other instruction files - constrained by scope limits