# Load Phase Integration Test Scenarios

## Overview
Comprehensive test scenarios for the Load phase of the ETL pipeline, using mock Project Online oData responses with the real Smartsheet SDK. These tests ensure thorough coverage of all Project Online data variations and edge cases without requiring manual testing through Project Online's UI.

## Test Architecture

### Test Structure
- **Mock OData Client**: Simulates all Project Online oData response variations
- **Real Smartsheet SDK**: Actual Smartsheet API calls (requires API token)
- **Test Workspace**: Dedicated Smartsheet workspace for test execution
- **Cleanup**: Automatic teardown after each test

### Test Organization
```
test/integration/
├── load-phase.test.ts           # Main integration test suite
├── scenarios/
│   ├── project-scenarios.ts      # Project entity edge cases
│   ├── task-scenarios.ts         # Task entity edge cases
│   ├── resource-scenarios.ts     # Resource entity edge cases
│   └── assignment-scenarios.ts   # Assignment entity edge cases
└── helpers/
    ├── smartsheet-setup.ts       # Smartsheet workspace setup/teardown
    └── odata-fixtures.ts         # Mock oData response builders
```

## Project Online oData Edge Cases

### 1. Project Entity Variations

#### 1.1 Basic Project
- Minimal required fields only
- No optional fields populated
- Tests workspace creation with defaults

#### 1.2 Complete Project
- All fields populated with valid data
- Tests full property mapping

#### 1.3 Project with Special Characters in Name
- Names with: `/\:*?"<>|`
- Tests workspace name sanitization
- Examples: "Q1/Q2 Planning", "IT Infrastructure | Phase 1"

#### 1.4 Project with Very Long Name
- Name > 100 characters
- Tests truncation to "...97 chars..."

#### 1.5 Project with Priority Values
- All 7 priority levels: 0, 200, 400, 500, 600, 800, 1000
- Tests priority mapping fidelity

#### 1.6 Project with Null/Empty Optional Fields
- Description: null vs empty string
- Owner: missing email
- OwnerEmail: missing name
- StartDate/FinishDate: null dates
- Tests graceful null handling

#### 1.7 Project with Edge Date Values
- Very old dates (1900s)
- Future dates (2100s)
- Date-only (no time component)
- DateTime with various timezones

### 2. Task Entity Variations

#### 2.1 Flat Task List
- All tasks at OutlineLevel 0
- No hierarchy
- Tests basic row creation

#### 2.2 Simple Hierarchy
- 2 levels: Parent → Child
- OutlineLevel 0 → 1
- Tests parent-child relationships

#### 2.3 Deep Hierarchy
- 5+ levels of nesting
- Tests deep indentation

#### 2.4 Complex Hierarchy Patterns
- Parent with multiple children
- Sibling tasks at same level
- Mixed hierarchy (some branches deeper than others)

#### 2.5 Task Ordering Edge Cases
- TaskIndex gaps (1, 3, 7, 10)
- TaskIndex out of order
- Duplicate TaskIndex values
- Tests TaskIndex-based ordering

#### 2.6 Duration Variations
- PT0H (zero duration)
- PT40H (standard hours)
- P5D (days)
- PT480M (minutes)
- Very large durations (P365D)
- Null/missing duration
- Tests ISO8601 to decimal conversion

#### 2.7 Work and ActualWork Combinations
- Work present, ActualWork null
- Both present
- Both null
- ActualWork > Work (overrun)
- Tests dual duration handling

#### 2.8 Percent Complete Edge Cases
- 0% (not started)
- 1-99% (in progress)
- 100% (complete)
- null (default to 0%)
- Tests status derivation

#### 2.9 Priority Variations (7 Levels)
- All Project Online priority values: 0, 200, 400, 500, 600, 800, 1000
- Null priority (default to 500/Medium)
- Tests 7-level mapping fidelity

#### 2.10 Milestone Tasks
- IsMilestone: true with Duration: PT0H
- IsMilestone: false with normal duration
- Tests milestone checkbox

#### 2.11 Task Notes Edge Cases
- null notes
- Empty string notes
- Very long notes (>4000 chars, tests truncation)
- Notes with special characters

#### 2.12 Constraint Types
- All 8 types: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO
- ConstraintDate present/absent
- Tests constraint picklist

#### 2.13 Predecessor Relationships
- Simple FS (Finish-to-Start)
- SS, FF, SF variants
- With lag (+2d, -1d)
- Multiple predecessors
- null/empty predecessors
- Tests predecessor column format

#### 2.14 System Columns (Dual Date Pattern)
- CreatedDate and ModifiedDate populated
- Tests dual date column creation
- Verifies Project Online dates preserved

