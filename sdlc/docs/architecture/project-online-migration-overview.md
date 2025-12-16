**📚 Implementation Guide Series**

<div align="center">

| **Start of Series** | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: System Design →](./02-etl-system-design.md) |
|:---|:---:|---:|

</div>

---


# Migrating from Project Online to Smartsheet

**Last Updated**: 2024-12-08  

## Overview

If you're using Microsoft Project Online and evaluating migration options, this guide explains how to move your project data to Smartsheet. The migration process preserves your project structure, tasks, resources, and assignments while transitioning to a modern work management platform.

### What This Tool Does

The migration tool:
- Connects to your existing Project Online environment
- Extracts all your project data including tasks, resources, and assignments
- Converts the data to work in Smartsheet's structure
- Creates organized workspaces in Smartsheet with your projects
- Maintains all relationships between tasks, resources, and assignments
- Handles errors and can resume if interrupted

### Migration Structure

Each of your Project Online projects becomes a dedicated Smartsheet workspace:

```
Your Project Online Project "Website Redesign Q1"
    ↓ MIGRATION ↓
Smartsheet Workspace "Website Redesign Q1"
├── Sheet: Website Redesign Q1 - Summary (project overview)
├── Sheet: Website Redesign Q1 - Tasks (your task list with hierarchy)
└── Sheet: Website Redesign Q1 - Resources (your team members and resources)
```

### Key Features

1. **One-to-One Project Mapping**: Each Project Online project becomes its own Smartsheet workspace for clear organization
2. **Name Preservation**: Your workspace names match your Project Online project names
3. **Embedded Assignments**: Team member assignments appear directly in your task list
4. **Centralized Standards**: Status and priority values are managed centrally across all your projects

## How Your Data Transforms

| Your Project Online Data | Becomes in Smartsheet | How It Works |
|----------------------|---------------------|--------------|
| **Project** | Workspace + Summary Sheet | Each project gets its own dedicated workspace |
| **Task** | Row in Tasks Sheet | Your task hierarchy is preserved with parent-child relationships |
| **Resource** | Row in Resources Sheet | Your team members and resources with their information |
| **Assignment** | Column in Tasks Sheet | Who's assigned to each task appears right in the task list |

### Data Flow

The migration follows these steps:

```
┌─────────────────┐
│ Project Online  │ 1. Connect & Authenticate
│   Your Data     │ ─────────────────┐
└────────┬────────┘                  │
         │                           │
         │ 2. EXTRACT                ▼
         │ • Projects              ┌────────────────┐
         │ • Tasks                 │  Migration     │
         │ • Resources             │  Process       │
         │ • Assignments           │                │
         ▼                         │  - Validate    │
┌─────────────────┐                │  - Convert     │
│ Temporary       │◄───────────────┤  - Organize    │
│ Data Storage    │                └────────┬───────┘
└────────┬────────┘                         │
         │                                  │
         │ 3. TRANSFORM                     │ 4. LOAD
         ▼                                  ▼
┌─────────────────┐                ┌────────────────┐
│ Smartsheet      │◄───────────────│ Create Your    │
│ Ready Format    │                │ Workspaces     │
└────────┬────────┘                └────────────────┘
         │
         │ 5. CREATE
         ▼
┌─────────────────┐
│  Smartsheet     │
│  - Workspaces   │
│  - Sheets       │
│  - Tasks        │
│  - Relationships│
└─────────────────┘
```

## Technical Foundation

The migration tool uses:

**For Connecting to Project Online**:
- Microsoft's authentication system (OAuth 2.0)
- Secure token-based access
- Automatic pagination for large datasets

**For Creating in Smartsheet**:
- Smartsheet's official software development kit
- Batch operations for efficiency
- Automatic retry logic for reliability

### What You'll Need

To run the migration, you'll need:

1. **Project Online Access**:
   - Azure Active Directory tenant information
   - Application credentials for secure access
   - Your Project Online site URL

2. **Smartsheet Access**:
   - A Smartsheet account with workspace creation permissions
   - API access token

3. **Configuration**:
   - A configuration file (`.env`) with your credentials
   - Node.js installed on your computer (version 18 or newer)

### Basic Usage

```bash
# Preview the migration without making changes
npm start -- import --source <your-project-id> --destination <workspace-id> --dry-run

# Validate your Project Online connection
npm start -- validate --source <your-project-id>

# Run the actual migration
npm start -- import --source <your-project-id> --destination <workspace-id>

# See detailed progress information
npm start -- import --source <your-project-id> --destination <workspace-id> --verbose
```

## What Gets Migrated

The tool migrates all essential project data:

### Project Information
- Project name, description, and status
- Start and finish dates
- Priority levels
- Project owner information
- Completion percentage

### Tasks
- All tasks with their hierarchical structure
- Task names, descriptions, and notes
- Start dates, end dates, and durations
- Status and priority for each task
- Dependencies between tasks (predecessors)
- Milestones
- Constraint types and dates
- Work hours (planned and actual)

### Resources
- Team member names and contact information
- Resource types (people, equipment, costs)
- Rates and availability
- Department assignments
- Active status

### Assignments
- Which resources are assigned to which tasks
- Assignment types properly distinguished
- Team member assignments enable collaboration features

## Migration Quality

The tool maintains high data integrity:

- **Data Accuracy**: All data is validated before and after migration
- **Relationship Preservation**: Task hierarchies, dependencies, and assignments are maintained
- **Error Handling**: Automatic retry logic handles temporary issues
- **Resume Capability**: Can continue if the migration is interrupted

## Security and Privacy

Your data remains secure throughout the migration:

- **Read-Only Access**: The tool only reads from Project Online, never modifies your original data
- **Encrypted Transfer**: All data transfers use secure HTTPS connections
- **Credential Protection**: Your credentials are stored locally and never logged
- **Audit Trail**: Smartsheet tracks who created and modified data

## Next Steps

Ready to learn more about how the migration works? The next guide explains the technical architecture and components.

---

<div align="center">

| **Start of Series** | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: System Design →](./02-etl-system-design.md) |
|:---|:---:|---:|

</div>