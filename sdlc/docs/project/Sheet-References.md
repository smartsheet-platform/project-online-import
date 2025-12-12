**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Safe Re-runs](./Re-run-Resiliency.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Authentication Setup →](./Authentication-Setup.md) |
|:---|:---:|---:|

</div>

---


# How Sheets Connect to Each Other

**Last Updated**: 2024-12-05

## What This Means

In your migrated Smartsheet workspaces, sheets can reference each other to maintain consistent data and enable dropdown lists. This ensures your project data stays organized and validated.

---

## Types of Connections

The migration creates two main types of connections between sheets:

1. **Dropdown List References**: Columns that get their valid options from centralized reference sheets
2. **Contact List References**: Team member assignment columns that source from your resources sheet

---

## Dropdown List References

### How It Works

Dropdown list columns in your project sheets get their values from a centralized "Standards" workspace. This keeps your data consistent across all projects.

**The Flow**:
```
Your Project Sheet Column (Status, Priority, etc.)
    ↓ Gets valid values from
Standards Workspace Reference Sheet
```

### Which Columns Use References

#### In Your Project Summary Sheet

| Column | Gets Values From | Example Values |
|--------|------------------|----------------|
| Status | Standards/Project - Status | Active, Planning, Completed, On Hold, Cancelled |
| Priority | Standards/Project - Priority | Highest, Very High, Higher, Medium, Lower, Very Low, Lowest |

#### In Your Tasks Sheet

| Column | Gets Values From | Example Values |
|--------|------------------|----------------|
| Status | Standards/Task - Status | Not Started, In Progress, Complete |
| Priority | Standards/Task - Priority | Highest, Very High, Higher, Medium, Lower, Very Low, Lowest |
| Constraint Type | Standards/Task - Constraint Type | As Soon As Possible, Must Start On, etc. |

#### In Your Resources Sheet

| Column | Gets Values From | Example Values |
|--------|------------------|----------------|
| Resource Type | Standards/Resource - Type | Work (people), Material (equipment), Cost (budget) |

---

## Team Member Assignments

### How It Works

When you assign team members to tasks in Smartsheet, the assignment columns can show a list of your available resources. This makes it easy to select the right people using type-ahead search.

**The Flow**:
```
Task Sheet: Assignment Column (shows team members)
    ↓ Gets team member list from
Resource Sheet: Contact Column (your full team)
```

### Assignment Column Types

#### For People (Team Members)

**What You Get**: Collaboration-enabled columns where you can @mention team members

- **Type-ahead search** from your resource list
- **Automatic email population** when you select someone
- **@mention capability** in comments
- **Notification integration** for updates

**Data Stored**:
- Person's name
- Email address
- Enables all Smartsheet collaboration features

#### For Equipment and Materials

**What You Get**: Simple selection lists for non-people resources

