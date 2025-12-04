# Universal Agent Rules

## Overview

These rules apply to ALL Claude agents in this project. Every agent must follow these rules regardless of their specific role or expertise.

## Applies To

- ✅ ALL Claude Agents: code, spec, architect, mr-actions, api-client-code, dev-env
- ✅ All future agents created in this project

## Priority

**ABSOLUTE HIGHEST PRIORITY** - These rules override agent-specific instructions when there's a conflict.

---

## Core Universal Rules

These rules are defined in `sdlc/shared/universal/*.md` and apply to both Roo modes and Claude agents.

### Rule 1: Claude-Roo Parity Enforcement

**Reference**: [claude-roo-parity-enforcement.md](./universal/claude-roo-parity-enforcement.md)

**PRIORITY: ABSOLUTE HIGHEST**

When any shared documentation or pattern is updated, BOTH Roo modes and Claude agents must be updated in the same change. Follow 5-step mandatory workflow. Use commit message template with parity confirmation.

**NO EXCEPTIONS. THIS IS NON-NEGOTIABLE.**

### Rule 2: Memory Bank Segmentation

**Reference**: [memory-bank-segmentation.md](./universal/memory-bank-segmentation.md)

Use the correct memory bank based on work context:
- **SDLC Context**: `sdlc/memory-bank/` (Roo mode development, SDLC tooling)
- **Main App Context**: `memory-bank/` (application features, business logic)

**HARD STOP**: If required memory bank doesn't exist, REFUSE to proceed.

### Rule 3: SDLC Directory Enforcement

**Reference**: [sdlc-directory-enforcement.md](./universal/sdlc-directory-enforcement.md)

ALL development work must happen in `sdlc/` directory:
- Roo modes: Develop in `sdlc/.roo/`, deploy to root `.roo/`
- Claude agents: Develop in `sdlc/.claude/agents/`
- Shared docs: Create in `sdlc/shared/`
- Root directories: Read-only (deployed configs only)

**NEVER create or edit files in root `.roo/` or `.claude/` directories.**

### Rule 4: VSCode Settings Protection

**Reference**: [vscode-settings-protection.md](./universal/vscode-settings-protection.md)

NEVER edit `.vscode/settings.json` unless explicitly requested. Requires explicit user request like "edit .vscode/settings.json". Suggest alternatives: `.roo/mcp.json`, `.env`, tool-specific configs.

**STRICT ENFORCEMENT** - No exceptions without explicit request.

### Rule 5: Multi-Task Tenancy

**Reference**: [multi-task-tenancy.md](./universal/multi-task-tenancy.md)

Support multiple developers working concurrently with context isolation:
- **Tier 1**: Shared project context (`memory-bank/*.md`)
- **Tier 2**: Task-specific contexts (`memory-bank/tasks/{task-id}/`)
- Automatic task detection from git branches

**Note**: Only applies to main app `memory-bank/`, not `sdlc/memory-bank/`

### Rule 6: Atlassian MCP Server Creation

**Reference**: [atlassian-mcp-server-creation.md](./universal/atlassian-mcp-server-creation.md)

ALWAYS create Atlassian MCP server configuration in `.roo/mcp.json` (per-project) when Atlassian integration is requested. NEVER in `.vscode/settings.json`. No alternative approaches allowed.

Consult `sdlc/atlassian/` documentation for platform-specific setup patterns.

### Rule 7: Multi-Task Initialization Guide

**Reference**: [multi-task-initialization-guide.md](./universal/multi-task-initialization-guide.md)

Guide for properly initializing task contexts in multi-task tenancy system.

### Rule 8: Memory Bank Task Templates

**Reference**: [memory-bank-task-templates.md](./universal/memory-bank-task-templates.md)

Standard templates and structure for task-specific memory bank entries.

### Rule 9: Atlassian Documentation Reference

**Reference**: [atlassian-documentation-reference.md](./universal/atlassian-documentation-reference.md)

Guidelines for referencing and updating Atlassian MCP documentation.

---

## Agent Behavior Guidelines

These rules define how agents should behave and interact.

### Rule 10: Ultra-DRY Principle

**NEVER duplicate documentation**. Always reference shared docs instead of copying content.

**✅ Correct**:
```markdown
Complete workflow defined in:
- [jira-user-identification.md](./jira-user-identification.md)
```

**❌ Wrong**: Copy/paste 100+ lines from shared doc into agent file.

### Rule 11: Delegation Patterns

Agents must delegate work outside their scope:

**Environment Issues** → dev-env
```
Task(subagent_type="dev-env", ...)
```

**API Client Work** → api-client-code (for specification fidelity)

**Jira Operations** → general-purpose or orchestrator (for status updates, assignments, Story Points)

### Rule 12: Shared Documentation Pattern

When implementing common patterns, always use this format:

```markdown
## [Concept Name]

Complete [concept] workflow defined in:
- [filename.md](./filename.md)

[Optional: Agent-specific notes]
```

**Available Shared Documentation**:

- **Jira**: 7 files (project-key, user-identification, git-integration, workflow-patterns, jql-patterns, status-updates, orchestrator-delegation)
- **MR Processing**: 4 files (interactive-workflow, role-definition, scope-constraints, timestamp-logging)
- **Environment**: 2 files (env-setup-workflow, jira-mcp-troubleshooting)
- **Roles**: 8 files (code, spec, architect, api-client role definitions and patterns)

### Rule 13: Commit Message Standards

When changes affect multiple agents:

```
[Area] Description

Changes:
- Roo: [modes] - [changes]
- Claude: [agents] - [changes]
- Shared: [files] - [changes]

Parity: ✅ Both Roo and Claude updated
```

### Rule 14: Error Handling Philosophy

Fail gracefully but informatively:

1. Detect the problem clearly
2. Inform user what went wrong
3. Suggest concrete next steps
4. Continue with degraded functionality if possible

### Rule 15: Context Preservation

When delegating, provide complete context:
- What you were trying to do
- What error/issue occurred
- Relevant file paths and commands
- Expected vs actual behavior

### Rule 16: Security Practices

ALL agents must:
- Never log or expose secrets, API keys, or tokens
- Never commit credentials to repositories
- Validate and sanitize user inputs
- Follow least-privilege principles
- Document security considerations

### Rule 17: Testing Requirements

Before marking work complete:
- Run relevant tests if test commands are known
- If tests fail, fix them before completion
- If test commands unknown, ask user
- Document how to test the changes

---

## Enforcement

These rules are **MANDATORY** and **NON-NEGOTIABLE**.

Violating these rules:
- Creates inconsistency across the system
- Breaks parity between Roo and Claude
- Makes maintenance harder
- Confuses users

**When in doubt**: Reference a shared doc rather than duplicating content.

---

## Adding New Universal Rules

To add a new universal rule:

1. Create the rule in `sdlc/shared/universal/{rule-name}.md` (shared markdown)
2. Create thin XML wrapper in `sdlc/.roo/universal-rules/{rule-name}.xml` that references the markdown
3. Add numbered rule to this file under "Core Universal Rules"
4. Commit shared markdown, Roo XML wrapper, and this file together
5. Both Roo and Claude now reference the same shared markdown

**Pattern**: One shared markdown file, referenced by both Roo XML and Claude agents.

---

## Quick Reference

**Universal Rules (shared/universal/)**: 9 rules covering parity, memory banks, directories, VSCode, multi-task, Atlassian

**Agent Behavior Guidelines**: 8 rules covering DRY, delegation, documentation, commits, errors, context, security, testing

**Total**: 17 mandatory rules for ALL agents