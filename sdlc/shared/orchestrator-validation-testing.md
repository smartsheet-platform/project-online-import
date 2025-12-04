# Orchestrator: Workflow Validation and Testing

## Applies To: ✅ Roo Modes: Orchestrator mode

> **Note**: This workflow is specific to Roo Orchestrator mode. There is no Claude equivalent for orchestrator functionality.

## Overview

Comprehensive validation framework for dual workflow system functionality, including test scenarios, integration validation, and troubleshooting procedures.

## Validation Checklist

### System Integration Validation

**Orchestrator Enhancements:**
- Dual workflow detection logic properly implemented
- JIRA issue tracking integration functional via MCP
- Change detection algorithms working correctly
- Workflow routing to Spec and Code modes configured
- Branch management strategies implemented

**Spec Mode Enhancements:**
- Incremental update workflow detection functional
- Metadata management working correctly
- Changelog generation and maintenance operational
- Version tracking integration with Orchestrator
- Change impact analysis functioning

**Code Mode Enhancements:**
- Targeted implementation workflow detection working
- Code preservation strategies implemented
- Incremental modification patterns functional
- Testing and validation procedures operational
- Documentation update workflows working

### Mode Coordination Validation

**Orchestrator to Spec Handoff:**
- Change detection results properly formatted for Spec mode
- Incremental update instructions correctly generated
- Metadata tracking information passed through

**Spec to Code Handoff:**
- Specification changes properly summarized for Code mode
- Implementation scope clearly defined
- Change impact assessment provided

**Error Handling Coordination:**
- Error scenarios properly escalated between modes
- Fallback workflows implemented correctly
- User communication consistent across modes

## Test Scenarios

### New Feature or Enhancement Workflow Tests

**Scenario: Basic New Feature or Enhancement**

Description: Test standard new feature or enhancement creation workflow

**Setup:**
1. Create new JIRA issue with basic description
2. Ensure no existing specification or branch exists

**Expected Behavior:**
- Orchestrator detects new feature or enhancement workflow
- Creates new Git branch with proper naming
- Routes to Spec mode for full specification creation
- Routes to Code mode for complete implementation

**Scenario: Enhanced Description New Feature or Enhancement**

Description: Test new feature or enhancement workflow with description enhancement

**Setup:**
1. Create JIRA issue with brief description
2. Ensure task status indicates ready for enhancement

**Expected Behavior:**
- Orchestrator enhances description in JIRA
- Uses enhanced description for specification creation
- Metadata tracking includes enhanced description hash

### Existing Feature or Enhancement Update Tests

**Scenario: Description Change Detection**

Description: Test detection of changes to existing feature or enhancement descriptions

**Setup:**
1. Create existing specification with metadata
2. Modify JIRA issue description field
3. Update JIRA issue (triggers change detection)

**Expected Behavior:**
- Orchestrator detects issue change
- Identifies description field differences
- Classifies change type (major/minor/editorial)
- Routes to incremental update workflow

**Scenario: Incremental Spec Update**

Description: Test incremental specification updates

**Setup:**
1. Provide Spec mode with incremental update instructions
2. Include change diff and classification

**Expected Behavior:**
- Spec mode applies targeted changes only
- Preserves existing specification content
- Adds proper changelog entry
- Updates metadata with new version info

**Scenario: Targeted Code Implementation**

Description: Test targeted code changes for existing features or enhancements

**Setup:**
1. Provide Code mode with targeted update instructions
2. Include existing codebase and change scope

**Expected Behavior:**
- Code mode identifies existing implementation files
- Applies only specified modifications
- Preserves existing functionality
- Maintains backward compatibility

### Edge Case Tests

**Scenario: Missing JIRA MCP Connection**

Description: Test fallback when JIRA MCP server unavailable

**Setup:**
- Simulate MCP connection failure or unavailability

**Expected Behavior:**
- Falls back to manual task specification
- Warns user about JIRA integration unavailability
- Continues with workflow using provided information

**Scenario: Corrupted Spec Metadata**

Description: Test handling of corrupted specification metadata

**Setup:**
- Create specification with invalid metadata block

**Expected Behavior:**
- Detects metadata parsing failure
- Regenerates metadata from current JIRA issue state
- Warns user about metadata regeneration

**Scenario: Conflicting Branches**

Description: Test handling of multiple branches for same task

**Setup:**
- Create multiple branches matching task ID pattern

**Expected Behavior:**
- Lists available branches
- Requests user clarification
- Falls back to most recently modified branch

## Integration Testing

### JIRA MCP Integration

**Test Case: JIRA MCP Connectivity**

Description: Validate JIRA MCP server integration

Test: Use jira_search MCP tool to query issues

Validation: Successfully retrieves JIRA issues via MCP

**Test Case: Issue Modification Tracking**

Description: Test issue-level modification detection via JIRA MCP

Test: Use jira_get_issue MCP tool to retrieve issue details
```
Tool: jira_get_issue
Issue Key: TEST-001
```

Validation: Response includes modification timestamp (updated field) and change history

**Test Case: Description Field Updates**

Description: Validate ability to update JIRA issue Description fields via MCP

