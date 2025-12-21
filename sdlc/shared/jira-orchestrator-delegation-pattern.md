# Jira Orchestrator Delegation Pattern

## Overview

Non-Orchestrator modes (Code, Spec, Architect) delegate ALL Jira status updates and user assignment to the Orchestrator mode. This ensures consistent Jira integration with proper Story Points validation and prevents partial or incomplete updates.

## Applies To

- ✅ Roo Modes: Code mode, Spec mode, Architect mode
- ✅ Claude Agents: code, spec, architect

## Delegation Principle

### Core Rules

1. **Mode NEVER directly updates Jira status or assigns users**
2. **Mode NEVER calls Jira MCP tools** (jira_update_issue, jira_transition_issue)
3. **All Jira operations are handled by Orchestrator mode** before routing to the specialized mode

### Rationale

Orchestrator mode has comprehensive Jira integration including:
- User assignment via `git config user.email`
- Story Points validation for Stories
- Proper status transition workflow
- Error handling and user communication

This delegation ensures:
- No partial updates (missing assignment or Story Points)
- Consistent behavior across all modes
- Single source of truth for Jira operations
- Simpler mode logic focused on core purpose

## When Invoked Directly

### Scenario
User invokes a specialized mode (Code/Spec/Architect) directly without going through Orchestrator.

### Detection Indicators
- No Jira context provided in task
- User starts work on Jira ticket without Orchestrator routing

### Response

**Action**: Inform user that Jira integration requires Orchestrator mode

**Message Template**:
```
Note: For Jira-tracked work, use Orchestrator mode to ensure proper status updates and assignment.
Continuing with [mode-specific work] without Jira integration.
```

**Alternative**: Continue with mode-specific work without Jira updates

## When Routed from Orchestrator

### Expectations

When a specialized mode is invoked by Orchestrator, the following should already be done:

1. **Jira status updated** to "In Progress" by Orchestrator
2. **User assigned** to ticket by Orchestrator (via `git config user.email`)
3. **Story Points validated** if issue type is Story
4. **Git branch created** with proper naming pattern

### Mode Action

Focus on the mode's core purpose, not Jira operations:
- **Code mode**: Implementation work
- **Spec mode**: Documentation work
- **Architect mode**: Architectural planning

## Jira Context Awareness

### Description

Modes can be aware of Jira context without updating it. This allows proper integration with git workflows and commit messages.

### Git Integration Reference

See `../../sdlc/shared/jira-git-integration.md` for branch naming and commit message patterns.

### Allowed Operations

1. **Read Jira issue key from git branch name**
   - Pattern: `personal/{git_user}/{JIRA-KEY}-{description}`
   - Extract key for commit messages

2. **Include Jira issue key in commit messages**
   - Format: `[JBS-123] Description of change`
   - Enables automatic linking in Jira

3. **Reference Jira issue in documentation/code**
   - Include issue key in relevant documentation
   - Add issue references in code comments when appropriate

4. **Mode-specific context usage**:
   - Code: Reference in code comments
   - Spec: Reference in documentation
   - Architect: Update memory bank with Jira context

### Forbidden Operations

1. ❌ Update Jira status
2. ❌ Assign Jira tickets
3. ❌ Update Jira fields (Story Points, description, etc.)
4. ❌ Transition Jira issues
5. ❌ Call any Jira MCP tools directly

## User Communication

### On Direct Invocation

**Message**:
```
Note: For Jira-tracked work, use Orchestrator mode to ensure proper status updates and assignment.
Continuing with [implementation/spec work/architectural planning] without Jira integration.
```

**Tone**: Informative but not blocking - let user continue with work

### On Orchestrator Routing

**Behavior**: Silent about Jira - Orchestrator already handled it

**Focus**: Communication should focus on the mode's core work:
- Code mode: Implementation details
- Spec mode: Documentation structure
- Architect mode: Architectural decisions

Do NOT mention Jira status updates or assignments when routed from Orchestrator.

## Best Practices

### Single Source of Truth

**Principle**: Orchestrator mode is the only mode that updates Jira

**Benefit**: Prevents inconsistent or incomplete Jira updates

### Clear Separation of Concerns

**Principle**: Each mode focuses on its core purpose, Orchestrator handles Jira

**Benefit**: Simpler mode logic and easier maintenance

**Examples**:
- Code mode focuses on implementation, not Jira
- Spec mode focuses on documentation, not Jira
- Architect mode focuses on planning, not Jira

### Graceful Degradation

**Principle**: Modes work with or without Jira integration

**Benefit**: Not all work requires Jira tracking

**Examples**:
- Exploratory coding
- Documentation updates
- Architecture exploration

Modes should function fully even when no Jira ticket is associated.

### No Partial Updates

**Principle**: Avoid partial Jira updates that miss assignment or Story Points

**Benefit**: Ensures complete and consistent Jira state

**Anti-pattern**: Updating status without assigning user leads to:
- Tickets stuck in "In Progress" but unassigned
- Confusion about who's working on what
- Incomplete Story Point tracking for Stories

## Integration Workflow

### Proper Workflow (Orchestrator-first)

1. User asks Orchestrator: "What's next?" or "Work on JBS-123"
2. Orchestrator queries Jira, assigns user, validates Story Points
3. Orchestrator transitions status to "In Progress"
4. Orchestrator routes to specialized mode with Jira context
5. Specialized mode performs its core work without touching Jira

### Improper Workflow (Direct invocation)

1. User directly invokes mode: "Implement feature X"
2. Mode detects no Jira context
3. Mode informs user about Orchestrator for Jira integration
4. Mode proceeds with work anyway (graceful degradation)

## References

### Automatic Status Updates
- `../../sdlc/shared/jira-status-updates.md`
- `../rules-orchestrator/5_automatic_jira_status_updates.xml`

### Git Integration
- `../../sdlc/shared/jira-git-integration.md`

### Complete Jira Workflows
- `../../sdlc/shared/jira-workflow-Patterns.md`
- `../../sdlc/shared/jira-project-key-workflow.md`
- `../../sdlc/shared/jira-user-identification.md`