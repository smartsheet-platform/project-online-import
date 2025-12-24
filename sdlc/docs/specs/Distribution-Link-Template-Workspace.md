# Distribution Link Template Workspace Specification

## Executive Summary

This document specifies an enhancement to the workspace template strategy that guides users through acquiring a pre-configured template workspace via Smartsheet distribution link when no template is configured. The enhancement streamlines first-time setup by automating template workspace acquisition and configuration persistence.

## Background

### Current Behavior

The [`StandaloneWorkspacesFactory.createProjectWorkspace()`](../../../src/factories/StandaloneWorkspacesFactory.ts:114) method currently implements the following logic when creating project workspaces:

1. **Template Configured** (lines 140-151): If [`TEMPLATE_WORKSPACE_ID`](../../../.env.sample:90) is set in configuration:
   - Copy the template workspace using [`copyWorkspace()`](../../../src/util/SmartsheetHelpers.ts:444)
   - Create project workspace with pre-configured sheets and columns
   - Provides consistent structure across projects

2. **No Template Configured** (lines 152-170): If `TEMPLATE_WORKSPACE_ID` is not set:
   - Create a blank workspace with [`client.workspaces.createWorkspace()`](../../../src/types/SmartsheetClient.ts:58)
   - Create three sheets with only primary columns
   - Additional columns added programmatically

### Problem Statement

When no template is configured, users experience:
- Manual template setup complexity
- Inconsistent workspace structures
- No guidance on obtaining recommended template
- Missing opportunity to leverage pre-configured template with proper sheet references, formulas, and column configurations

### New Requirement

Enhance the template acquisition workflow to:
1. Detect missing `TEMPLATE_WORKSPACE_ID` configuration
2. Guide users to obtain pre-configured template via distribution link
3. Automatically discover and configure the acquired template
4. Persist configuration for subsequent runs
5. Use the acquired template immediately in current execution

## Goals

### Primary Goals

1. **Guided Template Acquisition**: Provide clear, step-by-step instructions for obtaining template workspace
2. **Automated Discovery**: Automatically locate the newly created template workspace by name
3. **Configuration Persistence**: Update `.env` file with discovered template workspace ID
4. **Seamless Integration**: Use acquired template in current run without requiring restart
5. **User Authentication Validation**: Ensure template is created under correct Smartsheet account

### Non-Goals

1. **Alternative Template Sources**: This specification does not cover other template acquisition methods
2. **Template Validation**: Content validation of acquired template is out of scope
3. **Multi-Template Support**: Only supports single template workspace configuration
4. **Retry Logic**: No retry mechanism for failed template acquisition (user must restart process)

## Detailed Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ StandaloneWorkspacesFactory.createProjectWorkspace()       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Template ID?  │
            └───┬───────┬───┘
                │ YES   │ NO
                │       │
                │       ▼
                │   ┌────────────────────────────────────┐
                │   │ Prompt User for Template via Link  │
                │   └────────────┬───────────────────────┘
                │                │
                │                ▼
                │   ┌────────────────────────────────────┐
                │   │ Open Browser to Distribution Link  │
                │   └────────────┬───────────────────────┘
                │                │
                │                ▼
                │   ┌────────────────────────────────────┐
                │   │ Wait for User Confirmation         │
                │   └────────────┬───────────────────────┘
                │                │
                │                ▼
                │   ┌────────────────────────────────────┐
                │   │ Search Workspaces by Name          │
                │   └────────────┬───────────────────────┘
                │                │
                │                ▼
                │   ┌────────────────────────────────────┐
                │   │ Update .env with Workspace ID      │
                │   └────────────┬───────────────────────┘
                │                │
                ▼                ▼
         ┌──────────────────────────┐
         │ Copy Template Workspace  │
         └──────────────────────────┘