Test: Use jira_update_issue MCP tool to modify description
```
Tool: jira_update_issue
Issue Key: TEST-001
Fields: {"description": "Updated test description for validation"}
```

Validation: Description field successfully updated and reflected in JIRA

### Git Workflow Integration

**Test Case: Branch Detection**

Description: Test existing branch detection logic

Test Command:
```bash
git branch -a | grep "personal/{git_user_name}/TEST-001-"
```

Validation: Correctly identifies existing branches

**Test Case: Branch Creation**

Description: Validate new branch creation patterns

Test Command:
```bash
git checkout -b personal/{git_user_name}/TEST-002-validation-test
```

Validation: Branch created with correct naming convention

## Performance Validation

### Response Time Benchmarks

**Benchmark: Workflow Detection**
- Description: Time to detect workflow type and route appropriately
- Target: Less than 5 seconds for workflow detection

**Benchmark: Change Detection**
- Description: Time to analyze JIRA issue changes and generate diff
- Target: Less than 10 seconds for change analysis

**Benchmark: Incremental Updates**
- Description: Time to apply incremental specification updates
- Target: Less than 30 seconds for spec updates

## Troubleshooting Procedures

### Common Issues

**Issue: Workflow Detection Failure**

**Symptoms:**
- Orchestrator always defaults to new feature or enhancement workflow
- Existing specifications not detected

**Diagnosis:**
1. Check if specification files exist in expected locations
2. Verify metadata block format in existing specifications
3. Confirm file path patterns match detection logic

**Resolution:**
1. Update specification file locations to match patterns
2. Regenerate metadata blocks in existing specifications
3. Verify detection regex patterns in workflow files

**Issue: JIRA MCP Connection Failures**

**Symptoms:**
- Task discovery not working
- MCP authentication errors

**Diagnosis:**
1. Verify environment variables are properly set
2. Verify MCP Atlassian server is properly configured
3. Test MCP connectivity using jira_search tool

**Resolution:**
1. Update environment variables with correct values
2. Regenerate API tokens if expired
3. Verify sheet ID and column ID mappings

**Issue: Incremental Update Failures**

**Symptoms:**
- Spec mode performs full rewrites instead of incremental updates
- Existing content gets overwritten

**Diagnosis:**
1. Check if incremental update instructions are properly formatted
2. Verify existing specification file structure
3. Confirm metadata parsing is working correctly

**Resolution:**
1. Fix instruction format from Orchestrator to Spec mode
2. Regenerate corrupted metadata blocks
3. Update specification file structure if needed

## Validation Commands

### System Health Checks

**Command: Check Environment**

Description: Validate all required environment variables are set

Script:
```bash
echo "Checking environment variables..."
[ -z "$JIRA_USERNAME" ] && echo "❌ JIRA_USERNAME not set" || echo "✅ JIRA_USERNAME set"
[ -z "$JIRA_API_TOKEN" ] && echo "❌ JIRA_API_TOKEN not set" || echo "✅ JIRA_API_TOKEN set"
[ -z "$JIRA_URL" ] && echo "❌ JIRA_URL not set" || echo "✅ JIRA_URL set"
```

**Command: Test JIRA MCP Connectivity**

Description: Test basic JIRA MCP connectivity

Script:
Use the jira_search MCP tool to verify connectivity:
```
Tool: jira_search
JQL: "project = YOUR_PROJECT_KEY"
```
Expected: Successfully returns JIRA issues

**Command: Validate XML Structure**

Description: Validate XML structure of workflow files

Script:
```bash
echo "Validating XML structure..."
for file in sdlc/.roo/rules-orchestrator/*.xml; do
  xmllint --noout "$file" 2>/dev/null && echo "✅ $file valid" || echo "❌ $file invalid"
done
```

## Deployment Validation

### Pre-Deployment Checklist

- All XML files are well-formed and valid
- Environment variables are properly configured
- JIRA MCP server is functional
- Git repository has appropriate branch structure
- Existing specifications have proper metadata blocks

### Post-Deployment Verification

1. Test new feature or enhancement workflow with sample JIRA issue
2. Test existing feature or enhancement update workflow with modified description
3. Verify mode coordination and handoffs working correctly
4. Confirm error handling and fallback procedures functional
5. Validate performance meets established benchmarks

## Monitoring and Maintenance

### Key Metrics

**Metric: Workflow Detection Accuracy**
- Description: Percentage of correct workflow type detections
- Target: Greater than 95% accuracy

**Metric: Change Detection Reliability**
- Description: Percentage of actual changes correctly identified
- Target: Greater than 98% reliability

**Metric: Incremental Update Success Rate**
- Description: Percentage of successful incremental updates without overwrites
- Target: Greater than 99% success rate

### Maintenance Procedures

**Procedure: Weekly Health Check**

Description: Weekly validation of system health and performance

Tasks:
1. Run validation commands to check system health
2. Review workflow detection accuracy metrics
3. Validate API connectivity and performance
4. Check for any corrupted metadata in specifications

**Procedure: Monthly Optimization Review**

Description: Monthly review of workflow efficiency and optimization opportunities

Tasks:
1. Analyze performance benchmarks and identify bottlenecks
2. Review error logs and improve error handling
3. Update detection patterns based on usage patterns
4. Optimize API calls and reduce unnecessary requests