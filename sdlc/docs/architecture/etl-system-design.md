<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🏗️ How it Works</h1>

[🎯 Migrating](./project-online-migration-overview.md) · 🏗️ How it Works · [🛠️ Contributing](../code/conventions.md)

</div>

<div align="center">

[← Previous: Migration Overview](./project-online-migration-overview.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Data Transformation Guide →](./data-transformation-guide.md)

</div>

---

# System Design

## How the Migration Tool Works

The migration tool is organized into six main components, each handling a specific part of moving your data from Project Online to Smartsheet.

### 1. Command Interface

**What It Does**: Provides the commands you use to run migrations

**Available Commands**:

```bash
# Run a complete migration
po-import import --source <your-project-id> --destination <workspace-id>

# Check your Project Online data before migrating
po-import validate --source <your-project-id>

# Preview the migration without making changes
po-import import --source <your-project-id> --destination <workspace-id> --dry-run

# View your current configuration
po-import config
```

**Key Features**:
- Parses your command options
- Loads your configuration settings
- Shows you progress as the migration runs
- Displays helpful error messages if something goes wrong
- Lets you preview changes before committing

### 2. Migration Coordinator

**What It Does**: Manages the overall migration workflow

The coordinator runs through these stages:

```
1. Initialization → Checks your configuration is valid
2. Extraction → Fetches your data from Project Online
3. Transformation → Converts your data for Smartsheet
4. Loading → Creates your workspaces and sheets in Smartsheet
5. Completion → Reports the results
```

**Features**:
- Automatically retries if temporary issues occur
- Validates your data before migration
- Supports preview mode so you can test first
- Handles errors gracefully with clear messages

### 3. Data Extraction

**What It Does**: Retrieves your project data from Project Online

**How It Works**:
- Authenticates securely to your Project Online environment
- Automatically handles large projects with many tasks
- Respects rate limits to avoid overloading the system
- Retries automatically if network issues occur
- Tests connectivity before starting

**What It Extracts**:
- Your project information and metadata
- All tasks with their hierarchy and relationships
- Your resources (team members, equipment, costs)
- All assignments linking resources to tasks

**Error Protection**:
- Automatic retry with increasing wait times on failures
- Detection and handling of rate limits
- Detailed logging to help troubleshoot any issues
- Graceful handling if some data is missing

### 4. Data Transformation

**What It Does**: Converts your Project Online data into Smartsheet format

The transformation handles these conversions:

#### Your Project Information
- Creates workspace structure
- Generates a summary sheet with your project metadata
- Validates your project data
- Sets up consistent dropdown lists (status, priority)

**Features**:
- Uses templates for faster workspace creation
- Cleans up project names to work in Smartsheet
- Configures dropdown lists that reference central standards

#### Your Tasks
- Creates 18 columns to hold all your task information
- Builds each task row preserving your hierarchy
- Converts task status and priority values
- Handles predecessor relationships between tasks
- Sets up dropdown lists for consistency

**Features**:
- Maintains your task hierarchy through parent-child relationships
- Enables Gantt chart view automatically
- Calculates duration based on your start and end dates
- Handles 8 constraint types (start as soon as possible, finish by date, etc.)
- Can safely re-run if the migration is interrupted

#### Your Resources
- Creates 18 columns for resource information
- Builds a row for each of your team members and resources
- Discovers and lists your department values
- Validates resource data
- Sets up dropdown lists

**Features**:
- Keeps email addresses separate from names
- Handles people, equipment, and cost resources differently
- Manages standard rates, overtime rates, and cost per use
- Converts availability percentages properly
- Can safely re-run without creating duplicates

#### Your Assignments
- Creates columns on your task sheet for assignments
- Groups resources by type (people vs equipment/costs)
- Generates one column per unique resource

**Important Feature**: Assignment columns work differently based on type:
- **People resources** → Collaboration-enabled columns (you can @mention team members)
- **Equipment/cost resources** → Simple selection lists (text-based)