```

### Component Design

#### 1. Template Acquisition Prompt

**Location**: New utility module [`src/util/TemplateAcquisitionHelper.ts`](../../../src/util/TemplateAcquisitionHelper.ts)

**Responsibilities**:
- Display user-friendly instructions
- Open system browser to distribution link
- Wait for user confirmation via keypress
- Provide timeout and cancellation support

**Public Interface**:

```typescript
interface TemplateAcquisitionResult {
  success: boolean;
  workspaceId?: number;
  workspaceName?: string;
  cancelled?: boolean;
  error?: string;
}

class TemplateAcquisitionHelper {
  /**
   * Guide user through template acquisition via distribution link
   * @param client - Smartsheet client for API calls
   * @param distributionUrl - Distribution link URL
   * @param expectedWorkspaceName - Name of workspace created by distribution
   * @param logger - Optional logger for debug output
   * @returns Promise with acquisition result
   */
  static async acquireTemplate(
    client: SmartsheetClient,
    distributionUrl: string,
    expectedWorkspaceName: string,
    logger?: Logger
  ): Promise<TemplateAcquisitionResult>;
}
```

**Display Format**:

```
================================================================
Template Workspace Setup Required
================================================================

No template workspace is configured. To ensure your Project Online
workspaces are created with the proper structure, we'll guide you
through obtaining the recommended template.

Steps to Complete:
────────────────────────────────────────────────────────────────

1. Opening your browser to Smartsheet distribution link...
   
2. In the browser:
   • LOGIN with the SAME Smartsheet account whose API token
     you configured (this is critical!)
   • Review the template workspace "Project Online Migration"
   • Click to save/accept the template to your Smartsheet account
   
3. Return to this terminal and PRESS ENTER when complete

IMPORTANT: Make sure you're logged into Smartsheet with the
account matching your SMARTSHEET_API_TOKEN.

────────────────────────────────────────────────────────────────

Opening browser... Press Ctrl+C to cancel
```

#### 2. Workspace Discovery

**Location**: Enhanced [`SmartsheetClient`](../../../src/types/SmartsheetClient.ts:41) usage

**Method**: Use [`client.workspaces.listWorkspaces()`](../../../src/types/SmartsheetClient.ts:73) to search

**Search Logic**:
```typescript
async function findWorkspaceByName(
  client: SmartsheetClient,
  workspaceName: string,
  logger?: Logger
): Promise<number | null> {
  if (!client.workspaces?.listWorkspaces) {
    throw new Error('Smartsheet client does not support listWorkspaces');
  }

  const response = await client.workspaces.listWorkspaces({
    queryParameters: { includeAll: true }
  });
  
  const workspaces = response.data || response.result || [];
  
  // Search for exact name match
  const match = workspaces.find(
    (ws: SmartsheetWorkspace) => ws.name === workspaceName
  );
  
  return match?.id ?? null;
}
```

**Error Scenarios**:
- Workspace not found: Provide troubleshooting guidance
- Multiple matches: Use most recently created
- API errors: Retry with exponential backoff

#### 3. Environment File Update

**Location**: Enhanced [`ConfigManager`](../../../src/util/ConfigManager.ts:41) with new method

**Method Signature**:
```typescript
class ConfigManager {
  /**
   * Update .env file with template workspace ID
   * @param templateWorkspaceId - Workspace ID to persist
   * @param envPath - Optional path to .env file (defaults to project root)
   * @throws ConfigurationError if file cannot be updated
   */
  updateTemplateWorkspaceId(
    templateWorkspaceId: number,
    envPath?: string
  ): void;
}
```

**Implementation Considerations**:
- Preserve existing `.env` file contents
- Update or append `TEMPLATE_WORKSPACE_ID=<id>`
- Handle file permissions errors gracefully
- Support commented-out existing values
- Maintain line endings (LF vs CRLF)
- Add timestamp comment for tracking

**File Update Format**:
```bash
# ... existing content ...

