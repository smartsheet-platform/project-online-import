# Memory Bank Segmentation

## Applies To
- **Roo Modes**: ALL modes
- **Claude Agents**: ALL agents

## Overview
Critical instructions for proper memory bank directory detection and usage to maintain the segmented memory bank architecture. This prevents conflation between SDLC tooling context and main application context.

**NOTE**: This file works in conjunction with multi-task-tenancy which defines the two-tier structure (shared/task) within the main project memory bank.

## Memory Bank Directory Detection - ROOT LEVEL ONLY

### Critical Rule
When checking for project memory bank directories:

**CHECK FOR MEMORY BANK:**
* First, check if the memory-bank/ directory exists **AT ROOT LEVEL ONLY**.
* **CRITICAL**: If you find `sdlc/memory-bank/`, this is NOT the project memory bank - this is a segmented SDLC development tracking system. Do NOT treat it as the main memory bank.
* **SEGMENTATION RULE**: Only `memory-bank/` (root level) = Project implementation context. `sdlc/memory-bank/` = SDLC mode development context (separate system).

**Directory Check Process:**
1. Use list_files on root directory (path: ".")
2. Look specifically for `memory-bank/` in the root directory listing
3. **IGNORE** any `sdlc/memory-bank/` entries when checking for main memory bank
4. If memory-bank/ (root) EXISTS, use it for project implementation work
5. If memory-bank/ (root) does NOT exist, create it for project implementation work

## Segmentation Awareness

### Two Separate Systems

#### SDLC Memory Bank
- **Location**: `sdlc/memory-bank/`
- **Purpose**: SDLC tooling development tracking
- **Context**: Mode creation, SDLC enhancement, tooling development
- **When to Use**: When working on Roo modes, SDLC features, development tooling

#### Project Memory Bank
- **Location**: `memory-bank/` (root level)
- **Purpose**: Main project implementation tracking
- **Context**: Application features, business logic, user-facing development
- **When to Use**: When working on project features, application implementation

### Critical Distinction
- These are SEPARATE systems - never conflate them
- Finding `sdlc/memory-bank/` does NOT mean project memory bank exists
- Always check for root-level `memory-bank/` separately
- Context detection rules determine which system to use

## Proper Checking Workflow

### Step 1: Check Root Directory for Project Memory Bank
- **Action**: `list_files path="." recursive=false`
- **Evaluation**: Look ONLY for `memory-bank/` at root level
- **Ignore**: Ignore any `sdlc/` subdirectories in this check

### Step 2: Evaluate Project Memory Bank Status
- **If Exists**: `memory-bank/` found at root → Project memory bank exists
- **If Not Exists**: `memory-bank/` not found at root → Project memory bank needs creation
- **Note**: Presence of `sdlc/memory-bank/` is irrelevant to this determination

### Step 3: Apply Context Detection Rules
- **SDLC Work**: Use `sdlc/memory-bank/` (SDLC development context)
- **Project Work**: Use `memory-bank/` (project implementation context)
- **Automatic Selection**: Based on context detection rules in main configuration

## Anti-Patterns to Avoid

### Conflating Memory Banks
- **Wrong Thinking**: "I see `sdlc/memory-bank/`, so the project has a memory bank system"
- **Correct Thinking**: "I see `sdlc/memory-bank/` (SDLC system) but need to check separately for `memory-bank/` (project system)"

### Assuming Equivalence
- **Wrong Thinking**: "`sdlc/memory-bank/` and `memory-bank/` are the same thing"
- **Correct Thinking**: "These are separate systems: `sdlc/memory-bank/` for SDLC work, `memory-bank/` for project work"

### Ignoring Segmentation
- **Wrong Thinking**: "Just use whichever `memory-bank/` directory exists"
- **Correct Thinking**: "Use context detection rules to determine which memory bank system is appropriate for current work"

## Enforcement for All Modes

### Applies To
All modes that reference or use memory bank systems

### Mandatory Behavior
- Check for root-level `memory-bank/` directory separately from `sdlc/memory-bank/`
- Never conflate the two memory bank systems
- Apply context detection rules to determine appropriate system
- Maintain strict separation between SDLC and project contexts

## Multi-Task Integration

See multi-task-tenancy for detailed rules on the two-tier structure within the main project memory bank (`memory-bank/`):
- **Tier 1**: Shared project context (`memory-bank/*.md`)
- **Tier 2**: Task-specific context (`memory-bank/tasks/{task-id}/`)

### Combined Architecture

#### SDLC Memory Bank
- **Location**: `sdlc/memory-bank/`
- **Purpose**: SDLC tooling development tracking (single-tier)

#### Project Memory Bank
- **Location**: `memory-bank/`
- **Purpose**: Main project implementation tracking (two-tier for multi-task)
- **Structure**:
  - Tier 1: Shared context at root level
  - Tier 2: Task contexts in `tasks/` subdirectory