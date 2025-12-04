# SDLC Directory Enforcement

## Overview

Critical enforcement rules for SDLC directory usage to maintain separation between development work and deployed configurations. This applies to BOTH Roo modes and Claude agents.

## Applies To

- ✅ Roo Modes: ALL modes
- ✅ Claude Agents: ALL agents

## Priority

**ABSOLUTE** - This separation is fundamental to the segmented architecture and prevents context confusion between development work and production deployments.

## Core Principles

### Principle 1: SDLC Development Isolation

**Description**: All development work (Roo modes, Claude agents, shared docs) must happen in `sdlc/` directory

**Rationale**:
- Keeps SDLC tooling development separate from main application work
- Prevents accidental modification of deployed production configs
- Maintains clean separation between development and deployment contexts
- Supports the segmented memory bank architecture

### Principle 2: Production Config Protection

**Description**: Root `.roo/` and `.claude/` directories contain only deployed/production configurations

**Rationale**:
- Root directories represent the "production" state of custom modes and agents
- Changes to root should only happen through controlled deployment processes
- Direct editing corrupts the deployment model and version control

### Principle 3: Context Boundary Enforcement

**Description**: Directory structure enforces logical separation of concerns

**Rationale**:
- `sdlc/.roo/` = Development workspace for Roo modes
- `sdlc/.claude/` = Development workspace for Claude agents
- `sdlc/shared/` = Shared documentation for both systems
- Root `.roo/` = Deployed Roo mode configurations
- Root `.claude/` = Deployed Claude agent configurations (if applicable)
- This mirrors the segmented memory bank approach (`sdlc/memory-bank/` vs `memory-bank/`)

## Directory Usage Rules

### Roo Mode Development

**✅ ALLOWED**:
- Create/edit files in `sdlc/.roo/rules-{mode-name}/`
- Create/edit files in `sdlc/.roo/universal-rules/`
- Reference shared docs from `sdlc/shared/`
- All mode development, creation, and iteration

**❌ STRICTLY FORBIDDEN**:
- Create/edit files in root `.roo/` directory
- Modify deployed mode configurations directly
- Create new modes in root `.roo/`
- Edit existing mode rules in root `.roo/`

**Examples**:

**✅ Correct**:
```
sdlc/.roo/rules-orchestrator/1_jira_workflow.xml
sdlc/.roo/rules-code/4_jira_orchestrator_delegation.xml
sdlc/.roo/universal-rules/claude-roo-parity-enforcement.xml
```

**❌ Wrong**:
```
.roo/rules-orchestrator/new-feature.xml     ← Root directory forbidden
.roo/universal-rules/new-rule.xml           ← Root directory forbidden
```

### Claude Agent Development

**✅ ALLOWED**:
- Create/edit files in `sdlc/.claude/agents/`
- Reference shared docs from `sdlc/shared/`
- All agent development, creation, and iteration

**❌ STRICTLY FORBIDDEN**:
- Create/edit files in root `.claude/` directory (if it exists)
- Modify deployed agent configurations directly
- Mix agent development with Roo mode development

**Examples**:

**✅ Correct**:
```
sdlc/.claude/agents/code.md
sdlc/.claude/agents/spec.md
sdlc/.claude/agents/architect.md
```

**❌ Wrong**:
```
.claude/agents/new-agent.md     ← Root directory forbidden (if exists)
```

### Shared Documentation

**✅ ALLOWED**:
- Create/edit files in `sdlc/shared/`
- Create/edit files in `sdlc/shared/universal/`
- Reference from both Roo XML and Claude agent files
- All shared pattern documentation

**Examples**:

**✅ Correct**:
```
sdlc/shared/jira-project-key-workflow.md
sdlc/shared/universal/claude-roo-parity-enforcement.md
sdlc/shared/mr-interactive-workflow.md
```

## Development Workflow

### Creating New Roo Mode

1. Create directory: `sdlc/.roo/rules-{mode-name}/`
2. Add mode-specific XML files with references to shared docs
3. Create shared docs if needed in `sdlc/shared/`
4. Update `sdlc/.roomodes` to register the mode
5. **Never** create anything in root `.roo/`

### Creating New Claude Agent

1. Create file: `sdlc/.claude/agents/{agent-name}.md`
2. Add universal agent rules reference at top
3. Reference shared docs for common patterns
4. Add agent-specific sections as needed
5. **Never** create anything in root `.claude/` (if it exists)

### Creating Shared Documentation

1. Identify if it's universal (applies to ALL) or pattern-specific
2. If universal: `sdlc/shared/universal/{name}.md`
3. If pattern-specific: `sdlc/shared/{name}.md`
4. Reference from both Roo XML and Claude agents
5. Follow ultra-DRY principle

## Deployment Process

### Roo Modes

When ready to deploy modes to production:
1. Copy/deploy from `sdlc/.roo/` to root `.roo/`
2. Use controlled deployment scripts
3. Test deployed modes
4. Never manually edit root `.roo/` files

### Claude Agents

Claude agents typically don't have separate deployment - they're used directly from `sdlc/.claude/agents/`.