# Template Workspace ID (optional)
# Auto-configured on: 2025-12-22T21:30:00Z
TEMPLATE_WORKSPACE_ID=1234567890123456
```

#### 4. Browser Automation

**Location**: New utility [`src/util/BrowserHelper.ts`](../../../src/util/BrowserHelper.ts)

**Cross-Platform Support**:
```typescript
class BrowserHelper {
  /**
   * Open URL in system default browser (cross-platform)
   * @param url - URL to open
   * @throws Error if browser cannot be opened
   */
  static async openUrl(url: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    let command: string;
    
    switch (process.platform) {
      case 'darwin':  // macOS
        command = `open "${url}"`;
        break;
      case 'win32':   // Windows
        command = `start "" "${url}"`;
        break;
      default:        // Linux
        command = `xdg-open "${url}"`;
        break;
    }
    
    await execAsync(command);
  }
}
```

#### 5. User Input Handler

**Location**: New utility module [`src/util/UserInput.ts`](../../../src/util/UserInput.ts)

**Interface**:
```typescript
interface KeypressOptions {
  message?: string;
  timeout?: number;  // milliseconds, 0 = no timeout
  cancelKeys?: string[];  // Default: ['escape', 'ctrl-c']
}

interface KeypressResult {
  pressed: boolean;
  key?: string;
  timedOut: boolean;
  cancelled: boolean;
}

class UserInput {
  /**
   * Wait for user to press a key
   * @param options - Configuration options
   * @returns Promise with keypress result
   */
  static async waitForKeypress(
    options?: KeypressOptions
  ): Promise<KeypressResult>;
}
```

**Implementation Notes**:
- Use Node.js `readline` for cross-platform support
- Handle terminal raw mode carefully
- Restore terminal state on exit
- Support graceful cancellation (Ctrl+C)
- Optional timeout with clear messaging

### Integration Points

#### Modified: StandaloneWorkspacesFactory

**File**: [`src/factories/StandaloneWorkspacesFactory.ts`](../../../src/factories/StandaloneWorkspacesFactory.ts:42)

**Current Method**: [`createProjectWorkspace()`](../../../src/factories/StandaloneWorkspacesFactory.ts:114)

**Enhanced Logic** (lines 132-170):

```typescript
async createProjectWorkspace(
  client: SmartsheetClient,
  project: ProjectOnlineProject,
  configManager?: ConfigManager,
  workspaceId?: number
): Promise<ProjectWorkspaceResult> {
  // ... existing validation code ...

  const templateWorkspaceId = configManager 
    ? configManager.get().templateWorkspaceId 
    : undefined;

  // Create or use existing workspace
  if (!workspaceId) {
    let newWorkspace: { id: number; permalink?: string };

    if (templateWorkspaceId && templateWorkspaceId > 0) {
      // EXISTING: Use template workspace if configured
      newWorkspace = await copyWorkspace(client, templateWorkspaceId, workspace.name);
    } else {
      // NEW: Prompt for template acquisition via distribution link
      const acquisitionResult = await TemplateAcquisitionHelper.acquireTemplate(
        client,
        DISTRIBUTION_LINK_URL,
        EXPECTED_WORKSPACE_NAME,
        this.logger
      );

      if (acquisitionResult.success && acquisitionResult.workspaceId) {
        // Update .env file with discovered workspace ID
        if (configManager) {
          configManager.updateTemplateWorkspaceId(
            acquisitionResult.workspaceId,
            this.envPath
          );
        }
        
        // Use the acquired template
        newWorkspace = await copyWorkspace(
          client,
          acquisitionResult.workspaceId,
          workspace.name
        );
      } else if (acquisitionResult.cancelled) {
        // User cancelled - proceed with blank workspace
        this.logger?.warn('Template acquisition cancelled - creating blank workspace');
        newWorkspace = await this.createBlankWorkspace(client, workspace.name);
      } else {
        // Error occurred - provide guidance and create blank workspace
        this.logger?.error(
          `Template acquisition failed: ${acquisitionResult.error}. ` +
          'Creating blank workspace instead.'
        );
        newWorkspace = await this.createBlankWorkspace(client, workspace.name);
      }
    }

    workspace.id = newWorkspace.id;
    workspace.permalink = newWorkspace.permalink;

    // ... rest of method unchanged ...
  }

  // ... rest of method unchanged ...
}