**Features**:
- Creates columns dynamically based on your actual assignments
- Handles re-runs safely
- Uses the right column type for people vs non-people resources

#### Standards Management
- Manages centralized reference lists for dropdown values
- Creates reference sheets for status, priority, and other standard fields
- Discovers values from your data (like department names)

**Reference Sheets Created**:
- Project - Status (Active, Planning, etc.)
- Project - Priority (Highest, High, Medium, etc.)
- Task - Status (Not Started, In Progress, Complete)
- Task - Priority (same levels as project priority)
- Task - Constraint Type (8 different constraint types)
- Resource - Type (People, Equipment, Cost)
- Resource - Department (discovered from your data)

**Benefits**:
- Enables consistent dropdown lists across all your projects
- Centralizes value management
- Single source of truth for your organization's standards

#### Common Conversions
- Cleans workspace names to remove invalid characters
- Converts ISO dates to standard format
- Converts durations to hours or days
- Maps numeric priorities to text labels
- Creates contact objects with names and emails
- Generates consistent sheet names

### 5. Smartsheet Integration

**What It Does**: Creates your workspaces, sheets, and data in Smartsheet

**Operations**:
- Creates workspaces for your projects
- Creates sheets with proper column definitions
- Inserts your data in batches for efficiency
- Configures dropdown lists and references
- Sets up cross-sheet references for consistency

**Smart Features**:
- Automatically handles rate limits
- Retries operations if temporary failures occur
- Provides detailed feedback if issues arise

### 6. Helper Utilities

**What They Do**: Provide supporting functions throughout the migration

**Configuration Management**:
- Loads and validates your settings
- Ensures all required credentials are present
- Provides clear error messages for configuration issues

**Progress Tracking**:
- Shows real-time progress as the migration runs
- Breaks complex operations into trackable phases
- Estimates time remaining for long operations

**Error Handling**:
- Categorizes errors by type (configuration, network, data issues)
- Provides actionable guidance for fixing problems
- Makes error messages user-friendly

**Retry Logic**:
- Configurable retry attempts (default: 3-5 tries)
- Increasing wait times between retries (1 to 30 seconds)
- Applied to all network operations

**Re-run Support**:
- Reuses existing sheets by name if you run multiple times
- Skips columns that already exist
- Prevents data duplication
- Enables safe retries if migrations are interrupted

## What You'll See

### During a Successful Migration

```
[2024-12-08 10:30:00] Starting Project Online to Smartsheet Migration
[2024-12-08 10:30:01] Configuration loaded successfully

[2024-12-08 10:30:02] ========== EXTRACTING YOUR DATA ==========
[2024-12-08 10:30:03] Connecting to Project Online...
[2024-12-08 10:30:05] ✓ Connected successfully
[2024-12-08 10:30:05] Extracting your project data...
[2024-12-08 10:30:08] ✓ Extracted project information
[2024-12-08 10:30:08] ✓ Extracted 25 tasks
[2024-12-08 10:30:09] ✓ Extracted 8 resources
[2024-12-08 10:30:10] ✓ Extracted 45 assignments
[2024-12-08 10:30:10] Extraction completed

[2024-12-08 10:30:11] ========== CONVERTING YOUR DATA ==========
[2024-12-08 10:30:11] Validating extracted data...
[2024-12-08 10:30:12] ✓ Data validation passed
[2024-12-08 10:30:12] Converting project structure...
[2024-12-08 10:30:13] ✓ Project converted
[2024-12-08 10:30:13] ✓ 25 tasks converted
[2024-12-08 10:30:14] ✓ 8 resources converted
[2024-12-08 10:30:14] Conversion completed

[2024-12-08 10:30:15] ========== CREATING IN SMARTSHEET ==========
[2024-12-08 10:30:15] Connecting to Smartsheet...
[2024-12-08 10:30:16] ✓ Connection established
[2024-12-08 10:30:16] Creating workspace: Marketing Campaign Q1
[2024-12-08 10:30:18] ✓ Workspace created
[2024-12-08 10:30:18] Creating sheets...
[2024-12-08 10:30:22] ✓ Created 3 sheets
[2024-12-08 10:30:22] Loading your data...
[2024-12-08 10:30:35] ✓ Loaded 25 tasks
[2024-12-08 10:30:35] Loading completed

[2024-12-08 10:30:36] ========== MIGRATION COMPLETE ==========
[2024-12-08 10:30:36] Summary:
[2024-12-08 10:30:36]   - Tasks: 25
[2024-12-08 10:30:36]   - Resources: 8
[2024-12-08 10:30:36]   - Assignments: 45
[2024-12-08 10:30:36] View your workspace: https://app.smartsheet.com/workspaces/1234567890
```

