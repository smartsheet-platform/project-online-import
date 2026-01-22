<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🛠️ Contributing</h1>

[🎯 Migrating](../project/Project-Online-Migration-Overview.md) · [🏗️ How it Works](../project/ETL-System-Design.md) · 🛠️ Contributing

</div>

<div align="center">

[← Previous: Anti-Patterns](./anti-patterns.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Conventions →](./conventions.md)

</div>

---

> **📘 Contributor Documentation**
>
> This document is intended for developers and contributors working on the Project Online Import CLI. It describes the "Issue First" approach that ensures high-quality contributions and effective collaboration with AI coding agents.

# Issue First Approach for Project Online Import CLI

## What is "Issue First"?

The "Issue First" approach is a collaborative development methodology where **all contributions to the Project Online Import CLI must begin with a GitHub/GitLab Issue** before any code changes are made. This means that whether you're fixing a bug, adding a new feature, or improving documentation, you first create or identify an existing issue that describes what needs to be done.

## Why Issue First Matters for AI Coding Agents

With the integration of AI coding agents like **Claude Code** and **Roo Code Cloud Agents** in the Project Online Import CLI repository, the Issue First approach becomes even more critical. Here's why:

### 1. **Clear Communication with AI Agents**

AI coding agents (such as Claude Code and Roo Code Cloud Agents) are AI-powered assistants that can understand natural language and translate it into code changes. A well-written Issue serves as a **high-quality prompt** that gives the AI agent all the context it needs to:

- Understand the problem or feature request
- Identify which parts of the Project Online Import CLI codebase need to be modified
- Generate appropriate TypeScript code that follows the project's patterns and conventions
- Create comprehensive tests and documentation

### 2. **Structured Problem Definition**

Issues provide a structured format that helps both humans and AI agents understand:

- **What** needs to change (the goal)
- **Why** it needs to change (the motivation)
- **How** it should work (expected behavior)
- **Context** about the Project Online Import CLI codebase

### 3. **Trackable Progress**

Issues create a clear audit trail of:

- What work was requested
- Who is working on it (human or AI agent)
- The discussion and decisions made
- The resulting code changes via linked Pull Requests/Merge Requests

### 4. **Quality Control**

By requiring an issue first, we ensure that:

- The proposed change aligns with the CLI's goals and architecture
- Duplicate work is avoided
- The community can provide input before code is written
- AI agents have sufficient context to generate high-quality code

## How to Use Issue First with AI Coding Agents

This guide applies to both **Claude Code** and **Roo Code Cloud Agents**. Both AI agents benefit from well-structured issues that provide comprehensive context.

### Step 1: Create a Quality Issue

When creating an issue that will be used by an AI coding agent (Claude Code or Roo Code Cloud Agent), provide comprehensive details:

#### For Bug Reports

```markdown
**Description**: Clear description of the bug in the Project Online Import CLI

**Steps to Reproduce**:
1. Install the CLI: `npm install`
2. Run the specific command: `npm run dev -- import --source <url> --destination <id>`
3. Observe the error

**Expected Behavior**: What should happen when using the CLI

**Actual Behavior**: What actually happens

**Environment**:
- CLI Version: (e.g., 1.0.0)
- Node.js Version: (e.g., 18.0.0)
- npm Version: (e.g., 9.0.0)
- Operating System: (e.g., macOS 12.6)

**Code Sample** (if applicable):
```typescript
import { ProjectOnlineClient } from './lib/ProjectOnlineClient';
const client = new ProjectOnlineClient(config);
// Your code that demonstrates the issue
```

**Logs/Stack Trace**: Any relevant error messages or stack traces

**Additional Context**: Any relevant details about the Project Online API, Smartsheet API, or authentication issues
```

#### For Feature Requests

```markdown
**Feature Description**: Clear description of the new functionality needed in the Project Online Import CLI

**Use Case**: Why this feature is needed and how it will be used

**Proposed CLI Usage**:
```bash
# Example of how the feature would be used
npm run dev -- import --source <url> --destination <id> --new-option <value>
```

**Proposed API** (if applicable):
```typescript
// Example of how the feature would be implemented
interface NewFeatureConfig {
  option1: string;
  option2: boolean;
}