private async createBlankWorkspace(
  client: SmartsheetClient,
  workspaceName: string
): Promise<{ id: number; permalink?: string }> {
  if (!client.workspaces?.createWorkspace) {
    throw new Error('Smartsheet client does not support workspace creation');
  }
  
  const createWorkspace = client.workspaces.createWorkspace;
  const created = await withBackoff(() =>
    createWorkspace({
      body: { name: workspaceName },
    })
  );
  
  const createdData = created?.result || created?.data;
  if (!createdData?.id) {
    throw new Error('Failed to create workspace - no ID returned');
  }
  
  return { id: createdData.id, permalink: createdData.permalink };
}
```

#### Configuration Constants

**File**: New constants file [`src/constants/TemplateConstants.ts`](../../../src/constants/TemplateConstants.ts)

```typescript
/**
 * Distribution link for Project Online Migration template workspace
 * This link creates a workspace named "Project Online Migration" with
 * pre-configured sheets, columns, and formulas.
 */
export const DISTRIBUTION_LINK_URL = 
  'https://app.smartsheet.com/b/launch?lx=LK9cBN90Gip3Qo5lHDIGneqKwon7W423t4KaXJloEug';

/**
 * Expected workspace name created by distribution link
 * Used to search for and identify the newly created workspace
 */
export const EXPECTED_WORKSPACE_NAME = 'Project Online Migration';

/**
 * Timeout for user to complete template acquisition (milliseconds)
 * Default: 5 minutes
 */
export const TEMPLATE_ACQUISITION_TIMEOUT = 5 * 60 * 1000;
```

### User Experience Flow

#### Scenario 1: First-Time User (No Template Configured)

```
$ npm run cli import -- --source PROJECT123

⚙️  Configuration:
  Smartsheet API Token: ab12...ef34
  Template Workspace ID: Not configured
  ...

================================================================
Template Workspace Setup Required
================================================================

No template workspace is configured. To ensure your Project Online
workspaces are created with the proper structure, we'll guide you
through obtaining the recommended template.

Steps to Complete:
────────────────────────────────────────────────────────────────

1. Opening your browser to Smartsheet distribution link...
   
2. In the browser:
   • LOGIN with the SAME Smartsheet account whose API token
     you configured (this is critical!)
   • Review the template workspace "Project Online Migration"
   • Click to save/accept the template to your Smartsheet account
   
3. Return to this terminal and PRESS ENTER when complete

IMPORTANT: Make sure you're logged into Smartsheet with the
account matching your SMARTSHEET_API_TOKEN.

────────────────────────────────────────────────────────────────

Opening browser... Press Ctrl+C to cancel

[Browser opens to distribution link]

Press ENTER when you've completed the template acquisition...

[User presses ENTER]

✓ Searching for workspace "Project Online Migration"...
✓ Found workspace! ID: 1234567890123456
✓ Updating .env file with template workspace ID...
✓ Configuration updated successfully

Proceeding with project workspace creation using template...

📊 Creating Project Workspace: Alpha Migration
  ✓ Copied template workspace
  ✓ Created Summary sheet
  ✓ Created Tasks sheet  
  ✓ Created Resources sheet

...
```

#### Scenario 2: Template Acquisition Failure

```
Press ENTER when you've completed the template acquisition...

[User presses ENTER]

✓ Searching for workspace "Project Online Migration"...
⚠ Workspace not found

Troubleshooting:
  1. Verify you accepted/saved the template in Smartsheet
  2. Check you're logged into the correct Smartsheet account
  3. The workspace should appear in your Smartsheet home page

Would you like to:
  [R] Retry search
  [C] Continue with blank workspace (not recommended)
  [X] Exit and fix configuration

Choice: _
```

#### Scenario 3: User Cancellation

```
Opening browser... Press Ctrl+C to cancel

[User presses Ctrl+C]

⚠ Template acquisition cancelled

Creating blank workspace without template. Note: You'll need to
configure columns and formulas manually.

Proceeding with project workspace creation...

