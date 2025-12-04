# Ultra-DRY Architecture: Shared Documentation System

## Overview

The SDLCTemplate implements an **Ultra-DRY (Don't Repeat Yourself) architecture** where documentation is written once and referenced by both Roo (XML-based modes) and Claude Code (task-based agents). This eliminates duplication and ensures consistency across both tool implementations.

## Architecture Principles

### Single Source of Truth

All shared documentation lives in `sdlc/shared/` directory:

```
sdlc/shared/
├── orchestrator-role-definition.md
├── implementer-role-definition.md
├── spec-writer-role-definition.md
├── architect-role-definition.md
├── mr-processor-role-definition.md
├── api-client-role-definition.md
├── jira-workflow-patterns.md
├── jira-status-updates.md
├── git-integration-patterns.md
├── env-setup-workflow.md
└── [30+ additional shared files]
```

### Dual Tool Support

Both tools reference the same markdown files:

**Roo XML Rules** (`sdlc/.roo/rules-*/`):
```xml
<rule>
  <reference>See sdlc/shared/implementer-code-guidance.md</reference>
  <integration>Follows patterns in sdlc/shared/jira-workflow-patterns.md</integration>
</rule>
```

**Claude Code Agents** (`sdlc/.claude/agents/`):
```markdown
# Implementer Agent

## Role Definition
{{sdlc/shared/implementer-role-definition.md}}

## Code Guidance
{{sdlc/shared/implementer-code-guidance.md}}
```

## Benefits

### Maintenance Efficiency

- **Update Once, Apply Everywhere**: Changes to shared documentation automatically apply to both Roo and Claude Code
- **Reduced File Sizes**: XML rules reduced by 60-80% by referencing shared docs instead of embedding content
- **Consistency Guaranteed**: Both tools always use identical documentation

### Developer Experience

- **Tool Choice Freedom**: Developers can switch between Roo and Claude Code without learning different workflows
- **Unified Documentation**: Single set of docs to learn and reference
- **Seamless Transitions**: Moving between tools requires no workflow changes

## Implementation Details

### Shared Documentation Categories

1. **Role Definitions** - What each mode/agent does
   - `orchestrator-role-definition.md`
   - `implementer-role-definition.md`
   - `spec-writer-role-definition.md`
   - `architect-role-definition.md`
   - `mr-processor-role-definition.md`
   - `api-client-role-definition.md`
   - `env-troubleshooter-role-definition.md`

2. **Workflow Patterns** - How to execute tasks
   - `jira-workflow-patterns.md`
   - `jira-status-updates.md`
   - `git-integration-patterns.md`
   - `mr-feedback-workflow.md`

3. **Technical Guidance** - Implementation details
   - `implementer-code-guidance.md`
   - `implementer-targeted-implementation.md`
   - `spec-writer-documentation-patterns.md`
   - `api-client-generation-patterns.md`

4. **Integration Patterns** - External system integration
   - `jira-integration-guide.md`
   - `git-workflow-guide.md`
   - `mcp-server-integration.md`

### Mode-Agent Mapping

| Roo Mode | Claude Agent | Shared Docs Location |
|----------|--------------|---------------------|
| `orchestrator` | general-purpose | `sdlc/shared/orchestrator-*.md` |
| `code` | implementer | `sdlc/shared/implementer-*.md` |
| `spec` | spec-writer | `sdlc/shared/spec-*.md` |
| `architect` | architect | `sdlc/shared/architect-*.md` |
| `mr-actions` | mr-processor | `sdlc/shared/mr-*.md` |
| `api-client-code` | api-client-specialist | `sdlc/shared/api-client-*.md` |
| `dev-env` | env-troubleshooter | `sdlc/shared/env-*.md` |

## Adding New Shared Documentation

When creating new shared documentation:

1. **Create in `sdlc/shared/`** - Never duplicate content
2. **Use descriptive names** - `{role}-{purpose}.md` pattern
3. **Reference from both tools**:
   - Add XML reference in `sdlc/.roo/rules-{mode}/`
   - Add template reference in `sdlc/.claude/agents/{agent}.md`
4. **Test both tools** - Verify both Roo and Claude Code can access

## Migration from Embedded Documentation

The project migrated from embedded documentation (content in XML/agent files) to shared documentation:

**Before** (Embedded):
```xml
<rule>
  <description>
    Long documentation embedded directly in XML...
    [500+ lines of content]
  </description>
</rule>
```

**After** (Shared):
```xml
<rule>
  <reference>See sdlc/shared/implementer-code-guidance.md</reference>
</rule>
```

**Result**: 60-80% reduction in XML file sizes, single source of truth for documentation.

## Best Practices

### For Documentation Authors

1. **Write Once** - Create documentation in `sdlc/shared/` only
2. **Be Tool-Agnostic** - Don't reference tool-specific features
3. **Use Clear Headings** - Enable easy navigation and reference
4. **Include Examples** - Show both Roo and Claude Code usage when relevant

### For Tool Implementers

1. **Reference, Don't Copy** - Always reference shared docs
2. **Preserve Context** - Provide enough context for the reference to make sense
3. **Test Both Paths** - Verify Roo XML and Claude agent references work
4. **Update Shared Docs** - When changing behavior, update shared documentation

## Troubleshooting

### Documentation Not Found

**Problem**: Tool can't find referenced shared documentation

**Solution**:
1. Verify file exists in `sdlc/shared/`
2. Check file path is relative to project root
3. Ensure file has `.md` extension

### Inconsistent Behavior Between Tools

**Problem**: Roo and Claude Code behave differently

**Solution**:
1. Check both tools reference the same shared documentation
2. Verify no tool-specific overrides exist
3. Update shared documentation to clarify expected behavior

### Documentation Out of Sync

**Problem**: Changes to one tool not reflected in the other

**Solution**:
1. Ensure changes were made to shared documentation, not tool-specific files
2. Verify both tools reference the updated shared documentation
3. Clear any caches and restart tools


## Real-World Examples

### Bootstrap Command

The `/bootstrap` command demonstrates the Ultra-DRY pattern:

**Shared Source** (`sdlc/shared/commands/bootstrap.md`):
- Single 193-line markdown file
- Contains complete bootstrap command documentation
- Defines behavior, output locations, and quality standards

**Roo Reference** (`.roo/commands/bootstrap.md`):
```markdown
{{sdlc/shared/commands/bootstrap.md}}
```

**Claude Reference** (`.claude/commands/bootstrap.md`):
```markdown
{{sdlc/shared/commands/bootstrap.md}}
```

**Result**:
- ✅ 96% reduction in duplication (387 lines → 207 lines)
- ✅ Identical behavior across both tools
- ✅ Single source of truth for maintenance
- ✅ Consistent output to `sdlc/docs/` directory

### Mode/Agent Role Definitions

All SDLC modes and agents share role definitions:

**Shared Source** (`sdlc/shared/implementer-role-definition.md`):
- Defines implementer responsibilities and workflow
- Referenced by both Roo Code mode and Claude Code agent

**Roo Mode** (`.roo/rules-code/`):
```xml
<reference>../../sdlc/shared/implementer-role-definition.md</reference>
```

**Claude Agent** (`.claude/agents/code.md`):
```markdown
{{sdlc/shared/implementer-role-definition.md}}
```

## Future Enhancements

- **Automated Validation**: Scripts to verify all references resolve correctly
- **Documentation Linting**: Ensure shared docs follow consistent format
- **Usage Analytics**: Track which shared docs are most referenced
- **Version Control**: Track documentation changes and their impact on both tools