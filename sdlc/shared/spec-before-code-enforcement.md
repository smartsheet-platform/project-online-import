# Specification-First Enforcement Pattern

## Overview

Critical enforcement pattern ensuring specifications are created and approved BEFORE any code implementation begins. This pattern prevents implementation without proper planning and user validation.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: Main Claude Code orchestration

## Principle

**SPECIFICATION MUST BE CREATED AND APPROVED BEFORE ANY CODE IMPLEMENTATION**

## Rationale

The SolutionsService SDLC requires a specification-first approach to ensure:
- Clear requirements documentation before implementation
- User review and approval of proposed approach
- Proper architectural planning and design validation
- Reduced rework from misunderstood requirements

## Workflow Sequence

### Step 1: Route to Spec Mode for Specification Creation

**Action**: Route to Spec mode for specification creation

**Delegation Message Template**:
```
**NEW FEATURE OR ENHANCEMENT SPECIFICATION**

**JIRA Ticket:** {jira_key}
**Title:** {issue_summary}
**Description:** {issue_description}
**Status:** In Progress

**Instructions:** Create complete specification document following SolutionsService patterns.
Include all required sections: Overview, Requirements, API Specification, Implementation Details,
Testing Requirements, Security Considerations, and Acceptance Criteria.
```

### Step 2: Present Specification to User for Review and Approval

**Action**: Present specification to user for review and approval

**Approval Required**: Yes (mandatory)

**Approval Message Template**:
```
**Specification Created**

I've created a comprehensive specification document for {jira_key}.

**Specification File:** {spec_file_path}

Please review the specification and:
- ✅ **Approve** to proceed with code implementation
- 📝 **Request Changes** to specification
- 🔍 **Review** specific sections in detail

Your choice:
```

### Step 3: ONLY After User Approval - Route to Code Mode

**Action**: ONLY after user approval: Route to Code mode for implementation

**Delegation Message Template**:
```
**FEATURE OR ENHANCEMENT IMPLEMENTATION**

**Specification:** {spec_file_path}
**JIRA Ticket:** {jira_key}
**Implementation Scope:** Complete implementation from approved specification

**Instructions:** Implement complete feature based on specification requirements.
Follow all architectural patterns and standards defined in the specification.
```

## Violation Prevention

### Critical Rules

1. **Orchestrator MUST NOT route directly to Code mode without first creating specification**
2. **Orchestrator MUST NOT allow Code mode to proceed without user approval of specification**
3. **If user requests to "start coding" or "implement", orchestrator MUST first create specification**

### User Request Translation

When user says:
- "Start coding" → Create spec first, then get approval
- "Implement this" → Create spec first, then get approval
- "Let's write the code" → Create spec first, then get approval
- "Begin implementation" → Create spec first, then get approval

### Exception Handling

**Only Exception**: If user explicitly says "skip spec" or "use existing spec at path X", then spec phase may be bypassed.

**Verification**: Always confirm with user before skipping spec phase to ensure intentional bypass.

## Implementation Guidance

### For Roo Orchestrator Mode

1. Detect feature/enhancement work from Jira task description
2. Route to Spec mode (never directly to Code mode)
3. Wait for spec completion
4. Present spec to user with approval options
5. Only route to Code mode after explicit user approval

### For Claude Code

1. Detect feature/enhancement work from user request
2. Use Task tool to invoke spec agent
3. Present completed spec to user
4. Use AskUserQuestion tool for approval
5. Only invoke code agent after approval received

## Examples

### Example 1: New Feature Request

**Scenario**: User says "Implement user authentication"

**Correct Flow**:
1. Detect this is a feature implementation
2. Route to Spec mode: "Create specification for user authentication feature"
3. Wait for spec completion
4. Present to user: "Spec created at sdlc/docs/specs/user-auth.md. Please review and approve."
5. Get user approval
6. Route to Code mode: "Implement user authentication per approved spec"

**Incorrect Flow** (Violation):
1. ❌ Detect feature implementation
2. ❌ Route directly to Code mode
3. ❌ Start coding without specification

### Example 2: Enhancement Request

**Scenario**: User says "Add rate limiting to API endpoints"

**Correct Flow**:
1. Detect this is an enhancement
2. Route to Spec mode: "Create specification for API rate limiting enhancement"
3. Wait for spec completion
4. Present to user: "Spec created. Please review sections on rate limits, storage, error handling."
5. User requests changes: "Use Redis instead of in-memory storage"
6. Update spec with changes
7. Get user approval
8. Route to Code mode: "Implement rate limiting per approved spec"

### Example 3: User Tries to Skip Spec

**Scenario**: User says "Skip the spec and just code this up quickly"

**Correct Response**:
```
I understand you want to move quickly, but the SDLC requires specification-first approach for all features and enhancements.

Creating a spec first will:
- Clarify requirements and approach
- Allow you to validate the design before implementation
- Reduce rework from misunderstood requirements

I'll create a concise specification document. Once you approve it, we can proceed immediately to implementation.

Should I proceed with creating the specification?
```

**Incorrect Response** (Violation):
❌ "Okay, I'll start coding right away" → This violates the spec-first enforcement

## Verification Checklist

Before routing to Code mode, verify:
- [ ] Specification document has been created
- [ ] Specification includes all required sections
- [ ] User has reviewed the specification
- [ ] User has explicitly approved the specification
- [ ] Specification file path is provided to Code mode

## Integration Points

### With Jira Workflow

- Specification creation happens while ticket is in "In Progress" status
- Code implementation begins after spec approval (ticket remains "In Progress")
- Status transitions to "In Review" after code is complete

### With Git Workflow

- Spec is created in the feature branch
- Spec is committed before code implementation begins
- Spec file is referenced in code implementation commits

### With Mode Routing

- Orchestrator enforces this pattern for all feature/enhancement work
- Spec mode creates specification documents
- Code mode receives approved specification path
- No direct Orchestrator → Code routing for new features/enhancements