...
```

### Error Handling

#### Error Categories and Responses

| Error Scenario | Handling Strategy | User Message |
|---------------|-------------------|--------------|
| **Browser fails to open** | Log error, provide manual URL | "Could not open browser automatically. Please visit: [URL]" |
| **Workspace not found** | Offer retry or continue | "Workspace not found. Retry search or continue without template?" |
| **API listWorkspaces fails** | Retry with backoff, then manual entry | "API error. Retrying... If this persists, you can enter workspace ID manually" |
| **.env file not writable** | Log warning, continue without persisting | "Warning: Could not update .env file. Template will work for this run but won't persist" |
| **Multiple workspaces match** | Use most recent, log info | "Found multiple matches. Using most recently created workspace (ID: 123...)" |
| **User timeout** | Prompt to continue or cancel | "No response after 5 minutes. Continue with blank workspace or cancel?" |

#### Recovery Mechanisms

1. **Graceful Degradation**: If template acquisition fails, fall back to blank workspace creation
2. **Retry Logic**: Apply exponential backoff to API operations using existing [`ExponentialBackoff`](../../../src/util/ExponentialBackoff.ts:17)
3. **Manual Override**: Allow users to bypass automation by setting `TEMPLATE_WORKSPACE_ID` manually
4. **State Preservation**: Don't require restart if acquisition fails - continue with current run

### Security Considerations

#### Authentication Validation

**Risk**: User might be logged into wrong Smartsheet account in browser

**Mitigation**:
1. **Prominent Warning**: Display clear message emphasizing account matching
2. **Post-Acquisition Validation**: After finding workspace, verify ownership via API
3. **Error Guidance**: If workspace not found, explain likely cause (wrong account)

#### Token Security

**Risk**: Template acquisition involves user interaction, increasing exposure window

**Mitigation**:
1. **No Token Display**: Never display API token during process
2. **Timeout**: Limit acquisition window to 5 minutes
3. **Cancellation**: Support immediate cancellation (Ctrl+C)

#### Distribution Link Security

**Risk**: Distribution link could be tampered with or become invalid

**Mitigation**:
1. **Constant Definition**: Store in code constant, not user-configurable
2. **HTTPS Only**: Ensure distribution URL uses HTTPS protocol
3. **Validation**: Verify distribution domain matches `app.smartsheet.com`

### Testing Strategy

#### Unit Tests

**File**: [`test/unit/util/TemplateAcquisitionHelper.test.ts`](../../../test/unit/util/TemplateAcquisitionHelper.test.ts)

**Test Cases**:
```typescript
describe('TemplateAcquisitionHelper', () => {
  describe('acquireTemplate', () => {
    it('should successfully find workspace by name', async () => {
      // Mock listWorkspaces to return workspace
      // Assert workspace ID returned
    });

    it('should handle workspace not found', async () => {
      // Mock listWorkspaces to return empty list
      // Assert appropriate error result
    });

    it('should handle multiple workspace matches', async () => {
      // Mock listWorkspaces to return multiple matches
      // Assert most recent selected
    });

    it('should handle API errors with retry', async () => {
      // Mock API failure then success
      // Assert retry logic works
    });

    it('should handle user cancellation', async () => {
      // Mock user pressing Ctrl+C
      // Assert cancelled flag set
    });

    it('should timeout after configured duration', async () => {
      // Mock no user input
      // Assert timeout after specified period
    });
  });
});
```

**File**: [`test/unit/util/ConfigManager.test.ts`](../../../test/unit/util/ConfigManager.test.ts) (enhanced)

**New Test Cases**:
```typescript
describe('ConfigManager', () => {
  describe('updateTemplateWorkspaceId', () => {
    it('should append TEMPLATE_WORKSPACE_ID if not present', () => {
      // Create .env without TEMPLATE_WORKSPACE_ID
      // Update and verify append
    });

    it('should update existing TEMPLATE_WORKSPACE_ID', () => {
      // Create .env with existing value
      // Update and verify replacement
    });

    it('should uncomment commented TEMPLATE_WORKSPACE_ID', () => {
      // Create .env with commented line
      // Update and verify uncomment + value change
    });

    it('should handle file permission errors gracefully', () => {
      // Mock read-only file
      // Assert error thrown with helpful message
    });

    it('should preserve other .env contents', () => {
      // Create .env with multiple variables
      // Update and verify others unchanged
    });
  });
});
```

#### Integration Tests

**File**: [`test/integration/template-acquisition-integration.test.ts`](../../../test/integration/template-acquisition-integration.test.ts)

**Test Cases** (with mocked user input):
```typescript
describe('Template Acquisition Integration', () => {
  it('should acquire template and update .env in full workflow', async () => {
    // Mock: No TEMPLATE_WORKSPACE_ID in config
    // Mock: User confirmation (Enter key)
    // Mock: listWorkspaces returns template workspace
    // Assert: .env updated with workspace ID
    // Assert: Workspace creation uses template
  });

  it('should fall back to blank workspace on cancellation', async () => {
    // Mock: User cancellation (Ctrl+C)
    // Assert: Blank workspace created
    // Assert: .env not updated
  });

  it('should handle workspace not found gracefully', async () => {
    // Mock: User confirmation
    // Mock: listWorkspaces returns no matches
    // Assert: Blank workspace created after user choice
    // Assert: Appropriate error message logged
  });
});
```

**Test Environment Setup**:
- Create isolated test `.env` files
- Mock browser opening (don't actually open browser in tests)
- Mock user input with configurable responses
- Clean up test `.env` files after each test

#### Manual Testing Checklist

- [ ] First-time flow with no template configured
- [ ] Verify browser opens to correct distribution link
- [ ] Verify workspace discovery after template acceptance
- [ ] Verify `.env` file updated correctly
- [ ] Verify subsequent runs use configured template
- [ ] Test cancellation (Ctrl+C) during acquisition
- [ ] Test timeout behavior (no user response)
- [ ] Test with workspace already created manually
- [ ] Test with multiple "Project Online Migration" workspaces
- [ ] Test with read-only `.env` file
- [ ] Test across platforms (macOS, Windows, Linux)

### Configuration Documentation

#### Updated .env.sample

**File**: [`.env.sample`](../../../.env.sample:85)

**Changes** (lines 85-97):

```bash
# Template Workspace ID (optional)
# ─────────────────────────────────────────────────────────────────────────
# Workspace ID used as template for creating new project workspaces
# The template should contain pre-configured sheets with all columns defined
#
# AUTOMATED SETUP (Recommended):
# Leave this blank on first run. The tool will guide you through obtaining
# the recommended template via distribution link and automatically configure
# this value.
#
# MANUAL SETUP:
# If you already have a template workspace, specify its ID here to skip
# the guided setup.
#
# Example: TEMPLATE_WORKSPACE_ID=9002412817049476
TEMPLATE_WORKSPACE_ID=
```

#### Updated README

**File**: [`README.md`](../../../README.md)

**New Section**: "Template Workspace Setup"

```markdown
### Template Workspace Setup

