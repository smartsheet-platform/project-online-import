# Memory Bank Task Templates

## Overview

Template content for initializing memory bank directories and files in the multi-task tenancy system. These templates should be used when creating the shared context or new task contexts.

This is a TWO-TIER system:
- Tier 1: Shared project context (memory-bank/*.md)
- Tier 2: Task-specific contexts (memory-bank/tasks/{task-id}/)

## Applies To

- ✅ Roo Modes: ALL modes that use memory bank systems
- ✅ Claude Agents: ALL agents that use memory bank systems

## Shared Context Templates

### productContext.md

**Purpose**: Overall project goals and architecture

**Content**:
```markdown
# Product Context

This file provides a high-level overview of the project and the expected product that will be created.
This file is intended to be updated as the project evolves, and should be used to inform all modes of the project's goals and context.

## Project Goal

[Describe your project's main objectives and goals]

## Key Features

[List the key features and capabilities your project will provide]

## Overall Architecture

[Describe your project's architectural approach and design principles]

## Technology Stack

[Document your chosen technology stack and rationale]

## Team Structure

- Multiple developers working concurrently on different tasks
- Feature-based task assignment
- Code review and merge workflow

---
Last Updated: [Date]
```

### systemPatterns.md

**Purpose**: Shared patterns and conventions

**Content**:
```markdown
# System Patterns

This file documents architectural patterns, coding conventions, and shared approaches used across the project.
These patterns should be followed by all developers to maintain consistency.

## Architectural Patterns

[Document key architectural patterns used in the project]

## Coding Conventions

[Document coding standards and conventions]

## Common Utilities

[Document shared utilities and helper functions]

## Integration Patterns

[Document how different components integrate]

## Testing Patterns

[Document testing approaches and patterns]

---
Last Updated: [Date]
```

### decisionLog.md

**Purpose**: Major architectural decisions

**Content**:
```markdown
# Decision Log

This file tracks major architectural and technical decisions made for the project.
Each decision should include context, alternatives considered, and rationale.

## Decision Format

For each decision, include:
- **Date**: When the decision was made
- **Context**: What prompted this decision
- **Decision**: What was decided
- **Alternatives**: What other options were considered
- **Rationale**: Why this decision was made
- **Consequences**: Expected impacts and trade-offs
- **Status**: Active, Superseded, or Deprecated

---

## Decisions

### [Decision Title]
- **Date**: YYYY-MM-DD
- **Context**: [What prompted this decision]
- **Decision**: [What was decided]
- **Alternatives**: [Other options considered]
- **Rationale**: [Why this was chosen]
- **Consequences**: [Expected impacts]
- **Status**: Active

---
Last Updated: [Date]
```

### activeContext.md

**Purpose**: Current project status and active tasks

**Content**:
```markdown
# Active Context

This file tracks the project's current status, including active tasks, recent changes, and open questions.

## Active Tasks

### [Task ID] - [Brief Description]
- **Status**: [In Progress/Blocked/Review/etc.]
- **Assigned To**: [Developer name(s)]
- **Started**: [Date]
- **Branch**: [Git branch name]
- **Context**: memory-bank/tasks/{task-id}/

### [Task ID] - [Brief Description]
- **Status**: [Status]
- **Assigned To**: [Developer name(s)]
- **Started**: [Date]
- **Branch**: [Git branch name]
- **Context**: memory-bank/tasks/{task-id}/

## Recent Changes

[Track recent significant changes and updates to the project]

## Open Questions/Issues

[List any open questions or issues that need resolution]

## Upcoming Work

[List planned tasks or features coming up]

---
Last Updated: [Date]
```

### progress.md

**Purpose**: Overall project progress tracking

**Content**:
```markdown
# Project Progress

This file tracks overall project progress across all tasks and features.

## Current Sprint/Milestone

**Name**: [Sprint/Milestone name]
**Start Date**: [Date]
**End Date**: [Date]
**Goals**: [Key objectives for this period]

## Completed Tasks

### [Task ID] - [Brief Description]
- **Completed**: [Date]
- **Developer**: [Name]
- **Key Outcomes**: [What was accomplished]

## In Progress Tasks

### [Task ID] - [Brief Description]
- **Status**: [X]% complete
- **Developer**: [Name]
- **Expected Completion**: [Date]

## Blocked Tasks

### [Task ID] - [Brief Description]
- **Blocker**: [What's blocking progress]
- **Developer**: [Name]
- **Resolution Plan**: [How to unblock]

## Metrics

- **Tasks Completed This Sprint**: [Number]
- **Tasks In Progress**: [Number]
- **Tasks Blocked**: [Number]
- **Overall Project Progress**: [X]%

---
Last Updated: [Date]
```

## Task Context Templates

### taskContext.md

**Purpose**: Task description and requirements

**Location**: memory-bank/tasks/{task-id}/taskContext.md

**Content**:
```markdown
# Task Context: {task-id}

## Task Overview

**Task ID**: {task-id}
**Title**: [Task title]
**Type**: [Feature/Bug/Enhancement/etc.]
**Priority**: [High/Medium/Low]
**Assigned To**: [Developer name(s)]
**Created**: [Date]
**Target Completion**: [Date]

## Description

[Detailed description of what needs to be done]

## Requirements

### Functional Requirements
- [Requirement 1]
- [Requirement 2]

### Non-Functional Requirements
- [Performance requirements]
- [Security requirements]
- [Scalability requirements]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Dependencies

### Depends On
- [Task ID] - [Brief description]

### Blocks
- [Task ID] - [Brief description]

## Related Tasks

- [Task ID] - [Relationship description]

## Technical Notes

[Any technical considerations, constraints, or approaches to consider]

---
Last Updated: [Date]
```

### progress.md (Task)

**Purpose**: Task implementation progress and status

**Location**: memory-bank/tasks/{task-id}/progress.md

**Content**:
```markdown
# Progress: {task-id}

## Current Status

**Overall Progress**: [X]% complete
**Current Phase**: [Planning/Implementation/Testing/Review/Complete]
**Last Updated**: [Date]
**Current Developer**: [Name]

## Implementation Checklist

### Phase 1: Planning
- [x] Requirements analysis
- [x] Technical design
- [ ] Review and approval

### Phase 2: Implementation
- [ ] [Component/Feature 1]
- [ ] [Component/Feature 2]
- [ ] [Component/Feature 3]

### Phase 3: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

### Phase 4: Documentation
- [ ] Code documentation
- [ ] User documentation
- [ ] API documentation

### Phase 5: Review
- [ ] Code review
- [ ] QA review
- [ ] Final approval

## Progress Log

### [Date] - [Developer]
**Work Completed**:
- [What was accomplished]

**Next Steps**:
- [What's planned next]

**Blockers**:
- [Any issues encountered]

---

### [Date] - [Developer]
**Work Completed**:
- [What was accomplished]

**Next Steps**:
- [What's planned next]

---
Last Updated: [Date]
```

### decisions.md

**Purpose**: Task-specific technical decisions

**Location**: memory-bank/tasks/{task-id}/decisions.md

**Content**:
```markdown
# Decisions: {task-id}

This file tracks technical decisions made specifically for this task.

## Decision Format

For each decision:
- **Date**: When decided
- **Context**: Why this decision was needed
- **Decision**: What was decided
- **Alternatives**: Other options considered
- **Rationale**: Why this was chosen
- **Impact**: How this affects the task
- **Promotion**: Should this be promoted to shared context? (Yes/No/Maybe)

---

## Decisions

### [Decision Title]
- **Date**: YYYY-MM-DD
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Alternatives**: [Other options considered]
- **Rationale**: [Why this was chosen]
- **Impact**: [How this affects the task]
- **Promotion**: [Yes/No/Maybe - should this be shared project-wide?]

---

## Decisions to Promote

These decisions should be promoted to shared context (memory-bank/decisionLog.md or memory-bank/systemPatterns.md):

- [ ] [Decision title] - Reason for promotion: [Why this should be shared]

---
Last Updated: [Date]
```

### reviewNotes.md

**Purpose**: Code review feedback and actions

**Location**: memory-bank/tasks/{task-id}/reviewNotes.md

**Content**:
```markdown
# Review Notes: {task-id}

This file tracks code review feedback and resolution actions for this task.

## Review Status

**Current Review Round**: [Number]
**Reviewer(s)**: [Names]
**Review Started**: [Date]
**Status**: [In Progress/Changes Requested/Approved]

---

## Review Round [Number] - [Date]

**Reviewer**: [Name]
**Review Type**: [Initial/Follow-up/Final]

### Feedback Items

#### [Category: Bug/Style/Performance/Security/etc.]

**Issue**: [Description of the issue]
**Location**: [File:line or component]
**Severity**: [Critical/Major/Minor/Suggestion]
**Status**: [Open/In Progress/Resolved]

**Resolution**:
[How this was addressed]

---

#### [Category]

**Issue**: [Description]
**Location**: [File:line]
**Severity**: [Level]
**Status**: [Status]

**Resolution**:
[How this was addressed]

---

### General Comments

[Any general feedback or observations from the reviewer]

---

## Action Items

- [ ] [Action item from review]
- [ ] [Action item from review]
- [x] [Completed action item]

---

## Review History

### Round 1 - [Date]
- **Reviewer**: [Name]
- **Outcome**: [Changes Requested/Approved]
- **Key Issues**: [Summary of main issues]

---
Last Updated: [Date]
```

## Initialization Instructions

### Step 1: Initialize Shared Context

**Actions**:
- Create memory-bank/ directory at root if it doesn't exist
- Create productContext.md, systemPatterns.md, decisionLog.md, activeContext.md, progress.md using templates
- Customize templates with project-specific information

### Step 2: Create Task Directory

**Actions**:
- Create memory-bank/tasks/ directory
- Add .gitkeep file to preserve empty directory

### Step 3: Initialize First Task Context (if applicable)

**Actions**:
- Detect current task from git branch
- Create memory-bank/tasks/{task-id}/ directory
- Create taskContext.md, progress.md, decisions.md, reviewNotes.md using templates
- Replace {task-id} placeholders with actual task ID
- Add task to shared activeContext.md

### Step 4: Document Structure

**Actions**:
- Create memory-bank/README.md explaining the structure
- Document the two-tier architecture
- Provide examples of proper usage

## Template Customization Guidelines

- Replace all placeholder text in brackets [like this] with actual content
- Replace {task-id} with actual task identifier from branch or ticket system
- Update "Last Updated" dates when modifying files
- Maintain consistent formatting across all context files
- Add project-specific sections as needed while preserving core structure