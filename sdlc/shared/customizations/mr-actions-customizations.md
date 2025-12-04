# MR Actions Mode Customizations

## Purpose

This file contains project-specific customizations for the MR Actions mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom MR feedback processing rules
- Project-specific code review standards
- Custom Git workflow patterns
- Integration with your team's code review tools
- Additional MR validation requirements

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/mr-creation-workflow.md`
- `../../shared/mr-interactive-workflow.md`
- `../../shared/mr-processor-role-definition.md`
- `../../shared/mr-scope-constraints.md`
- `../../shared/git-integration-patterns.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom MR Actions mode rules below this line -->



<!-- Example: Custom MR requirement
## Changelog Update Requirement

All MRs must include CHANGELOG.md updates:

**Location**: `CHANGELOG.md` in project root
**Format**: Follow Keep a Changelog format
**Required Sections**:
- `## [Unreleased]` - Add changes here
- Include type: Added, Changed, Deprecated, Removed, Fixed, Security

**Example**:
```markdown
## [Unreleased]
### Added
- New API endpoint for user preferences [PROJ-123]

### Fixed
- Database connection timeout issue [PROJ-124]
```

**Blocking**: Yes - MR cannot be merged without changelog update
**Validation**: CI pipeline checks for changelog entry
-->

<!-- Example: Custom code review standard
## Code Review Checklist

Before submitting MR for review, verify:

**Security**:
- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)

**Performance**:
- [ ] Database queries optimized (no N+1 queries)
- [ ] Caching implemented where appropriate
- [ ] Large file uploads handled asynchronously

**Testing**:
- [ ] Unit tests for new functions (90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Manual testing completed in staging environment

**Documentation**:
- [ ] API documentation updated (OpenAPI/Swagger)
- [ ] README updated if setup process changed
- [ ] Inline comments for complex logic
-->

<!-- Example: Custom Git workflow
## Branch Naming Convention

All branches must follow this pattern:
- Feature: `feature/PROJ-123-short-description`
- Bugfix: `bugfix/PROJ-123-short-description`
- Hotfix: `hotfix/PROJ-123-short-description`

**Commit Messages**:
- Format: `[PROJ-123] Brief description`
- First line: 50 chars max
- Body: Wrap at 72 chars, explain what and why

**Example**:
```
[PROJ-123] Add user preference API endpoint

Implements new REST API endpoint for managing user preferences.
Includes validation, error handling, and database migrations.

Closes PROJ-123
```
-->