Project Online workspaces can be created using a template for consistent
structure and pre-configured formulas.

#### Automated Setup (Recommended)

On first run without a configured template:

1. Leave `TEMPLATE_WORKSPACE_ID` blank in your `.env` file
2. Run any import command
3. Follow the interactive prompts to:
   - Accept the template via Smartsheet distribution link
   - Automatically discover and configure the template
4. Future runs will use the configured template automatically

#### Manual Setup

If you already have a template workspace:

1. Get the workspace ID from Smartsheet (visible in workspace URL)
2. Add to `.env`: `TEMPLATE_WORKSPACE_ID=1234567890123456`
3. Run import commands normally

#### Template Contents

The recommended template includes:
- Pre-configured Summary, Tasks, and Resources sheets
- All required columns with proper types and formulas
- Cell linking and cross-sheet references
- Conditional formatting and validation rules
```

### Dependencies

#### New NPM Packages

None required - use built-in Node.js modules:
- `readline` - User input handling
- `child_process` - Browser opening
- `fs/promises` - File I/O for .env updates

#### Existing Utilities

**Reused**:
- [`Logger`](../../../src/util/Logger.ts:12) - Structured logging
- [`ExponentialBackoff`](../../../src/util/ExponentialBackoff.ts:17) - API retry logic
- [`ErrorHandler`](../../../src/util/ErrorHandler.ts:14) - Error management
- [`DeviceCodeDisplay`](../../../src/util/DeviceCodeDisplay.ts:10) - Display formatting patterns

**Pattern Inspiration**:
Use similar display patterns from [`DeviceCodeDisplay`](../../../src/util/DeviceCodeDisplay.ts:16) for consistent user experience

### Performance Considerations

#### Impact Analysis

| Operation | Duration | Impact | Mitigation |
|-----------|----------|--------|------------|
| **Browser open** | <1s | Negligible | Asynchronous, doesn't block |
| **User wait** | 0-300s | High (one-time) | Clear messaging, skippable |
| **listWorkspaces API** | 1-3s | Low | Cached after first call |
| **.env file update** | <100ms | Negligible | Small file, single write |
| **Overall impact** | One-time setup | Low | Only runs when no template configured |

#### Optimization Strategies

1. **Lazy Evaluation**: Only invoke acquisition flow when template actually needed
2. **Caching**: Store discovered workspace ID in memory for current run
3. **Async Operations**: Run browser opening asynchronously while displaying instructions
4. **Skip Option**: Allow users to skip and continue with blank workspace

### Rollout Plan

#### Phase 1: Core Implementation (Week 1)

**Tasks**:
1. Implement `TemplateAcquisitionHelper` utility
2. Implement `BrowserHelper` utility
3. Implement `UserInput` utility
4. Add `ConfigManager.updateTemplateWorkspaceId()` method
5. Create constants file

**Deliverables**:
- [ ] Core utility classes implemented
- [ ] Unit tests passing
- [ ] Code review completed

#### Phase 2: Factory Integration (Week 1-2)

**Tasks**:
1. Modify `StandaloneWorkspacesFactory.createProjectWorkspace()`
2. Add workspace search logic
3. Integrate acquisition flow
4. Add fallback logic
5. Update error handling

**Deliverables**:
- [ ] Factory integration complete
- [ ] Integration tests passing
- [ ] Manual testing successful

#### Phase 3: Documentation and Polish (Week 2)

**Tasks**:
1. Update `.env.sample` with new guidance
2. Update `README.md` with template setup section
3. Add troubleshooting documentation
4. Create user guide with screenshots
5. Update inline code documentation

**Deliverables**:
- [ ] Documentation complete
- [ ] User guide published
- [ ] Code comments comprehensive

#### Phase 4: Validation and Release (Week 2)

**Tasks**:
1. Full integration test suite execution
2. Manual testing across platforms
3. Security review
4. Performance validation
5. Release notes preparation

**Deliverables**:
- [ ] All tests passing
- [ ] Cross-platform validation complete
- [ ] Ready for release

### Success Metrics

#### Quantitative Metrics

1. **Adoption Rate**: % of users who complete template acquisition vs skip
   - Target: >70% completion rate

2. **Time to Complete**: Average time from prompt to workspace discovery
   - Target: <2 minutes (excluding user decision time)

3. **Failure Rate**: % of acquisitions that fail and fall back to blank workspace
   - Target: <5% failure rate

4. **Support Reduction**: Decrease in template-related support requests
   - Target: 50% reduction in "how do I set up template" questions

#### Qualitative Metrics

1. **User Feedback**: Collect feedback on clarity of instructions
2. **Error Rate**: Monitor API errors during workspace discovery
3. **Performance**: Verify no regression in workspace creation time

### Risk Management

#### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Distribution link expires** | Low | High | Store in constant for easy update, monitor link validity |
| **User confusion** | Medium | Medium | Clear instructions, error handling, troubleshooting guide |
| **Wrong account authentication** | Medium | Medium | Prominent warnings, post-acquisition validation |
| **API rate limiting** | Low | Medium | Exponential backoff, error handling |
| **Browser fails to open** | Low | Low | Provide manual URL, document workarounds |
| **.env file corruption** | Low | High | Validate before write, backup on write, atomic operations |

#### Rollback Strategy

If critical issues arise:
1. **Configuration Override**: Users can manually set `TEMPLATE_WORKSPACE_ID` to bypass flow
2. **Feature Flag**: Add `SKIP_TEMPLATE_ACQUISITION=true` to disable enhancement
3. **Graceful Degradation**: Always fall back to blank workspace creation
4. **Code Revert**: Enhancement is isolated, easy to revert without breaking existing functionality

### Future Enhancements

#### Post-Release Improvements

1. **Template Validation**: Verify acquired template contains expected sheets/columns
2. **Multiple Templates**: Support different templates for different project types
3. **Template Marketplace**: Allow users to choose from multiple template options
4. **Offline Support**: Cache template structure for offline workspace creation
5. **Template Versioning**: Track template version and prompt for updates
6. **Custom Template Creation**: Tool to create custom templates from existing workspaces
7. **Team Templates**: Share templates across organization

#### Related Work

- **Jira Integration**: Link template acquisition to Jira task tracking
- **Analytics**: Collect anonymous usage data on template adoption
- **Guided Tours**: In-app walkthrough of template features

## Appendix

### A. API Reference

#### Smartsheet Workspaces API

**List Workspaces**:
```
GET /workspaces
Response: { data: [{ id, name, permalink, ... }] }
```

**Get Workspace**:
```
GET /workspaces/{workspaceId}
Response: { id, name, permalink, sheets: [...] }
```

### B. Distribution Link Details

**URL**: `https://app.smartsheet.com/b/launch?lx=LK9cBN90Gip3Qo5lHDIGneqKwon7W423t4KaXJloEug`

