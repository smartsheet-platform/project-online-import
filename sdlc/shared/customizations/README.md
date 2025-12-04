# Mode Customizations

This directory contains project-specific customizations for each SDLC mode. These customizations extend or override the default behavior defined in the template rules and will **NEVER be overwritten** by `setup-sdlc.sh` updates.

## Purpose

The customization files allow you to tailor each mode's behavior to your project's specific needs without modifying the core SDLC template. This ensures:

- **Update Safety**: Your customizations are preserved during SDLC template updates
- **Better Maintainability**: Markdown format is easier to read and edit than XML
- **Clear Separation**: Project-specific rules are separated from template rules
- **Ultra-DRY Compliance**: Follows the same DRY principles as the rest of the SDLC system

## Available Customization Files

Each mode has its own customization file:

| Mode | Customization File | Purpose |
|------|-------------------|---------|
| **API Client Code** | [`api-client-code-customizations.md`](./api-client-code-customizations.md) | Custom API client patterns, authentication, error handling |
| **Architect** | [`architect-customizations.md`](./architect-customizations.md) | Custom document types, planning workflows, architectural patterns |
| **Code** | [`code-customizations.md`](./code-customizations.md) | Coding standards, testing requirements, code generation patterns |
| **Dev Env** | [`dev-env-customizations.md`](./dev-env-customizations.md) | Environment setup steps, tool configurations, troubleshooting |
| **MR Actions** | [`mr-actions-customizations.md`](./mr-actions-customizations.md) | MR feedback rules, code review standards, Git workflows |
| **Orchestrator** | [`orchestrator-customizations.md`](./orchestrator-customizations.md) | Workflow orchestration, task breakdown, quality gates |
| **Spec** | [`spec-customizations.md`](./spec-customizations.md) | Specification templates, documentation standards, validation rules |

## How It Works

### For Roo (Windsurf)

The XML files in [`sdlc/.roo/rules-*/99_target_repo_customizations.xml`](../../.roo/) now reference these markdown files:

```xml
<customization_reference>
  <location>../../shared/customizations/{mode}-customizations.md</location>
  <description>Project-specific customizations...</description>
</customization_reference>
```

Roo reads these XML files which point to the markdown customizations.

### For Claude (VS Code)

The agent files in [`sdlc/.claude/agents/`](../../.claude/agents/) include a "Project-Specific Customizations" section that references these files:

```markdown
## Project-Specific Customizations

Project-specific customizations and overrides for this mode are defined in:
- [mode-customizations.md](../../sdlc/shared/customizations/mode-customizations.md)
```

Claude agents read these references and apply the customizations.

## When to Add Customizations

Add customizations to these files when you need:

- **Project-specific rules** that don't apply to other projects
- **Team-specific workflows** unique to your organization
- **Custom integrations** with your team's tools
- **Override default behavior** for your project's needs

## Ultra-DRY Guidelines

**Before adding customizations**, check if the pattern already exists in:

- [`sdlc/shared/`](../) - Shared patterns and workflows
- [`sdlc/shared/universal/`](../universal/) - Universal rules for all modes

**Decision Tree**:

1. **Does the pattern exist in shared files?** → Reference it in a comment
2. **Is it new AND applies to multiple modes?** → Extract to [`sdlc/shared/`](../)
3. **Is it truly project-specific?** → Add inline content to the customization file

## Example Customization

Here's an example of adding a custom testing requirement to [`code-customizations.md`](./code-customizations.md):

```markdown
## Testing Standards

All API endpoints must have integration tests:

**Framework**: pytest with custom fixtures in `tests/conftest.py`
**Coverage Threshold**: 90% minimum
**Test Structure**:
```python
def test_endpoint_name_scenario():
    # Arrange
    setup_test_data()
    
    # Act
    response = client.post('/api/endpoint', json=payload)
    
    # Assert
    assert response.status_code == 200
    assert response.json()['field'] == expected_value
```

Run tests before committing: `pytest tests/ --cov=src --cov-report=term-missing`
```

## Migration from XML

Previously, customizations were added directly to the XML files in [`sdlc/.roo/rules-*/99_target_repo_customizations.xml`](../../.roo/). These have been refactored to:

1. **XML files** now contain only references to markdown files
2. **Markdown files** contain the actual customization content
3. **Both Roo and Claude** can access the customizations through their respective mechanisms

This provides better:
- **Readability**: Markdown is easier to read than XML
- **Maintainability**: Easier to edit and update
- **Consistency**: Same format as other SDLC documentation
- **Flexibility**: Can include code examples, tables, and rich formatting

## Best Practices

1. **Keep it DRY**: Reference shared patterns instead of duplicating
2. **Be Specific**: Add only project-specific customizations
3. **Document Well**: Include clear examples and explanations
4. **Test Changes**: Verify customizations work with both Roo and Claude
5. **Version Control**: Commit customizations to your project repository

## Support

For questions or issues with customizations:

1. Check the mode's main documentation in [`sdlc/shared/`](../)
2. Review examples in the customization files
3. Consult the SDLC template documentation
4. Ask your team's SDLC administrator

## Update Safety

**GUARANTEED**: These customization files will **NEVER** be overwritten by:
- `setup-sdlc.sh` updates
- SDLC template version upgrades
- Any automated SDLC maintenance scripts

Your customizations are safe and will persist across all updates.