### If Issues Occur

```
[2024-12-08 10:35:42] Issue loading data to "Tasks" sheet
[2024-12-08 10:35:42] Rate limit reached - this is temporary
[2024-12-08 10:35:42] Waiting 5 seconds before retry (Attempt 1/3)...
[2024-12-08 10:35:47] Retrying...
[2024-12-08 10:35:49] ✓ Retry successful
```

## Software Requirements

The tool uses these technologies:

**For Connecting to Project Online**:
- Microsoft Authentication Library
- Secure HTTP client

**For Creating in Smartsheet**:
- Official Smartsheet software development kit

**Supporting Tools**:
- Configuration file management
- Progress tracking
- Error handling
- Command-line interface

All required software is included - you just need Node.js installed on your computer.

## Security Measures

### Managing Your Credentials

**Best Practices**:
- All credentials are stored in a local `.env` file
- This file is excluded from version control for security
- A sample template is provided without actual credentials
- Credentials are never displayed in logs or on screen
- Configuration is validated before running

### Protecting Your Data

**Security Features**:
- No personal information is written to logs (only counts and identifiers)
- All transfers use encrypted HTTPS connections
- Smartsheet tracks all changes automatically
- The tool only reads from Project Online, never modifies your original data

### Access Requirements

**What You'll Need**:
- **Project Online**: Read access to your project data
- **Smartsheet**: API token with permission to create workspaces
- **Standards Workspace**: Owner access to manage dropdown list values

## Network Reliability

### Handling Connection Issues

The tool automatically handles network problems:

**Automatic Retries**:
- Retries failed operations with exponential backoff
- Uses connection pooling for efficiency
- Configurable timeout settings
- Increasing delays between retry attempts
- Automatic rate limit detection and throttling

### Re-run Safety

**What Happens If You Run Multiple Times**:
- The tool reuses existing sheets by name
- Skips columns that already exist
- Prevents data duplication
- Safe to continue interrupted migrations
- Can add new columns to existing sheets

**Benefits**:
- Safe to re-run if the migration is interrupted
- Can be used iteratively during testing
- No corruption from multiple runs

## Quality Assurance

### Validation Checks

**During Extraction**:
- Verifies all required fields are present
- Checks for empty or invalid values
- Validates identifier formats
- Confirms date and time formats

**During Transformation**:
- Validates converted values match expected formats
- Checks text lengths don't exceed limits
- Verifies parent-child relationships are valid
- Validates all references between entities
- Confirms numeric values are within acceptable ranges

**Before Creating in Smartsheet**:
- Ensures sheet names are unique within each workspace
- Checks column types are compatible
- Verifies task hierarchy is consistent
- Validates all predecessor references
- Confirms required columns exist
- Prevents duplicate identifiers

## Next Steps

The next guide provides detailed information about how your data is converted from Project Online format to Smartsheet format.

---

<div align="center">

[← Previous: Migration Overview](./project-online-migration-overview.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Data Transformation Guide →](./data-transformation-guide.md)

</div>