# Multi-Task Initialization Guide

## Overview

Step-by-step guide for teams to initialize and use the multi-task memory bank system. This system supports multiple developers working concurrently on different features/tasks while maintaining proper context isolation and preventing cross-contamination of work contexts.

This is a TWO-TIER system:
- Tier 1: Shared project context (memory-bank/*.md)
- Tier 2: Task-specific contexts (memory-bank/tasks/{task-id}/)

## Applies To

- ✅ Roo Modes: ALL modes that use memory bank systems
- ✅ Claude Agents: ALL agents that use memory bank systems

## Quick Start

### For Team Leads

1. Initialize shared project context (one-time setup)
2. Document team structure and workflows
3. Train team on memory bank usage

### For Developers

1. System auto-detects task from git branch
2. System auto-creates task context on first use
3. Update task context as you work
4. Promote decisions to shared context when appropriate

## Initial Setup for Teams

### Phase 1: Shared Context Initialization

Set up the shared project-wide memory bank that all developers will reference. This is typically done once by a team lead or architect.

#### Step 1: Create Root Memory Bank Directory

**Command**: `mkdir -p memory-bank`

**Verification**: `ls -la | grep memory-bank`

**Expected Result**: Directory memory-bank/ exists at project root

#### Step 2: Create Subdirectory for Tasks

**Commands**:
```bash
mkdir -p memory-bank/tasks
touch memory-bank/tasks/.gitkeep
```

**Verification**: `ls -la memory-bank/`

**Expected Result**: Subdirectory tasks/ exists with .gitkeep file

#### Step 3: Initialize Shared Context Files

**Files to Create**:

**memory-bank/productContext.md**:
- Template: See memory-bank-task-templates.md for template content
- Customization: Fill in project goals, architecture, technology stack

**memory-bank/systemPatterns.md**:
- Template: See memory-bank-task-templates.md for template content
- Customization: Document architectural patterns and coding conventions

**memory-bank/decisionLog.md**:
- Template: See memory-bank-task-templates.md for template content
- Customization: Start with any major decisions already made

**memory-bank/activeContext.md**:
- Template: See memory-bank-task-templates.md for template content
- Customization: List any active tasks and their status

**memory-bank/progress.md**:
- Template: See memory-bank-task-templates.md for template content
- Customization: Set up current sprint/milestone information

#### Step 4: Create Memory Bank README

**File**: memory-bank/README.md

**Content Outline**:
- Overview of the two-tier structure
- How to use shared context
- How task contexts work
- Best practices for context isolation
- When to promote decisions to shared context

#### Step 5: Commit Initial Structure

**Commands**:
```bash
git add memory-bank/
git commit -m "Initialize multi-task memory bank structure"
```

**Note**: This makes the structure available to all team members

### Phase 2: Task Context Creation

When a developer starts work on a new feature/task, the system automatically creates an isolated context for that work.

#### Automatic Task Detection

**Step 1: System Detects Task ID from Branch**

**Branch Patterns**:

- Format: `feature/{task-id}-description`
  - Example: `feature/PROJ-123-add-user-auth`
  - Extracted ID: `PROJ-123`

- Format: `bugfix/{task-id}-description`
  - Example: `bugfix/BUG-456-fix-login`
  - Extracted ID: `BUG-456`

- Format: `task/{task-id}`
  - Example: `task/TASK-789`
  - Extracted ID: `TASK-789`

**Fallback**: If no task ID in branch, ask user for task identifier

**Step 2: System Creates Task Context**

Actions:
1. Create memory-bank/tasks/{task-id}/ directory
2. Create taskContext.md from template
3. Create progress.md from template
4. Create decisions.md from template
5. Create reviewNotes.md from template
6. Update shared activeContext.md with new task

**Step 3: Developer Customizes Task Context**

Actions:
- Fill in taskContext.md with requirements and acceptance criteria
- Begin tracking progress in progress.md
- Document decisions in decisions.md as they're made

**Step 4: Commit Task Context**

**Commands**:
```bash
git add memory-bank/tasks/{task-id}/
git commit -m "Initialize task context for {task-id}"
```

**Note**: Makes task context visible to reviewers and collaborators

## Daily Workflow for Developers

### Morning Routine

#### Step 1: Check Shared Active Context

**File**: memory-bank/activeContext.md

**Actions**:
- Review current active tasks across the team
- Check for any blockers or dependencies affecting your work

#### Step 2: Review Your Task Progress

**File**: memory-bank/tasks/{task-id}/progress.md

**Actions**:
- Review what was completed yesterday
- Plan today's work

#### Step 3: Check Shared Context for Updates

**Files**:
- memory-bank/decisionLog.md
- memory-bank/systemPatterns.md

**Actions**:
- Review any new decisions or patterns
- Ensure your work aligns with latest standards

### During Development

#### Step 1: Update Task Progress Regularly

**File**: memory-bank/tasks/{task-id}/progress.md

**Frequency**: After completing each significant piece of work

**Content**: What was accomplished, next steps, any blockers

#### Step 2: Document Technical Decisions

**File**: memory-bank/tasks/{task-id}/decisions.md

**When**: When making architectural or technical choices

**Content**: Context, decision, alternatives, rationale, impact

**Promotion**: Mark decisions that should be shared project-wide

### End of Day

#### Step 1: Update Task Progress

**File**: memory-bank/tasks/{task-id}/progress.md

**Actions**:
- Document today's accomplishments
- Note any blockers for tomorrow

#### Step 2: Update Shared Active Context if Needed

**File**: memory-bank/activeContext.md

**Actions**:
- Update task status if changed significantly
- Note any blockers that affect other tasks

#### Step 3: Commit Context Updates

**Commands**:
```bash
git add memory-bank/tasks/{task-id}/ memory-bank/activeContext.md
git commit -m "Update context: {brief description of progress}"
```

**Benefit**: Preserves context for tomorrow and enables handoffs

## Task Completion Workflow

### Step 1: Review Task Decisions

**File**: memory-bank/tasks/{task-id}/decisions.md

**Actions**:
- Identify decisions marked for promotion
- Determine which should be shared project-wide

### Step 2: Promote Shared Knowledge

#### Architectural Decisions

**Target**: memory-bank/decisionLog.md

**Action**: Add significant architectural decisions

**Format**: Follow decision log format with full context

#### Patterns and Conventions

**Target**: memory-bank/systemPatterns.md

**Action**: Add new patterns or conventions discovered

**Format**: Document pattern with examples and rationale

### Step 3: Mark Task as Complete

**File**: memory-bank/tasks/{task-id}/progress.md

**Actions**:
- Update status to "Complete"
- Add final summary of what was accomplished

**Note**: Keep task context for historical reference

### Step 4: Update Shared Context

**File**: memory-bank/activeContext.md
- Action: Move task from "Active Tasks" to "Recent Changes"

**File**: memory-bank/progress.md
- Action: Update project progress metrics
- Action: Move task to "Completed Tasks" section

### Step 5: Commit Final Context State

**Commands**:
```bash
git add memory-bank/
git commit -m "Complete task {task-id}: {brief summary}"
```

**Benefit**: Preserves complete task history and shared knowledge

## Collaboration Patterns

### Task Handoff

**Scenario**: Transferring a task from one developer to another

**Steps**:
1. Original developer updates task progress.md with handoff notes
2. Original developer updates shared activeContext.md with new assignment
3. New developer reviews task context to understand current state
4. New developer adds handoff acknowledgment to progress.md

### Collaborative Task

**Scenario**: Multiple developers working on the same task

**Steps**:
1. Document collaboration in task's taskContext.md
2. All developers reference same task context
3. Coordinate updates through task's progress.md
4. Use decisions.md for collaborative technical decisions
5. Update shared activeContext.md to show multiple assignees

### Code Review

**Scenario**: Reviewing another developer's work

**Steps**:
1. Reviewer reads task context for understanding
2. Reviewer writes feedback to task's reviewNotes.md
3. Original developer addresses feedback in same task context
4. Review iterations tracked in reviewNotes.md
5. Final approval documented in reviewNotes.md

### Cross-Task Dependencies

**Scenario**: One task depends on another task

**Steps**:
1. Document dependency in dependent task's taskContext.md
2. Do NOT directly reference other task's context
3. If shared knowledge needed, promote to shared context
4. Coordinate through shared activeContext.md or team communication

## Best Practices

### Context Isolation

**Principles**:
- Keep task-specific decisions in task context
- Only promote to shared context when broadly applicable
- Avoid cross-referencing between task contexts

**Benefit**: Prevents context pollution and maintains clear boundaries

### Regular Updates

**Principles**:
- Update progress.md after each significant piece of work
- Document decisions as they're made, not retrospectively
- Commit context updates at least daily

**Benefit**: Maintains accurate context and enables smooth handoffs

### Promotion Discipline

**Principles**:
- Not every decision needs to be shared
- Promote when decision affects multiple tasks or future work
- Document promotion in task's decisions.md

**Benefit**: Keeps shared context focused and valuable

### Clear Communication

**Principles**:
- Use task context for task-specific communication
- Use shared context for project-wide communication
- Document handoffs and transitions explicitly

**Benefit**: Reduces confusion and improves team coordination

## Troubleshooting

### Task Context Not Auto-Created

**Symptom**: System doesn't create task context from branch

**Causes**:
- Branch name doesn't match expected patterns
- Not on a feature/bugfix/task branch

**Solutions**:
- Use standard branch naming: `feature/{task-id}-description`
- Manually create: `mkdir -p memory-bank/tasks/{task-id}`
- Use templates from memory-bank-task-templates.md

### Context Conflicts

**Symptom**: Multiple developers updating same context files

**Causes**:
- Concurrent updates to shared context
- Improper context isolation

**Solutions**:
- Coordinate shared context updates through team communication
- Use task context for task-specific work
- Resolve conflicts by documenting in decisionLog.md

### Stale Context

**Symptom**: Context doesn't reflect current work state

**Causes**:
- Infrequent updates to context files
- Forgetting to commit context changes

**Solutions**:
- Update progress.md after each significant work item
- Commit context updates at least daily
- Set up reminders or hooks for context updates

## Migration from Single-Tier

### Scenario

Existing project with single-tier memory bank needs to migrate to multi-task structure.

### Step 1: Backup Existing Memory Bank

**Command**: `cp -r memory-bank memory-bank.backup`

**Note**: Safety measure in case migration needs to be rolled back

### Step 2: Create Task Directory Structure

**Commands**:
```bash
mkdir -p memory-bank/tasks
touch memory-bank/tasks/.gitkeep
```

### Step 3: Identify Task-Specific Content

**Actions**:
- Review existing memory bank files
- Identify content that's project-wide (keep at root)
- Identify content that's task-specific (move to tasks/)

### Step 4: Migrate Task-Specific Content

**Actions**:
- Create task directories for active work
- Move task-specific content to appropriate task contexts
- Update references and links

### Step 5: Create Shared Context Files

**Actions**:
- Create activeContext.md to track all active tasks
- Create progress.md for overall project tracking
- Ensure productContext.md, systemPatterns.md, decisionLog.md exist

### Step 6: Update Team Documentation

**Actions**:
- Document the new structure in memory-bank/README.md
- Train team on new workflow
- Update any automation or scripts

### Step 7: Commit Migration

**Commands**:
```bash
git add memory-bank/
git commit -m "Migrate to multi-task memory bank structure"
```

**Note**: Remove backup after confirming migration success

## Team Lead Responsibilities

### Initial Setup

- Create and initialize shared context
- Document project architecture and patterns
- Set up directory structure
- Train team on memory bank usage

### Ongoing Maintenance

- Review and approve promotions to shared context
- Ensure shared context stays focused and valuable
- Resolve conflicts in shared context updates
- Monitor context quality and usage

### Quality Assurance

- Ensure task contexts are properly isolated
- Verify decisions are documented appropriately
- Check that handoffs are properly documented
- Maintain consistency across contexts

## Success Metrics

### Context Coverage

**Measure**: Percentage of active tasks with task contexts

**Target**: 100% of active tasks have initialized contexts

### Update Frequency

**Measure**: How often contexts are updated

**Target**: At least daily updates to active contexts

### Handoff Quality

**Measure**: Completeness of handoff documentation

**Target**: All handoffs documented with sufficient detail

### Shared Knowledge Growth

**Measure**: Regular additions to shared context

**Target**: Steady growth of systemPatterns.md and decisionLog.md

### Context Isolation

**Measure**: Absence of cross-task context references

**Target**: Zero direct references between task contexts