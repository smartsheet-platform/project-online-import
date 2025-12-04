# Incremental Specification Updates

## Overview

Enhanced specification functionality that supports incremental updates to existing specifications based on changes, with comprehensive changelog management and version tracking integration.

## Workflow Detection

### Trigger Indicators

- Instructions contain "INCREMENTAL SPECIFICATION UPDATE"
- Existing specification file path provided
- Version change detected (e.g., JIRA issue update)
- Change diff analysis provided

### Workflow Selection

**Full Specification**:
- When: No existing specification found OR instructions indicate new workflow
- Action: Create complete specification from scratch

**Incremental Update**:
- When: Existing specification found AND version changes detected
- Action: Apply targeted updates and maintain changelog

## Incremental Update Process

### Step 1: Load Existing Specification
- Load existing specification document
- Validate file exists and is readable

### Step 2: Extract Current Metadata
- Parse metadata block (HTML comments or frontmatter)
- Extract version tracking information

### Step 3: Analyze Change Instructions
- Classify change type (functional, clarification, editorial)
- Identify specific sections affected
- Extract delta content to apply

### Step 4: Apply Incremental Changes
- Use surgical updates to specific sections only
- Preserve all content not explicitly changed

### Step 5: Update or Create Changelog
- Append new entry with date, version, and changes
- Format with detailed change description

### Step 6: Update Metadata Block
- Update version number
- Update timestamp
- Update content hash if applicable

## Metadata Management

### Metadata Block Format

```html
<!-- JIRA TRACKING METADATA -->
<!-- Issue Key: {jira_issue_key} -->
<!-- Last Updated: {iso_timestamp} -->
<!-- Description Hash: {hash_of_description} -->
<!-- Spec Version: {internal_spec_version} -->
<!-- END METADATA -->
```

**Placement**: At the top of specification document, before title

**Updating**: Replace entire metadata block on each update

### Metadata Extraction Patterns

- `<!-- Sheet Version: (\d+) -->`
- `<!-- Last Updated: ([^-]+) -->`
- `<!-- Row ID: ([^-]+) -->`
- `<!-- Description Hash: ([^-]+) -->`
- `<!-- Spec Version: ([^-]+) -->`

### Validation

- [ ] Ensure all required metadata fields are present
- [ ] Validate timestamp format
- [ ] Verify version numbers are numeric

## Changelog Management

### Changelog Section Format

```markdown
## Changelog

### Version {spec_version} - {date}
**Source Version:** {sheet_version}
**Change Type:** {Major|Minor|Editorial}

**Changes:**
- {specific_change_1}
- {specific_change_2}

**Impact:** {impact_description}

---
```

**Placement**: At end of specification document (preferred) or after main content

### New Entry Creation Process

1. Identify existing changelog section or create new one
2. Generate new version number (increment from previous)
3. Format new entry with current date and changes
4. Insert at top of changelog (most recent first)

### Entry Content Generation

**Change Summarization**:
- Analyze diff between old and new content
- Output human-readable list of specific changes
- Classify as functional, clarification, or editorial

**Impact Assessment**:
- **Code Impact**: Whether changes require code modifications
- **Scope Impact**: Which components/modules are affected
- **User Impact**: How changes affect end-user experience

## Incremental Update Strategies

### Section-Based Updates

**Approach**: Update specific sections without rewriting entire document

**Requirements Update**:
- Trigger: Functional requirements added, modified, or removed
- Method: Update Requirements section with delta changes
- Preservation: Keep existing requirements not affected by changes

**API Specification Update**:
- Trigger: API endpoints, parameters, or responses changed
- Method: Update API specification section with new/modified endpoints
- Preservation: Maintain existing API documentation for unchanged endpoints

**Workflow Update**:
- Trigger: User workflows or business processes modified
- Method: Update workflow diagrams and descriptions
- Preservation: Keep existing workflows that remain unchanged

### Content Preservation

**Principle**: Preserve all existing content not explicitly changed

**Implementation**:
1. Identify specific sections affected by changes
2. Apply updates only to those sections
3. Maintain formatting and structure of unaffected sections
4. Preserve existing examples, diagrams, and code samples

## Change Impact Classification

### Major Impact

**Indicators**:
- New features or functionality added
- Existing functionality significantly modified
- API changes that affect existing integrations
- Database schema or data model changes

**Changelog Note**: Requires code implementation and testing

### Minor Impact

**Indicators**:
- Additional clarification or examples added
- Error handling scenarios expanded
- Performance requirements clarified
- Validation rules refined

**Changelog Note**: May require minor code adjustments

### Editorial Impact

**Indicators**:
- Grammar, spelling, or formatting improvements
- Reorganization of existing content
- Clarification without functional changes

**Changelog Note**: No code changes required

## Implementation Coordination

### Change Summary Generation

```markdown
**Specification Change Summary**

**Affected Sections:**
- {section_name}: {change_description}

**Implementation Impact:**
- {component_name}: {required_changes}

**Code Areas to Modify:**
- {file_or_module}: {specific_modifications}

**Preservation Notes:**
- Existing functionality to maintain unchanged
- Integration points that must remain compatible
```

### Handoff Coordination

**Spec Completion Signal**: Specification updates complete with changelog entry

**Next Action**: Provide implementation mode with targeted implementation instructions

## Quality Assurance

### Update Validation

**Consistency Checks**:
- [ ] Verify all metadata fields are properly updated
- [ ] Ensure changelog entry accurately reflects changes
- [ ] Validate that incremental changes don't conflict with existing content
- [ ] Confirm specification structure remains intact

**Content Validation**:
- [ ] Verify new content follows project documentation standards
- [ ] Ensure technical accuracy of updated specifications
- [ ] Validate that examples and code samples are consistent

## User Communication

### Progress Messages

**Incremental Mode Detected**:
```
📝 Incremental specification update mode detected. Analyzing existing document...
```

**Changes Applied**:
```
✅ Applied {change_count} incremental changes to specification. Added changelog entry v{version}.
```

**Metadata Updated**:
```
💾 Updated tracking metadata: v{old_version} → v{new_version}
```

**Preservation Note**:
```
🛡️ Preserved existing specification content not affected by changes.
```

### Error Messages

**Existing Spec Not Found**:
```
⚠️ Existing specification not found at {path}. Switching to full specification workflow.
```

**Metadata Parse Error**:
```
⚠️ Unable to parse metadata from existing specification. Regenerating tracking information.
```

## Best Practices

1. **Minimize changes to preserve existing specification integrity**
2. **Always maintain accurate change history in changelog**
3. **Provide clear impact assessment for implementation teams**
4. **Preserve existing examples and documentation unless explicitly changed**