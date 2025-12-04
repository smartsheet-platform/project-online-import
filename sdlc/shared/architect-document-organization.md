# Architect Document Organization

## Overview

Guidelines for organizing planning documents, maintaining clean separation between architecture and implementation, and coordinating with the memory bank system.

## Document Placement Rules

### Planning Documents
- **Location**: `sdlc/docs/plans/`
- **Purpose**: All architectural planning and task breakdown documents
- **File Naming Patterns**:
  - `{feature-name}-architecture-plan.md`
  - `{project-phase}-implementation-plan.md`
  - `{date}-{task-name}-breakdown.md`
- **Examples**:
  - `sdlc/docs/plans/user-authentication-architecture-plan.md`
  - `sdlc/docs/plans/api-integration-implementation-plan.md`
  - `sdlc/docs/plans/2025-10-16-database-migration-breakdown.md`

### Memory Bank Updates
- **Location**: Automatically determined by context detection
  - SDLC context: `sdlc/memory-bank/`
  - Main app context: `memory-bank/`
- **Files**:
  - `activeContext.md` - Current focus and immediate tasks
  - `systemPatterns.md` - Architectural patterns and standards
  - `decisionLog.md` - Key architectural decisions
- **Note**: Memory bank location automatically determined by context detection rules

### General Documentation
- **Location**: Root level or appropriate subdirectories
- **Examples**:
  - `README.md` - Project overview
  - `CONTRIBUTING.md` - Development guidelines

## Planning Document Workflow

### Step 1: Analyze Request
Determine if request involves architectural planning or task breakdown

### Step 2: Choose Document Location
**Decision Tree**:
1. Planning new features or architecture? → Create document in `sdlc/docs/plans/`
2. Updating project context or patterns? → Update appropriate memory-bank file
3. Otherwise → Use root level or appropriate subdirectory

### Step 3: Create Well-Structured Document
**Requirements**:
- Clear title indicating scope and purpose
- Date and context information
- Structured sections with proper markdown formatting
- Cross-references to related documents when appropriate

### Step 4: Update Cross-References
Update memory-bank files to reference new planning documents when appropriate

## Document Templates

### Architecture Plan Template
**Location**: `sdlc/docs/plans/{feature-name}-architecture-plan.md`

**Structure**:
```markdown
## Overview
## Requirements Analysis
## Proposed Architecture
## Implementation Phases
## Dependencies and Integration Points
## Risk Assessment
## Success Criteria
```

### Implementation Plan Template
**Location**: `sdlc/docs/plans/{project-phase}-implementation-plan.md`

**Structure**:
```markdown
## Objective
## Task Breakdown
## Resource Requirements
## Timeline and Milestones
## Quality Gates
## Handoff Criteria
```

### Task Breakdown Template
**Location**: `sdlc/docs/plans/{date}-{task-name}-breakdown.md`

**Structure**:
```markdown
## Task Overview
## Subtask Analysis
## Mode Assignment Recommendations
## Dependency Mapping
## Validation Steps
```

## File Organization Best Practices

### Clean Separation
- Never create planning documents in source code directories
- Use `sdlc/docs/plans/` for all architectural and implementation planning
- Keep memory-bank files focused on current context, not detailed plans

### Consistent Naming
- Include date in time-sensitive planning documents
- Use descriptive names that indicate scope and purpose
- Follow kebab-case for multi-word names

### Cross-Referencing
- Reference planning documents from memory-bank when relevant
- Link to architectural decisions from implementation plans
- Update `activeContext.md` when creating new planning documents

## Memory Bank Coordination

### When to Update
After creating planning documents or making architectural decisions

### How to Update
Use automatic context detection (memory bank location determined by context rules)

### Update Types

**Planning Reference** (`activeContext.md`):
```markdown
- [Date] - Created architecture plan: [link to document]
```

**Architectural Patterns** (`systemPatterns.md`):
```markdown
- [Date] - New architectural pattern: [pattern description]
```

**Decisions** (`decisionLog.md`):
```markdown
- [Date] - Decision: [summary with rationale and planning doc reference]
```

## Handoff Documentation

### For spec
- **Document Type**: Technical specifications derived from architectural plans
- **Location**: `sdlc/docs/specs/{feature-name}-technical-spec.md`
- **Focus**: Detailed technical requirements, API definitions, data models

### For code
- **Document Type**: Implementation guidelines and development standards
- **Location**: `sdlc/docs/plans/{feature-name}-implementation-guide.md`
- **Focus**: Coding patterns, file organization, testing requirements

### For Other Coordination
- **Document Type**: Project coordination and workflow plans
- **Location**: `sdlc/docs/plans/{project-name}-workflow-plan.md`
- **Focus**: Task sequencing, agent assignments, quality gates

## Quality Guidelines

### Document Completeness Checklist
- [ ] Clear objectives and success criteria defined
- [ ] All dependencies and integration points identified
- [ ] Risk assessment and mitigation strategies included
- [ ] Handoff criteria for subsequent phases specified

### Implementation Readiness Checklist
- [ ] Technical requirements clearly specified
- [ ] Architecture diagrams and data models included where appropriate
- [ ] Code organization and structure guidelines provided
- [ ] Testing approach and validation criteria defined