**Behavior**:
- Opens Smartsheet distribution page
- Prompts user to login (if not authenticated)
- Shows template preview
- Creates workspace copy when user accepts
- Workspace name: "Project Online Migration"

**Template Contents**:
- Summary sheet with project metadata columns
- Tasks sheet with WBS, dates, duration, dependencies
- Resources sheet with resource types and allocation
- Pre-configured cell links between sheets
- Formula columns for calculations
- Conditional formatting rules

### C. Code Review Checklist

- [ ] User instructions are clear and actionable
- [ ] Error messages provide specific troubleshooting steps
- [ ] All user input is validated
- [ ] File I/O includes error handling
- [ ] API calls use exponential backoff
- [ ] Cross-platform compatibility verified
- [ ] No sensitive data logged
- [ ] Graceful degradation on all failure paths
- [ ] Tests cover happy path and error scenarios
- [ ] Documentation complete and accurate
- [ ] Code follows project style guidelines
- [ ] TypeScript types properly defined
- [ ] No console.log statements (use Logger)

### D. Troubleshooting Guide

**Issue**: Browser doesn't open
- **Cause**: Platform detection failed or browser not available
- **Solution**: Provide manual URL, document in README

**Issue**: Workspace not found after acceptance
- **Cause**: User authenticated with wrong account
- **Solution**: Display account verification message, provide retry

**Issue**: .env file not updated
- **Cause**: File permissions or path issues
- **Solution**: Log warning, provide manual instruction

**Issue**: Multiple workspaces named "Project Online Migration"
- **Cause**: User accepted template multiple times
- **Solution**: Use most recent, log info message

---

## Document Control

- **Version:** 1.0
- **Created:** 2025-12-22
- **Status:** Draft - Ready for Review
- **Stakeholders:** Development Team, Product Owner
- **Related Documents**:
  - [`Factory-Pattern-Refactoring-Plan.md`](./Factory-Pattern-Refactoring-Plan.md)
  - [`Template-Based-Workspace-Creation.md`](../project/Template-Based-Workspace-Creation.md)
- **Implementation Tracking**: TBD (Jira ticket)
- **Target Release**: TBD