class NewTransformer implements Transformer {
  transform(data: ProjectOnlineData): SmartsheetData {
    // Implementation
  }
}
```

**Related APIs**: Links to relevant Project Online or Smartsheet API documentation

**Implementation Considerations**:
- Which CLI modules would be affected (e.g., `src/lib/importer.ts`, `src/transformers/`)
- Any dependencies or related features
- Impact on existing functionality
- Configuration changes needed (`.env` file updates)

**Alternatives Considered**: Other approaches that were considered

**Related Documentation**: Links to relevant docs in `sdlc/docs/`
```

#### For Documentation Improvements

```markdown
**Documentation Issue**: What documentation is missing, unclear, or incorrect

**Location**: Which file or section needs improvement (e.g., `README.md`, `sdlc/docs/project/CLI-Usage-Guide.md`)

**Suggested Improvement**: What should be added or changed

**Context**: Why this documentation is important for CLI users or developers

**Target Audience**: Who is this documentation for? (end users, developers, administrators)
```

### Step 2: Let the AI Agent Work

Once your issue is well-defined:

1. **The AI agent reads your issue** as its primary prompt
2. **It analyzes the Project Online Import CLI codebase** to understand:
   - Existing patterns and conventions (see [Conventions](./conventions.md))
   - Related code that may need updates
   - Test files that need modifications
   - Documentation that should be updated

3. **It generates the necessary changes**:
   - TypeScript code following the project's style
   - Unit tests using Jest
   - Integration tests if needed
   - Updated documentation
   - Appropriate error handling and logging

4. **It creates a Pull Request (or Merge Request)** linked to your issue with all the changes

### Step 3: Review and Iterate

After the AI agent creates a PR/MR:

1. Review the generated code for correctness and quality
2. Test the changes locally with both Project Online and Smartsheet APIs
3. Run the test suite: `npm test`
4. Verify code quality checks pass: `npm run typecheck && npm run lint && npm run format:check`
5. Provide feedback in the PR/MR comments
6. The AI agent can iterate based on your feedback
7. Once approved, the changes are merged

## Best Practices for Writing Issues

### Be Specific and Detailed

**Poor Issue**: "Fix the importer"

**Good Issue**: "Fix TypeError in ProjectTransformer when project contains custom fields - occurs when a project has custom fields with null values, the CLI raises a TypeError during transformation of project metadata"

### Include Code Examples

Show how the CLI is being used and what's not working:

```typescript
// In src/lib/importer.ts
const transformer = new ProjectTransformer(config);
const projects = await client.getProjects();

// This raises an error when custom fields are null
const transformedProject = transformer.transform(projects[0]);
console.log(transformedProject.customFields); // TypeError here
```

### Reference API Documentation

Link to relevant Project Online or Smartsheet API documentation to help the AI agent understand the expected behavior:

```markdown
According to the [Project Online REST API documentation](https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15)),
the response should include...

According to the [Smartsheet API documentation for creating workspaces](https://smartsheet.redoc.ly/#tag/workspaces/operation/create-workspace),
the request format should be...
```

### Specify the Scope

Be clear about what should and shouldn't be changed:

```markdown
**In Scope**:
- Update the `ProjectTransformer` class in `src/transformers/ProjectTransformer.ts`
- Add null handling for custom fields
- Update tests in `test/unit/transformers/ProjectTransformer.test.ts`
- Add integration test scenario

**Out of Scope**:
- Changes to other transformers
- Authentication logic changes
- CLI command interface changes
```

### Tag Appropriately

Use GitLab labels to help categorize your issue:

- `bug` - Something isn't working correctly
- `enhancement` - New feature or improvement
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `technical debt` - Code refactoring or cleanup

## Examples of Well-Written Issues

### Example 1: Bug Report

