# Multi-Task Tenancy

## Overview

Critical instructions for supporting multi-task development in a shared repository. This system enables multiple developers to work concurrently on different features/tasks while maintaining proper context isolation and preventing cross-contamination of work contexts.

This is a TWO-TIER system:
- Tier 1: Shared project context (memory-bank/*.md)
- Tier 2: Task-specific contexts (memory-bank/tasks/{task-id}/)

## Applies To

- ✅ Roo Modes: ALL modes that use memory bank systems
- ✅ Claude Agents: ALL agents that use memory bank systems

## Tenancy Architecture

### Two-Tier Structure

#### Tier 1: Shared Project Context

**Location**: memory-bank/ (root level)

**Purpose**: Shared project-wide knowledge and decisions

**Scope**: Cross-cutting concerns, architectural decisions, shared patterns

**Access**: Read by all developers, write with coordination

**Files**:
- productContext.md - Overall project goals and architecture
- systemPatterns.md - Shared patterns and conventions
- decisionLog.md - Major architectural decisions
- activeContext.md - Current project status and focus areas
- progress.md - Overall project progress tracking

#### Tier 2: Task-Specific Context

**Location**: memory-bank/tasks/{task-id}/

**Purpose**: Isolated context for specific feature/task work

**Scope**: Task requirements, decisions, progress, and artifacts

**Access**: Read/write by assigned developers, read-only by reviewers

**Files**:
- taskContext.md - Task description and requirements
- progress.md - Implementation progress and status
- decisions.md - Task-specific technical decisions
- reviewNotes.md - Code review feedback and actions

### SDLC Memory Bank Unchanged

The SDLC memory bank (sdlc/memory-bank/) remains separate and unchanged. It continues to track SDLC tooling development independently from main app work.

## Context Detection and Selection

### Automatic Task Detection

#### Step 1: Detect Active Task

**Methods** (in priority order):
1. Git branch name (extract task ID from branch)
2. Check shared activeContext.md for current tasks
3. Ask user which task they're working on

**Branch Patterns**:
- `feature/{task-id}-description` → task-id
- `bugfix/{task-id}-description` → task-id
- `task/{task-id}` → task-id

#### Step 2: Determine Context Scope

**Use Shared Context** (memory-bank/ root files only) when:
- Reading architectural patterns, system-wide decisions
- Understanding overall project structure
- Reviewing cross-cutting concerns
- Tracking overall project progress

**Use Task Context** (memory-bank/tasks/{task-id}/) when:
- Working on specific feature implementation
- Making task-specific decisions
- Tracking task progress and status
- Documenting code review feedback

### Context Initialization

**Task Context Initialization**:

**Trigger**: New task/branch detected

**Actions**:
1. Create memory-bank/tasks/{task-id}/ directory
2. Initialize with template files (taskContext.md, progress.md, decisions.md, reviewNotes.md)
3. Update shared activeContext.md with new task
4. Inform user of task context location

## Context Isolation Rules

### Isolation Principle

- Each task context is isolated from other task contexts
- Task-specific decisions stay in task context, not shared context
- Only promote decisions to shared context when they affect multiple tasks
- Developers working on different tasks use different task contexts

### Context Boundaries

#### Task-to-Task Boundary

- Tasks cannot directly reference other task contexts
- Shared knowledge must be promoted to shared context first
- Exception: Explicit task dependencies documented in taskContext.md

#### Task-to-Shared Boundary

- Tasks can read shared context freely
- Tasks propose changes to shared context via decisions.md
- Shared context updates require explicit promotion/merge

## Merge and Integration Workflow

### Task Completion Workflow

#### Step 1: Review Task Context

- Review task's decisions.md for architectural impacts
- Identify decisions that should be promoted to shared context

#### Step 2: Promote Shared Knowledge

- Update memory-bank/systemPatterns.md with new patterns
- Update memory-bank/decisionLog.md with architectural decisions
- Document in task's decisions.md what was promoted

#### Step 3: Update Shared Progress

- Update memory-bank/progress.md with task completion
- Update memory-bank/activeContext.md to remove completed task

#### Step 4: Archive Task Context

- Mark task context as completed in progress.md
- Keep task context for historical reference
- Do not delete task context - it provides audit trail

### Context Merge Conflicts

#### Concurrent Shared Updates

**Scenario**: Multiple tasks updating same shared context file

**Resolution**: Last writer wins, but document conflict in decisionLog.md

**Prevention**: Coordinate shared context updates through team communication

#### Divergent Task Decisions

**Scenario**: Two tasks make conflicting architectural decisions

**Resolution**: Escalate to team discussion, document resolution in decisionLog.md

**Prevention**: Review shared context before making major decisions

## Mode Behavior Adaptations

### All Modes

- Automatically detect task context on initialization
- Use appropriate context tier based on work scope
- Maintain context isolation boundaries
- Prompt for context when ambiguous

### Architect Mode

- Read shared context for architectural patterns
- Write task-specific decisions to task context
- Propose shared context updates in task decisions.md

### Code Modes

- Read task context for implementation guidance
- Update task progress.md with implementation status
- Reference shared patterns from memory-bank/systemPatterns.md

### Orchestrator Mode

- Coordinate across multiple task contexts
- Manage task dependencies and handoffs
- Facilitate shared context updates
- Track overall project progress across all tasks

### MR Actions Mode

- Read task context for MR-specific feedback
- Update task's reviewNotes.md with feedback actions
- Coordinate review feedback resolution

## Task Handoff Protocol

### Task Reassignment

1. Update task's taskContext.md with handoff note
2. Document handoff reason and context in progress.md
3. Update shared activeContext.md with new assignment
4. Ensure new developer reviews task context thoroughly

### Collaborative Task

1. Document collaboration in task's taskContext.md
2. All developers reference same task context
3. Coordinate updates through task's progress.md
4. Use task's decisions.md for collaborative decisions

### Code Review

1. Reviewer reads task context for understanding
2. Reviewer writes feedback to task's reviewNotes.md
3. Original developer addresses feedback in same task context
4. Review iterations tracked in reviewNotes.md

## Implementation Checklist

### Initialization

- Verify memory-bank/ root directory exists
- Create memory-bank/tasks/ directory if needed
- Initialize shared context files if needed

### Task Detection

- Check current git branch for task ID
- Check shared activeContext.md for current tasks
- Ask user if task unclear
- Create task context directory if new task

### Context Usage

- Read shared context for project-wide knowledge
- Read/write task context for task-specific work
- Maintain isolation between task contexts
- Update shared activeContext.md with task status changes

## Anti-Patterns to Avoid

### Context Leakage

**Description**: Mixing task-specific decisions into shared context prematurely

**Impact**: Pollutes shared knowledge with incomplete or task-specific information

**Prevention**: Keep decisions in task context until proven broadly applicable

### Context Duplication

**Description**: Duplicating information across multiple context tiers

**Impact**: Creates synchronization issues and confusion

**Prevention**: Single source of truth: shared for project-wide, task for task-specific

### Ignoring Isolation

**Description**: Directly referencing other task contexts

**Impact**: Creates hidden dependencies and coupling between tasks

**Prevention**: Use shared context for cross-task communication

### Stale Context

**Description**: Not updating context as work progresses

**Impact**: Context becomes unreliable and misleading

**Prevention**: Update progress.md and activeContext.md regularly

## Enforcement for All Modes

**Applies To**: All modes that use memory bank systems

**Mandatory Behavior**:
- Detect task context automatically
- Use appropriate context tier for each operation
- Maintain strict isolation between task contexts
- Coordinate shared context updates properly
- Document task handoffs and transitions
