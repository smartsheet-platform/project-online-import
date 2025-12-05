# Smartsheet Cross-Sheet References

## Overview

This document describes how sheets within the Project Online to Smartsheet ETL structure reference each other through Smartsheet's cross-sheet capabilities.

**Last Updated**: 2024-12-05

---

## Reference Architecture

### Reference Types

The ETL tool creates three types of cross-sheet references:

1. **Strict Picklist References** - Column definitions that source values from reference sheets
2. **Contact Column References** - Multi-contact list columns that source from resource sheets
3. **Cell Link References** - Individual cell links (future enhancement)

---

## Strict Picklist References

### Overview

Picklist columns in project sheets reference centralized value lists in the PMO Standards workspace. This ensures data consistency and centralized management.

### Reference Pattern

```
Project Workspace Sheet Column
    ↓ (references via Cell Link)
PMO Standards Reference Sheet Column
```

### Implementation Details

**Column Configuration**:
```typescript
{
  type: 'PICKLIST',
  options: {
    strict: true,  // Enforce values from reference only
    options: [
      {
        value: {
          objectType: 'CELL_LINK',
          sheetId: referenceSheetId,      // PMO Standards sheet ID
          columnId: referenceColumnId      // Reference column ID
        }
      }
    ]
  }
}
```

### Picklist References by Sheet

#### Summary Sheet References

| Column | References Sheet | Reference Column |
|--------|-----------------|------------------|
| Status | PMO Standards/Project - Status | Value |
| Priority | PMO Standards/Project - Priority | Value |

**Values**:
- **Status**: Active, Planning, On Hold, Complete, Cancelled
- **Priority**: Highest, Very High, Higher, Medium, Lower, Very Low, Lowest

#### Task Sheet References

| Column | References Sheet | Reference Column |
|--------|-----------------|------------------|
| Status | PMO Standards/Task - Status | Value |
| Priority | PMO Standards/Task - Priority | Value |
| Constraint Type | PMO Standards/Task - Constraint Type | Value |

**Values**:
- **Status**: Not Started, In Progress, Complete, On Hold, Blocked
- **Priority**: Highest, Very High, Higher, Medium, Lower, Very Low, Lowest
- **Constraint Type**: As Soon As Possible, As Late As Possible, Must Start On, Must Finish On, Start No Earlier Than, Start No Later Than, Finish No Earlier Than, Finish No Later Than

#### Resource Sheet References

| Column | References Sheet | Reference Column |
|--------|-----------------|------------------|
| Resource Type | PMO Standards/Resource - Type | Value |
| Department | PMO Standards/Resource - Department | Value |

**Values**:
- **Resource Type**: Work, Material, Cost
- **Department**: Dynamically discovered from Project Online data (e.g., Engineering, Marketing, Operations)

---

## Contact Column References

### Overview

Multi-contact list columns in Task sheets can reference the Resource sheet's Contact column, enabling:
- Type-ahead selection from resource list
- Automatic email population
- Contact-based features (@mentions, notifications)

### Reference Pattern

```
Task Sheet: Assignment Column (MULTI_CONTACT_LIST)
    ↓ (sources contacts from)
Resource Sheet: Contact Column (CONTACT_LIST)
```

### Implementation Details

**Column Configuration**:
```typescript
{
  type: 'MULTI_CONTACT_LIST',
  contactOptions: [
    {
      sheetId: resourcesSheetId,     // Resource sheet ID
      columnId: resourcesContactColumnId  // Contact column ID
    }
  ]
}
```

### Contact Column References by Resource Type

#### Work Resources (People)

**Task Sheet Column**: Named after resource (e.g., "John Doe")
- **Type**: `MULTI_CONTACT_LIST`
- **References**: Resource Sheet → Contact column
- **Purpose**: Enable collaboration features
- **Data Format**: 
  ```json
  {
    "objectType": "MULTI_CONTACT",
    "values": [
      { "name": "John Doe", "email": "john@example.com" }
    ]
  }
  ```

**Benefits**:
- Type-ahead from resource list
- @mention capability in comments
- Notification integration
- Resource availability tracking (future)

#### Material Resources (Equipment)

**Task Sheet Column**: Named after resource (e.g., "Equipment")
- **Type**: `MULTI_PICKLIST`
- **References**: None (standalone column)
- **Purpose**: Track equipment usage
- **Data Format**:
  ```json
  {
    "objectType": "MULTI_PICKLIST",
    "values": ["Crane A", "Forklift B"]
  }
  ```

**Note**: Material resources do NOT use contact column references because equipment doesn't have email addresses.

#### Cost Resources (Cost Centers)

**Task Sheet Column**: Named after resource (e.g., "Cost Centers")
- **Type**: `MULTI_PICKLIST`
- **References**: None (standalone column)
- **Purpose**: Track cost allocations
- **Data Format**:
  ```json
  {
    "objectType": "MULTI_PICKLIST",
    "values": ["Engineering Dept", "Marketing Budget"]
  }
  ```

**Note**: Cost resources do NOT use contact column references as they represent budget categories, not people.

---

## Reference Configuration Workflow