```markdown
**Title**: TaskTransformer fails when task has null duration

**Description**:
When using the Project Online Import CLI to import a project that contains tasks with null duration
(e.g., summary tasks or milestones), the TaskTransformer raises a TypeError during transformation.

**Steps to Reproduce**:

1. Create a project in Project Online with a summary task (null duration)
2. Run the import command:

```bash
npm run dev -- import --source https://example.sharepoint.com --destination workspace-123
```

3. Observe the TypeError in the logs

**Expected Behavior**:
The CLI should handle null task durations gracefully by either:
- Setting duration to 0 for summary tasks
- Using a default value for milestones
- Properly handling the null value in Smartsheet

**Actual Behavior**:

```text
TypeError: Cannot read property 'toFixed' of null
  at TaskTransformer.transformDuration (src/transformers/TaskTransformer.ts:145)
  at TaskTransformer.transform (src/transformers/TaskTransformer.ts:98)
```

**Environment**:
- CLI Version: 1.0.0
- Node.js Version: 18.0.0
- npm Version: 9.0.0
- OS: macOS 12.6

**Project Online API Reference**:
https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15)#task-properties

**Related Code**:
`src/transformers/TaskTransformer.ts:145`
`src/types/ProjectOnline.ts` (Task interface)

**Suggested Fix**:
Add null check in `transformDuration()` method and handle summary tasks/milestones appropriately based on task type.
```

### Example 2: Feature Request

```markdown
**Title**: Add support for incremental project updates

**Description**:
The Project Online Import CLI currently performs full imports of projects. Add support for
incremental updates that only sync changed data, reducing API calls and import time.

**Use Case**:
Users need to regularly sync project data from Project Online to Smartsheet. Full imports
are slow and expensive. An incremental update feature would:
- Detect which projects have changed since last sync
- Only update modified tasks, resources, and assignments
- Preserve Smartsheet-specific modifications (comments, attachments)

**Proposed CLI Usage**:

```bash
# Initial full import
npm run dev -- import --source <url> --destination <id>

# Subsequent incremental updates
npm run dev -- import --source <url> --destination <id> --incremental

# With timestamp-based filtering
npm run dev -- import --source <url> --destination <id> --incremental --since "2024-01-20"
```

**Proposed Implementation**:

```typescript
interface IncrementalSyncConfig {
  enabled: boolean;
  lastSyncTimestamp?: Date;
  trackingStrategy: 'timestamp' | 'version' | 'hash';
}

class IncrementalImporter extends BaseImporter {
  async detectChanges(lastSync: Date): Promise<ChangeSet> {
    // Compare Project Online data with Smartsheet state
  }

  async applyChanges(changes: ChangeSet): Promise<void> {
    // Update only modified entities
  }
}
```

**Project Online API Reference**:
- https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15)#querying-by-modified-date

**Smartsheet API Reference**:
- https://smartsheet.redoc.ly/#tag/sheets/operation/update-rows

**Implementation Considerations**:

- Add new CLI flag `--incremental` to enable incremental mode
- Store last sync timestamp in Smartsheet sheet properties or separate tracking sheet
- Use Project Online's `ModifiedDate` field to filter changed entities
- Handle conflicts when both systems have been modified
- Update configuration in `.env.sample` with new options
- Add new tests in `test/integration/scenarios/incremental-sync.test.ts`
- Update documentation in `sdlc/docs/project/CLI-Usage-Guide.md`

**Related Issues**: None

**Alternatives Considered**:
1. Full re-import every time (current approach) - simple but slow
2. Manual change tracking - requires user intervention
3. Event-driven webhooks - complex infrastructure requirements

**Documentation Impact**:
- Update CLI Usage Guide with incremental sync examples
- Add new section to Re-run Resiliency doc
- Update Architecture Overview with incremental sync flow diagram
```

### Example 3: Documentation Improvement