If deployment is needed:
1. Use controlled deployment process
2. Never manually edit deployed configs

## Forbidden Actions

### ❌ Never Do This (Roo)

1. **Create modes in root `.roo/`**:
   ```bash
   # WRONG
   touch .roo/rules-mymode/1_workflow.xml
   ```

2. **Edit deployed configs directly**:
   ```bash
   # WRONG
   vim .roo/rules-orchestrator/1_smartsheet_workflow.xml
   ```

3. **Mix development and deployment**:
   ```bash
   # WRONG - developing in root
   echo "new content" > .roo/universal-rules/new-rule.xml
   ```

### ❌ Never Do This (Claude)

1. **Create agents in wrong location**:
   ```bash
   # WRONG
   touch .claude/agents/new-agent.md
   ```

2. **Skip sdlc/ directory**:
   ```bash
   # WRONG
   vim .claude/agents/code.md
   ```

### ❌ Never Do This (Shared Docs)

1. **Create shared docs outside sdlc/**:
   ```bash
   # WRONG
   touch shared/jira-workflow.md
   ```

2. **Duplicate instead of reference**:
   ```markdown
   # WRONG - duplicating content in agent file
   ## Jira Workflow
   [500 lines of duplicated content]
   ```

## Correct Actions

### ✅ Always Do This (Roo)

1. **Develop in sdlc/.roo/**:
   ```bash
   # CORRECT
   touch sdlc/.roo/rules-mymode/1_workflow.xml
   ```

2. **Reference shared docs**:
   ```xml
   <reference>../../sdlc/shared/jira-workflow-patterns.md</reference>
   ```

3. **Use deployment scripts**:
   ```bash
   # CORRECT
   ./deploy-modes.sh
   ```

### ✅ Always Do This (Claude)

1. **Develop in sdlc/.claude/**:
   ```bash
   # CORRECT
   touch sdlc/.claude/agents/new-agent.md
   ```

2. **Reference shared docs**:
   ```markdown
   Complete workflow defined in:
   - [jira-workflow-patterns.md](../jira-workflow-patterns.md)
   ```

3. **Include universal rules**:
   ```markdown
   ## Universal Agent Rules

   **ALL agents must follow these universal rules** (ABSOLUTE HIGHEST PRIORITY):
   - [universal-agent-rules.md](../universal-agent-rules.md)
   ```

### ✅ Always Do This (Shared Docs)

1. **Create in sdlc/shared/**:
   ```bash
   # CORRECT
   touch sdlc/shared/new-pattern.md
   ```

2. **Reference from both systems**:
   - Roo: `<reference>../../sdlc/shared/new-pattern.md</reference>`
   - Claude: `- [new-pattern.md](../new-pattern.md)`

## Error Prevention

### Before Creating Files

**Ask yourself**:
1. Am I creating in `sdlc/.roo/` or `sdlc/.claude/`? (✅ Correct)
2. Am I creating in root `.roo/` or `.claude/`? (❌ Wrong - STOP)
3. Am I duplicating shared docs? (❌ Wrong - reference instead)

### Before Editing Files

**Ask yourself**:
1. Am I editing in `sdlc/` directory? (✅ Correct)
2. Am I editing in root directory? (❌ Check if it's deployed config)
3. Should this be in shared docs instead? (Consider DRY principle)

## Migration from Old Structure

If you find content in root directories that should be in sdlc/:

1. **Don't edit root files directly**
2. **Copy content to sdlc/ location**
3. **Update through deployment process**
4. **Use version control properly**

## Combined Architecture View

```
project-root/
├── .roo/                      ← Deployed Roo mode configs (don't edit)
├── .claude/                   ← Deployed Claude configs (don't edit, if exists)
├── memory-bank/              ← Main app memory bank
└── sdlc/
    ├── .roo/                 ← Roo mode DEVELOPMENT (edit here)
    │   ├── rules-code/
    │   ├── rules-spec/
    │   └── universal-rules/
    ├── .claude/              ← Claude agent DEVELOPMENT (edit here)
    │   └── agents/
    ├── shared/               ← Shared docs (edit here)
    │   ├── universal/        ← Universal rules for both systems
    │   ├── jira-*.md
    │   ├── mr-*.md
    │   └── ...
    └── memory-bank/          ← SDLC memory bank
```

## Success Criteria

**✅ Correct structure**:
- All Roo mode development in `sdlc/.roo/`
- All Claude agent development in `sdlc/.claude/`
- All shared docs in `sdlc/shared/`
- Root directories only for deployed configs

**❌ Failure indicators**:
- Creating files in root `.roo/` or `.claude/`
- Editing deployed configs directly
- Duplicating shared documentation
- Missing universal rules references

## Why This Matters

**Violating these rules**:
- Corrupts the SDLC separation principle
- Mixes development and deployment contexts
- Makes version control confusing
- Breaks the segmented architecture
- Causes parity issues between Roo and Claude

**Following these rules**:
- Clean separation of concerns
- Clear development workflow
- Proper version control
- Easy deployment process
- Maintainable architecture