### Phase 1: Initial Sheet Creation

1. Create PMO Standards workspace and reference sheets
2. Populate reference sheets with standard values
3. Create project workspaces and sheets with basic columns

### Phase 2: Column Configuration

1. **Configure Picklist Columns**:
   ```typescript
   // After sheet creation, update picklist columns
   await configureProjectPicklistColumns(
     client,
     sheetId,
     statusColumnId,
     priorityColumnId,
     pmoStandardsInfo
   );
   ```

2. **Configure Assignment Columns**:
   ```typescript
   // After resource sheet creation, configure task sheet
   await configureAssignmentColumns(
     client,
     taskSheetId,
     assignmentColumnIds,
     resourceSheetId,
     resourceContactColumnId,
     assignmentColumnDefinitions
   );
   ```

### Phase 3: Data Population

1. Populate reference sheets (if not pre-populated)
2. Populate resource sheets
3. Populate task sheets with references

---

## Reference Sheet Structure

### PMO Standards Workspace Layout

```
Workspace: PMO Standards
│
├── Sheet: Project - Status
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: Active, Planning, On Hold, Complete, Cancelled
│
├── Sheet: Project - Priority
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: Highest, Very High, Higher, Medium, Lower, Very Low, Lowest
│
├── Sheet: Task - Status
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: Not Started, In Progress, Complete, On Hold, Blocked
│
├── Sheet: Task - Priority
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: Highest, Very High, Higher, Medium, Lower, Very Low, Lowest
│
├── Sheet: Task - Constraint Type
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: ASAP, ALAP, MSO, MFO, SNET, SNLT, FNET, FNLT
│
├── Sheet: Resource - Type
│   ├── Column: Value (Primary, TEXT_NUMBER)
│   └── Column: Description (TEXT_NUMBER)
│   └── Rows: Work, Material, Cost
│
└── Sheet: Resource - Department
    ├── Column: Value (Primary, TEXT_NUMBER)
    └── Column: Description (TEXT_NUMBER)
    └── Rows: Engineering, Marketing, Operations, etc. (discovered)
```

### Reference Sheet Data

#### Project - Priority Reference

| Value | Description |
|-------|-------------|
| Highest | Critical - Immediate attention required (PO: 1000-858) |
| Very High | High urgency (PO: 857-715) |
| Higher | Above normal priority (PO: 714-572) |
| Medium | Normal priority (PO: 571-429) |
| Lower | Below normal priority (PO: 428-286) |
| Very Low | Low urgency (PO: 285-143) |
| Lowest | Minimal priority (PO: 142-0) |

#### Task - Constraint Type Reference

| Value | Description |
|-------|-------------|
| As Soon As Possible | Start as early as schedule allows |
| As Late As Possible | Start as late as schedule allows |
| Must Start On | Task must start on specific date |
| Must Finish On | Task must finish on specific date |
| Start No Earlier Than | Task cannot start before date |
| Start No Later Than | Task must start by date |
| Finish No Earlier Than | Task cannot finish before date |
| Finish No Later Than | Task must finish by date |

---

## Reference Maintenance

### Adding New Picklist Values

To add a new value to a picklist:

1. **Navigate to PMO Standards workspace**
2. **Open relevant reference sheet**
3. **Add row with new value**
4. **Value immediately available** in all referencing columns

Example - Adding new department:
```
PMO Standards/Resource - Department
Add row: "Product Management" → Available in all Resource sheets
```

### Modifying Existing Values

⚠️ **Warning**: Modifying reference values affects all sheets using them.

1. **Assess impact** - How many sheets reference this value?
2. **Update reference sheet** - Modify value in PMO Standards
3. **Existing data** - Previously selected values remain as-is
4. **New selections** - Users see updated value list

### Removing Values

⚠️ **Warning**: Removing values can break existing data references.

**Recommended approach**:
1. **Add "deprecated" marker** instead of deleting
2. **Communicate change** to users
3. **Data migration** - Update existing selections if needed
4. **Remove after verification** - Only delete when confirmed unused

---

## Reference Integrity

### Validation Rules

**Strict Picklist Enforcement**:
- ✅ Values must exist in reference sheet
- ✅ Manual entry not allowed
- ✅ Type-ahead from reference values only
- ❌ Cannot enter custom values

**Contact Column Enforcement**:
- ✅ Work resources must have valid email
- ✅ Type-ahead from resource list
- ⚠️ Can manually enter new contacts (not recommended)

### Data Quality Checks

**Pre-Import Validation**:
1. Verify PMO Standards workspace exists
2. Verify all reference sheets populated
3. Validate reference sheet IDs available
4. Check resource email addresses valid

**Post-Import Verification**:
1. Verify picklist columns reference correct sheets
2. Verify contact columns source from resource sheet
3. Test picklist value selection
4. Test contact type-ahead

---

## Performance Considerations

### Reference Resolution

**Smartsheet Behavior**:
- References resolved at display time
- No performance impact on large datasets
- Cross-sheet references cached by Smartsheet

**API Considerations**:
- Column configuration is one-time setup
- No ongoing API calls for reference resolution
- Reference updates propagate automatically