### 3. Resource Entity Variations

#### 3.1 Work Resources (People)
- Full Name and Email
- Tests CONTACT_LIST column creation

#### 3.2 Work Resources Without Email
- Name present, Email null
- Tests contact object with name only

#### 3.3 Work Resources Without Name
- Name null, Email present
- Tests contact object with email only

#### 3.4 Material Resources (Equipment)
- ResourceType: 'Material'
- Tests differentiation from Work resources

#### 3.5 Cost Resources
- ResourceType: 'Cost'
- Tests differentiation from Work resources

#### 3.6 Resource with All Rate Types
- StandardRate, OvertimeRate, CostPerUse all populated
- Tests currency column formatting

#### 3.7 Resource with Null Rates
- All rate fields null
- Tests default currency handling

#### 3.8 Resource MaxUnits Variations
- 0.0 (0%)
- 0.5 (50%)
- 1.0 (100%)
- 1.5 (150%, overallocated)
- null
- Tests percentage conversion

#### 3.9 Resource Boolean Fields
- IsActive: true/false
- IsGeneric: true/false
- Tests CHECKBOX columns

#### 3.10 Department Values
- Various department names
- null department
- Tests picklist option discovery

### 4. Assignment Entity Variations

#### 4.1 Task with Single Work Assignment
- One Work resource assigned
- Tests MULTI_CONTACT_LIST column with single contact

#### 4.2 Task with Multiple Work Assignments
- Multiple Work resources assigned
- Tests MULTI_CONTACT_LIST with multiple contacts

#### 4.3 Task with Material Assignments
- Material resources assigned
- Tests MULTI_PICKLIST column for Equipment

#### 4.4 Task with Cost Assignments
- Cost resources assigned
- Tests MULTI_PICKLIST column for Cost Centers

#### 4.5 Task with Mixed Assignment Types
- Work + Material + Cost assignments on same task
- Tests multiple assignment columns

#### 4.6 Task with No Assignments
- No assignment entities
- Tests empty assignment columns

#### 4.7 Assignment with Work/Actual Work
- Assignment-level work vs task-level work
- Tests aggregation logic

#### 4.8 Assignment with Units Variations
- Units: 0.5 (50% allocation)
- Units: 1.0 (100% allocation)
- Units: 2.0 (200% allocation)
- Tests allocation tracking

#### 4.9 Assignment with Cost Tracking
- Cost, ActualCost, RemainingCost populated
- Tests cost aggregation

### 5. Custom Field Variations

#### 5.1 Text Custom Fields
- ProjectText1-30, TaskText1-30, ResourceText1-30
- Various values including null, empty, long strings
- Tests TEXT_NUMBER columns

#### 5.2 Number Custom Fields
- ProjectNumber1-20, TaskNumber1-20, ResourceNumber1-20
- Integer and decimal values
- Tests numeric conversion

#### 5.3 Date Custom Fields
- ProjectDate1-10, TaskDate1-10, ResourceDate1-10
- Various date formats
- Tests DATE columns

#### 5.4 Flag Custom Fields
- ProjectFlag1-20, TaskFlag1-20, ResourceFlag1-20
- true/false/null values
- Tests CHECKBOX columns

#### 5.5 Cost Custom Fields
- ProjectCost1-10, TaskCost1-10, ResourceCost1-10
- Decimal currency values
- Tests currency formatting

#### 5.6 Duration Custom Fields
- ProjectDuration1-10, TaskDuration1-10
- ISO8601 durations
- Tests duration string conversion

#### 5.7 Custom Fields with Display Names
- Internal name: TaskText1, Display name: "Deliverable Type"
- Tests display name mapping

#### 5.8 Custom Fields with Picklist Options
- Custom field with repeated values across entities
- Tests picklist option discovery

#### 5.9 Empty Custom Fields
- All values null across all entities
- Tests field filtering (should be excluded)

#### 5.10 Formula Custom Fields
- Calculated values in oData response
- Tests static value storage + logging

#### 5.11 Lookup Custom Fields
- Display values from lookup tables
- Tests PMO Standards integration

### 6. PMO Standards Workspace Integration

#### 6.1 Standard Reference Sheets
- Project - Status
- Project - Priority (7 levels)
- Task - Status
- Task - Priority (7 levels)
- Task - Constraint Type
- Resource - Type
- Tests pre-population

#### 6.2 Discovered Field Reference Sheets
- Resource - Department (from data)
- Custom lookup fields (from data)
- Tests dynamic reference sheet creation