- **Type-ahead search** from equipment/material names
- **No email integration** (equipment doesn't need it)
- **Text-based tracking** of what equipment is used

#### For Cost Centers

**What You Get**: Selection lists for budget tracking

- **Type-ahead search** from cost center names
- **Text-based allocation** tracking
- **No contact features** (these are budget categories, not people)

---

## Standards Workspace Structure

### Centralized Reference Sheets

A single "Standards" workspace contains all the reference sheets with valid dropdown values:

```
Standards Workspace
│
├── Project - Status
│   ├── Value: Active
│   ├── Value: Planning
│   ├── Value: Completed
│   ├── Value: On Hold
│   └── Value: Cancelled
│
├── Project - Priority
│   ├── Value: Highest
│   ├── Value: Very High
│   ├── Value: Higher
│   ├── Value: Medium
│   ├── Value: Lower
│   ├── Value: Very Low
│   └── Value: Lowest
│
├── Task - Status
│   ├── Value: Not Started
│   ├── Value: In Progress
│   └── Value: Complete
│
├── Task - Priority
│   └── (Same levels as Project Priority)
│
├── Task - Constraint Type
│   ├── Value: As Soon As Possible
│   ├── Value: As Late As Possible
│   ├── Value: Start No Earlier Than
│   ├── Value: Start No Later Than
│   ├── Value: Finish No Earlier Than
│   ├── Value: Finish No Later Than
│   ├── Value: Must Start On
│   └── Value: Must Finish On
│
└── Resource - Type
    ├── Value: Work (people)
    ├── Value: Material (equipment)
    └── Value: Cost (budget items)
```

### Standard Values

#### Project Status Options

| Value | What It Means |
|-------|---------------|
| Active | Project is currently being worked on |
| Planning | Project is in planning phase |
| Completed | Project has been finished |
| On Hold | Project is temporarily paused |
| Cancelled | Project has been cancelled |

#### Priority Levels (Same for Projects and Tasks)

| Value | What It Means |
|-------|---------------|
| Highest | Critical - needs immediate attention |
| Very High | High urgency |
| Higher | Above normal priority |
| Medium | Standard priority |
| Lower | Below normal priority |
| Very Low | Low urgency |
| Lowest | Minimal priority |

#### Task Constraint Types

| Value | What It Means |
|-------|---------------|
| As Soon As Possible | Start when schedule allows (earliest possible) |
| As Late As Possible | Start as late as possible (just in time) |
| Start No Earlier Than | Cannot start before specific date |
| Start No Later Than | Must start by specific date |
| Finish No Earlier Than | Cannot finish before specific date |
| Finish No Later Than | Must finish by specific date |
| Must Start On | Must start on exact date |
| Must Finish On | Must finish on exact date |

#### Resource Types

| Value | What It Means |
|-------|---------------|
| Work | People resources (team members) |
| Material | Equipment, supplies, materials |
| Cost | Budget categories, cost centers |

---

## Maintaining Reference Values

### Adding New Values

If you need to add new options to a dropdown list:

1. Open the Standards workspace in Smartsheet
2. Find the relevant reference sheet
3. Add a new row with your new value
4. The value immediately becomes available in all project dropdowns

**Example**: Adding a new project status
```
In Standards workspace:
Open "Project - Status" sheet
Add row: "Archived"
Result: "Archived" now appears in all project summary sheets
```

### Changing Existing Values

**Important**: Changing a value affects all projects using it.

**Steps**:
1. Assess which projects use this value
2. Update the value in the Standards workspace
3. Existing selections in projects remain unchanged
4. New selections show the updated list

### Removing Values

**Important**: Removing values can break existing selections in your projects.

**Recommended Approach**:
1. Mark the value as "deprecated" instead of deleting it
2. Communicate the change to your team
3. Update existing projects to use different values
4. Only remove the value after confirming it's no longer used anywhere

---

## Data Validation

### What Gets Enforced

**For Dropdown Lists**:
- ✅ Values must come from the reference sheet
- ✅ You cannot type in custom values
- ✅ Type-ahead helps you find valid options
- ❌ Invalid values are not accepted

**For Contact Lists (Team Members)**:
- ✅ Team members must have valid email addresses
- ✅ Type-ahead from your resource list
- ⚠️ You can manually add new contacts if needed (though using the resource list is recommended)

### Quality Checks

**Before Migration**:
1. Verifies the Standards workspace exists
2. Confirms all reference sheets are populated
3. Validates that reference connections can be made
4. Checks that team members have email addresses

**After Migration**:
1. Verifies dropdown lists connect to the correct reference sheets
2. Confirms team member assignment columns connect to your resources
3. Tests that you can select values from dropdowns
4. Validates type-ahead search works

---

## Troubleshooting

### Dropdown List Shows Empty

**What you see**:
- Clicking the dropdown shows no options
- Cannot select any values

**How to fix**:
1. Verify the Standards workspace exists and you have access to it
2. Check that the reference sheet has values in it
3. Confirm the reference connection is set up correctly

### Cannot Find Team Members When Assigning

**What you see**:
- Type-ahead doesn't show your resource list
- Have to manually type in names

**How to fix**:
1. Verify your Resources sheet exists and is populated
2. Check that the resources have the Contact column filled in
3. Confirm the column type is set for contacts (not plain text)

### Reference Sheet Not Found

**What you see**:
- Error message during migration
- Cannot complete the reference setup

**How to fix**:
1. Ensure the Standards workspace is created first
2. Verify the workspace ID is correct in your configuration
3. Check that sheet names match what's expected
4. Confirm your access token has permission to access the workspace

---

## Migration Process

### For a Single Project

```
The tool:
1. Sets up or verifies the Standards workspace exists
2. Creates your project workspace
3. Creates sheets with basic structure
4. Connects dropdown lists to Standards workspace
5. Loads your data

Result:
- Your summary sheet has 2 dropdown lists connected (Status, Priority)
- Your tasks sheet has 3 dropdown lists connected (Status, Priority, Constraint Type)
- Your resources sheet has 1 dropdown list connected (Type)
- Your assignments columns are connected to your resources (number varies by project)
```

### For Multiple Projects

```
The tool:
1. Sets up or verifies the Standards workspace (done once)
2. For each project:
   - Creates project workspace
   - Creates sheets
   - Connects dropdown lists (all use the same Standards workspace)
   - Loads data

Benefits:
- Standards workspace created once, used by all projects
- Consistent values across all your projects
- Single place to manage dropdown options
- Easy centralized control
```

---

<div align="center">

| [← Previous: Using Workspace Templates](./Template-Based-Workspace-Creation.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Authentication Setup →](./Authentication-Setup.md) |
|:---|:---:|---:|

</div>