```markdown
**Title**: Add troubleshooting guide for Microsoft authentication errors

**Description**:
Users frequently encounter Microsoft authentication errors when setting up the CLI for the first time.
The current documentation doesn't provide enough guidance on resolving common auth issues.

**Location**: `sdlc/docs/code/troubleshooting-playbook.md`

**Suggested Improvement**:

Add a new section "Microsoft Authentication Troubleshooting" that covers:
1. Common MSAL errors and their meanings
2. How to verify Azure AD app registration settings
3. Steps to test authentication independently
4. How to diagnose token scope issues
5. Links to Microsoft documentation for advanced scenarios

Include code examples showing how to use the diagnostic scripts:
```bash
# Test authentication
npm run diagnose:token

# Verify permissions
npm run diagnose:permissions
```

**Context**:
Authentication is a major pain point for new users. Clear troubleshooting guidance would:
- Reduce setup time for new users
- Decrease support requests
- Improve user confidence in the tool
- Complement the existing Authentication Setup guide

**Target Audience**:
End users (project managers, administrators) setting up the CLI for the first time

**Related Documentation**:
- [Authentication Setup Guide](../project/Authentication-Setup.md)
- Existing troubleshooting playbook
```

## Best Practices Summary

### DO:
- Create an issue before starting any work
- Provide detailed context and examples
- Link to relevant API documentation
- Specify which files/modules are affected
- Include reproduction steps for bugs
- Propose concrete solutions
- Reference existing documentation and patterns
- Tag issues appropriately

### DON'T:
- Start coding without an issue
- Write vague or incomplete issue descriptions
- Skip steps to reproduce bugs
- Forget to specify the scope of changes
- Ignore existing code patterns and conventions
- Create issues for trivial changes (typos, etc.)
- Duplicate existing issues without cross-referencing

## Integration with Development Workflow

### Issue → Branch → Code → Test → MR

1. **Create/Find Issue**: Start with a well-written GitLab issue
2. **Create Branch**: Create a feature branch referencing the issue number
   ```bash
   git checkout -b feature/123-add-incremental-sync
   ```
3. **Write Code**: Follow [Code Conventions](./conventions.md) and [Patterns](./patterns.md)
4. **Write Tests**: Add unit and integration tests (see [Test Suite Guide](../../../test/README.md))
5. **Quality Checks**: Ensure all checks pass
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   ```
6. **Create PR/MR**: Create pull request or merge request linked to the issue
7. **Review**: Address feedback and iterate
8. **Merge**: Once approved, merge to mainline

### Working with AI Agents

When using AI coding agents like **Claude Code** or **Roo Code Cloud Agents**:

1. **Write the issue first** with comprehensive details
2. **Reference the issue** when asking the AI agent for help
3. **Provide context** by pointing to relevant docs and code
4. **Review generated code** against project conventions
5. **Test thoroughly** before creating the PR/MR
6. **Iterate** based on feedback

Example interaction with Claude Code:
```
User: "Help me implement the feature described in issue #123"
Claude Code: [Reads issue, analyzes codebase, generates implementation]
User: "The tests are failing, can you fix them?"
Claude Code: [Reviews test failures, updates implementation]
```

Example interaction with Roo Code Cloud Agent:
```
User: "@roo implement the feature in issue #123"
Roo: [Reads issue, analyzes codebase, generates implementation and creates PR]
User: [Reviews PR and requests changes]
Roo: [Updates implementation based on feedback]
```

## Conclusion

The Issue First approach, combined with AI coding agents (Claude Code and Roo Code Cloud Agents), creates a powerful workflow for contributing to the Project Online Import CLI. By writing clear, detailed issues, you provide AI agents with the context they need to generate high-quality code changes. This approach ensures that:

- All changes are well-documented and justified
- The community can provide input and avoid duplicate work
- AI agents have the information they need to be effective
- The CLI maintains high quality and consistency
- Code follows established patterns and conventions

Remember: **A well-written issue is the foundation for successful automation with AI coding agents.**

---

<div align="center">

[← Previous: Anti-Patterns](./anti-patterns.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Conventions →](./conventions.md)

</div>
