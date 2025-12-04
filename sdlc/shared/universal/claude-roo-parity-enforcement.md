# Claude-Roo Parity Enforcement

## Critical Rule

**PRIORITY: ABSOLUTE HIGHEST**

**MANDATORY**: When updating ANY Roo mode rule, you MUST immediately update the corresponding Claude agent.
When updating ANY Claude agent, you MUST immediately update the corresponding Roo mode.

**NO EXCEPTIONS. THIS IS NON-NEGOTIABLE.**

## Overview

Roo modes and Claude agents are TWO IMPLEMENTATIONS of the same system. They MUST be kept in perfect parity at all times.

Failing to maintain parity creates:
- Inconsistent behavior between Roo and Claude
- Confusion for users
- Bugs that only appear in one system
- Maintenance nightmares

## Applies To

- ✅ Roo Modes: ALL modes in `sdlc/.roo/rules-*/`
- ✅ Claude Agents: ALL agents in `sdlc/.claude/agents/`

## Mode-Agent Mapping

| Roo Mode | Claude Agent | Shared Docs |
|----------|--------------|-------------|
| `rules-orchestrator/` | `orchestrator.md` | `orchestrator-*.md` |
| `rules-code/` | `code.md` | `implementer-*.md` |
| `rules-spec/` | `spec.md` | `spec-*.md` |
| `rules-architect/` | `architect.md` | `architect-*.md` |
| `rules-mr-actions/` | `mr-actions.md` | `mr-*.md` |
| `rules-api-client-code/` | `api-client-code.md` | `api-client-*.md` |
| `rules-dev-env/` | `dev-env.md` | `env-*.md` |

## Mandatory Workflow

### Step 1: Identify Mode/Agent
Check the mode_agent_mapping above to find corresponding implementation.

### Step 2: Update Roo Mode
Update the Roo mode XML file OR create/update shared .md file.
**Requirement**: If creating shared .md file, reference it from XML.

### Step 3: IMMEDIATELY Update Claude Agent
**MUST happen in the SAME commit/change.**
Add reference to the same shared .md file.

### Step 4: Verify Parity
Check that both Roo and Claude reference the same shared docs.
Paths must match and content must be identical.

### Step 5: Test
Same inputs should produce same outputs in both systems.

## Shared Documentation Strategy

### Principle
Shared documentation (.md files) is the SINGLE SOURCE OF TRUTH.
Both Roo XML files and Claude agent files MUST reference the same shared docs.

### Location
`sdlc/shared/*.md` - All shared documentation lives here

### Reference Pattern

**Roo XML**:
```xml
<reference>../../sdlc/shared/[pattern]-[topic].md</reference>
```

**Claude Agent**:
```markdown
[Pattern description] defined in:
- [filename.md](../filename.md)
```

## Enforcement Checklist

Before committing ANY change, ask yourself:

1. **Did I update a Roo mode rule?**
   - If YES: Did I update the corresponding Claude agent? (REQUIRED)

2. **Did I update a Claude agent?**
   - If YES: Did I update the corresponding Roo mode? (REQUIRED)

3. **Did I create a new shared .md file?**
   - If YES: Is it referenced from BOTH Roo XML and Claude agent? (REQUIRED)

4. **Did I update an existing shared .md file?**
   - If YES: Are the references still correct in both Roo and Claude? (VERIFY)

5. **Would this change cause different behavior between Roo and Claude?**
   - If YES: FIX IT before committing. Behavior MUST be identical. (CRITICAL)

## Example: Adding Jira Delegation

### ❌ Wrong Approach
1. Update `sdlc/.roo/rules-code/4_jira_orchestrator_delegation.xml`
2. Create `sdlc/shared/jira-orchestrator-delegation-pattern.md`
3. Commit and move on

**Problem**: Forgot to update `code.md` - Claude agent now out of sync!

### ✅ Correct Approach
1. Create `sdlc/shared/jira-orchestrator-delegation-pattern.md` (shared doc)
2. Update `sdlc/.roo/rules-code/4_jira_orchestrator_delegation.xml` to reference it
3. Update `sdlc/.claude/agents/code.md` to reference the SAME shared doc
4. Verify both reference the same path
5. Commit together

**Result**: Roo and Claude now perfectly in sync

## Commit Message Template

```
[Area] Description of change

Changes:
- Roo: [mode] - [what changed]
- Claude: [agent] - [what changed]
- Shared: [shared file] - [what changed]

Parity: ✅ Roo and Claude both updated
```

### Example
```
Jira: Add orchestrator delegation pattern

Changes:
- Roo: Code/Spec/Architect modes - reference delegation pattern
- Claude: code/spec/architect - reference delegation pattern
- Shared: jira-orchestrator-delegation-pattern.md - created

Parity: ✅ Roo and Claude both updated
```

## Failure Consequences

- User switches from Roo to Claude - different behavior confuses them
- Bug reported in Claude that doesn't exist in Roo (or vice versa)
- Documentation diverges - users don't know which to trust
- Future changes become harder as we lose track of what's in sync
- Maintenance nightmare - have to update everything twice retrospectively

## Success Criteria

1. Every commit that touches Roo also touches Claude (or explains why not)
2. Every commit that touches Claude also touches Roo (or explains why not)
3. Shared docs are always referenced from both systems
4. Users get identical behavior whether using Roo or Claude
5. Zero divergence between the two implementations

## Priority Statement

This rule has **ABSOLUTE HIGHEST PRIORITY**.

If you forget to update Claude when changing Roo (or vice versa):
- **STOP** the commit
- Go back and update both
- Only then proceed

**There is NO EXCEPTION to this rule.**

**PARITY IS MANDATORY.**