#### 6.3 Picklist Column Sourcing
- Columns source from PMO Standards sheets
- Tests contactOptions/options configuration

#### 6.4 Reference Sheet Value Addition
- Existing reference sheet with some values
- New values discovered during migration
- Tests incremental value addition

### 7. Error Conditions and Edge Cases

#### 7.1 Missing Required Fields
- Task without TaskName
- Resource without Name and Email
- Tests error handling

#### 7.2 Invalid Foreign Key References
- Task.ProjectId not found
- Task.ParentTaskId not found
- Assignment.TaskId or ResourceId not found
- Tests graceful degradation

#### 7.3 Circular Dependencies
- Task hierarchy with circular parent references
- Tests cycle detection

#### 7.4 Invalid Data Types
- Non-numeric value in numeric field
- Invalid date string
- Tests type conversion error handling

#### 7.5 Smartsheet API Rate Limiting
- Simulate rate limit response
- Tests exponential backoff

#### 7.6 Smartsheet API Errors
- Sheet creation failure
- Column creation failure
- Row addition failure
- Tests error recovery

#### 7.7 Large Data Sets
- 1000+ tasks in single project
- Tests batch operations

#### 7.8 Unicode and Special Characters
- Names with emojis, accents, CJK characters
- Tests character encoding

## Test Data Builders

### Mock OData Response Builders
```typescript
class ODataProjectBuilder {
  withBasicFields(): this
  withAllFields(): this
  withSpecialCharactersInName(name: string): this
  withLongName(length: number): this
  withPriority(value: number): this
  withNullOptionalFields(): this
  withEdgeDates(): this
  build(): ProjectOnlineProject
}

class ODataTaskBuilder {
  withBasicFields(): this
  withHierarchy(outlineLevel: number, parentId?: string): this
  withDuration(iso8601: string): this
  withPriority(value: number): this
  withMilestone(): this
  withConstraint(type: string, date?: string): this
  withPredecessors(predecessors: string): this
  withCustomFields(fields: Record<string, any>): this
  build(): ProjectOnlineTask
}

class ODataResourceBuilder {
  asWorkResource(): this
  asMaterialResource(): this
  asCostResource(): this
  withEmail(email: string): this
  withRates(standard: number, overtime: number, costPerUse: number): this
  withMaxUnits(units: number): this
  withDepartment(dept: string): this
  build(): ProjectOnlineResource
}

class ODataAssignmentBuilder {
  forTask(taskId: string): this
  withResource(resourceId: string): this
  withWork(iso8601: string): this
  withUnits(units: number): this
  withCost(cost: number): this
  build(): ProjectOnlineAssignment
}
```

## Test Execution Strategy

### 1. Setup Phase
- Create dedicated test Smartsheet workspace
- Initialize PMO Standards workspace
- Configure environment variables
- Set up mock OData client with test scenarios

### 2. Test Isolation
- Each test creates its own project workspace
- Unique project names prevent collisions
- Cleanup after each test

### 3. Verification Points
- Workspace created with correct name
- All sheets present (Tasks, Resources, Project Summary)
- Column structure matches specification
- Row count matches input data
- Cell values correctly transformed
- Relationships preserved (hierarchy, assignments, predecessors)
- PMO Standards reference sheets populated

### 4. Cleanup Phase
- Delete test workspaces
- Preserve PMO Standards workspace (reusable)
- Log test execution metrics

## Success Criteria

### Coverage Requirements
- ✅ All 7 priority levels tested
- ✅ All 3 resource types tested with correct column types
- ✅ All 8 constraint types tested
- ✅ All custom field types tested
- ✅ Hierarchy depth to 5+ levels tested
- ✅ Mixed assignment types tested
- ✅ All duration formats tested
- ✅ All date edge cases tested
- ✅ Character encoding tested
- ✅ Error conditions tested
- ✅ PMO Standards integration tested
- ✅ System columns pattern tested

### Quality Gates
- All tests pass with real Smartsheet API
- No manual Project Online testing required
- Comprehensive edge case coverage
- Clear test failure messages
- Test execution < 5 minutes

## Configuration

### Environment Variables Required
```env
# Smartsheet API
SMARTSHEET_API_TOKEN=your_token_here

# Test Configuration
TEST_WORKSPACE_PREFIX="ETL Test -"
CLEANUP_TEST_WORKSPACES=true
PRESERVE_PMO_STANDARDS=true
```

### Test Data Location
- Mock responses: `test/fixtures/odata-responses/`
- Expected Smartsheet data: `test/fixtures/smartsheet-expected/`
- Test scenarios: `test/integration/scenarios/`