### Limitations

**Smartsheet Limits**:
- Maximum cross-sheet references per sheet: No documented limit
- Reference sheet size: Same as regular sheets (20,000 rows)
- Update frequency: Real-time propagation

---

## Troubleshooting

### Common Issues

#### Issue: Picklist Values Not Appearing

**Symptoms**:
- Dropdown shows empty
- Cannot select values

**Solutions**:
1. Verify reference sheet ID correct
2. Check reference column ID correct
3. Verify reference sheet has data
4. Confirm user has access to reference sheet

#### Issue: Contact Type-Ahead Not Working

**Symptoms**:
- Cannot see resource list
- Manual entry required

**Solutions**:
1. Verify resource sheet ID correct
2. Check contact column ID correct
3. Verify resource sheet populated
4. Confirm column type is MULTI_CONTACT_LIST (not MULTI_PICKLIST)

#### Issue: Reference Sheet Not Found

**Symptoms**:
- Error during column configuration
- API returns 404

**Solutions**:
1. Create PMO Standards workspace first
2. Verify workspace ID captured correctly
3. Check sheet names match expected values
4. Verify API token has access to workspace

---

## Migration Scenarios

### Scenario 1: Single Project Migration

```
Setup:
1. Create/verify PMO Standards workspace
2. Create project workspace
3. Create sheets with basic structure
4. Configure column references
5. Populate data

References:
- Summary: 2 picklist references (Status, Priority)
- Tasks: 3 picklist references (Status, Priority, Constraint)
- Resources: 2 picklist references (Type, Department)
- Assignments: N contact references (N = number of Work resources)
```

### Scenario 2: Multi-Project Migration

```
Setup:
1. Create/verify PMO Standards workspace (once)
2. For each project:
   a. Create project workspace
   b. Create sheets
   c. Configure column references (same reference sheets)
   d. Populate data

Efficiency:
- PMO Standards created once
- All projects share same reference sheets
- Consistent values across all projects
- Centralized management
```

---

## Future Enhancements

### Planned Reference Types

1. **Cross-Project Links**
   - Link related tasks across projects
   - Dependencies between projects
   - Resource allocation across projects

2. **Formula-Based References**
   - Calculated fields from resource sheet
   - Rollup summaries to project summary
   - Resource utilization calculations

3. **Report Integration**
   - Cross-workspace reporting
   - Consolidated dashboards
   - Portfolio-level views

---

## Reference Diagram

### Complete Reference Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PMO Standards Workspace                   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Project   │  │    Task     │  │  Resource   │        │
│  │   Status    │  │   Status    │  │    Type     │        │
│  │   Priority  │  │   Priority  │  │  Department │        │
│  │             │  │  Constraint │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────┬─────────────────┬──────────────────┬──────────────┘
         │                 │                  │
         │ Picklist        │ Picklist         │ Picklist
         │ References      │ References       │ References
         │                 │                  │
┌────────▼─────────────────▼──────────────────▼──────────────┐
│              Project Workspace: {ProjectName}               │
│                                                              │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │    Summary    │  │     Tasks      │  │   Resources    ││
│  │               │  │                │  │                ││
│  │  Status ◄─────┼──┤  Status        │  │  Type          ││
│  │  Priority     │  │  Priority      │  │  Department    ││
│  │               │  │  Constraint    │  │  Contact ◄─────┼┤
│  └───────────────┘  │                │  │     ▲          ││
│                     │  Assignments:  │  └─────┼──────────┘│
│                     │  - John Doe────┼────────┘           │
│                     │  - Jane Smith  │  Contact            │
│                     │  - Equipment   │  References         │
│                     └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## API Implementation Examples

### Configure Picklist Column

```typescript
async function configurePicklistColumn(
  client: SmartsheetClient,
  sheetId: number,
  columnId: number,
  referenceSheetId: number,
  referenceColumnId: number
): Promise<void> {
  await client.updateColumn(sheetId, columnId, {
    type: 'PICKLIST',
    options: {
      strict: true,
      options: [
        {
          value: {
            objectType: 'CELL_LINK',
            sheetId: referenceSheetId,
            columnId: referenceColumnId
          }
        }
      ]
    }
  });
}
```

### Configure Contact Column

```typescript
async function configureContactColumn(
  client: SmartsheetClient,
  taskSheetId: number,
  columnId: number,
  resourceSheetId: number,
  resourceContactColumnId: number
): Promise<void> {
  await client.updateColumn(taskSheetId, columnId, {
    type: 'MULTI_CONTACT_LIST',
    contactOptions: [
      {
        sheetId: resourceSheetId,
        columnId: resourceContactColumnId
      }
    ]
  });
}
```

---

## References

- [Architecture Document](Architecture.md)
- [Smartsheet Structure Document](Smartsheet-Structure.md)
- [Smartsheet API - Column Types](https://smartsheet.redoc.ly/#section/Column-Types)
- [Smartsheet API - Cell Links](https://smartsheet.redoc.ly/#section/Cell-Links)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-05  
**Status**: Current Implementation