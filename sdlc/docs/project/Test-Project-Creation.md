
<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🎯 Migrating to Smartsheet</h1>

🎯 Migrating · [🏗️ How it Works](./ETL-System-Design.md) · [🛠️ Contributing](../code/Conventions.md)

</div>

<div align="center">

[← Previous: Authentication Setup](./Authentication-Setup.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>

---

# Creating Test Projects in Project Online

This guide walks you through manually creating a test project in Project Online for end-to-end integration testing and data extraction.

## When to Use This Guide

Use this guide when you need:

- **Real Project Online data** for integration testing
- **Schema validation** - verify your type definitions match actual Project Online responses
- **E2E pipeline testing** - validate the complete extraction → transformation → loading flow
- **Sample data** to understand Project Online's data structure

## Prerequisites

Before you begin, ensure you have:

### 1. Project Online Access

- ✅ Access to your Project Online instance (e.g., `https://your-tenant.sharepoint.com/sites/pwa`)
- ✅ Permission to create Enterprise Projects
- ✅ Project Online Plan 3 (P3) license

### 2. Required Time

- **15-20 minutes** to create the test project
- **5-10 minutes** to extract and verify the data

### 3. Tool Setup Complete

- ✅ Authentication configured (see [Authentication-Setup.md](./Authentication-Setup.md))
- ✅ Connection test passing: `npm run test:connection`
- ✅ Extraction script ready: `npm run extract-real-data`

## Test Project Structure

The test project you'll create includes:

```
Enterprise Website Redesign - Test Data
├── Project Initiation (Summary, 5 days)
│   ├── Requirements Gathering (3 days) → Sarah (100%), Michael (50%)
│   └── Stakeholder Sign-off (Milestone) [depends on Requirements]
└── Design Phase (Summary, 20 days) [depends on Sign-off]
    └── UI/UX Design (15 days) → Sarah (100%), Michael (100%)
```

**Resources:**
- Sarah Johnson ($85/hr, Development Team)
- Michael Chen ($80/hr, Development Team)

**Features This Tests:**
- Task hierarchy (2 levels)
- Summary tasks and subtasks
- Milestone tasks
- Task dependencies (predecessors)
- Work resources with rates
- Resource assignments with hours and costs

## Step-by-Step Instructions

### Step 1: Create the Project

1. **Navigate to Project Online**
   ```
   https://your-tenant.sharepoint.com/sites/pwa/Projects.aspx
   ```

2. **Create New Project**
   - Click the **"New"** button in the top ribbon
   - Select **"Enterprise Project"** from the dropdown
   - A new project window will open

3. **Configure Project Properties**
   - **Project Name:** `Enterprise Website Redesign - Test Data`
   - **Description:** `Integration test project for E2E validation`
   - **Start Date:** `01/15/2024`
   - Click **Finish**

### Step 2: Add Tasks

Create these tasks directly in the grid:

#### Task 1: Project Initiation (Summary)
| Field | Value |
|-------|-------|
| **Name** | `Project Initiation` |
| **Duration** | `5` |
| **Start** | `01/15/2024` |

#### Task 2: Requirements Gathering
| Field | Value |
|-------|-------|
| **Name** | `Requirements Gathering` |
| **Duration** | `3` |
| **Start** | `01/15/2024` |
| **Action** | Use **Indent** button to make this a subtask of "Project Initiation" |

#### Task 3: Stakeholder Sign-off (Milestone)
| Field | Value |
|-------|-------|
| **Name** | `Stakeholder Sign-off` |
| **Duration** | `0` |
| **Start** | `01/19/2024` |
| **Action** | Indent under "Project Initiation" |

**To add predecessor (Task 2 → Task 3):**
- **Option A**: Right-click Task 3 row → **Task Information** → **Predecessors** tab → Add Task 2
- **Option B**: Add "Predecessors" column to view → Enter `2` in Task 3's Predecessors cell
- **Option C**: Select both Task 2 and Task 3 → Click **Link Tasks** button (if available in ribbon)
- **Result**: Task 3 should start after Task 2 finishes (Finish-to-Start relationship)

#### Task 4: Design Phase (Summary)
| Field | Value |
|-------|-------|
| **Name** | `Design Phase` |
| **Duration** | `20` |
| **Start** | `01/22/2024` |
| **Predecessor** | Add Task 3 as predecessor (same method as above: right-click → Task Information → Predecessors → Add Task 3) |

#### Task 5: UI/UX Design
| Field | Value |
|-------|-------|
| **Name** | `UI/UX Design` |
| **Duration** | `15` |
| **Start** | `01/22/2024` |
| **Action** | Indent under "Design Phase" |

**Save all tasks**

### Step 3: Add Resources

Navigate to the Resources section:

#### Resource 1: Sarah Johnson
- **Name:** `Sarah Johnson`
- **Type:** `Work`
- **Email:** `sarah.johnson@company.com`
- **Standard Rate:** `$85/hour`
- **Initials:** `SJ`
- **Group:** `Development Team`

#### Resource 2: Michael Chen
- **Name:** `Michael Chen`
- **Type:** `Work`
- **Email:** `michael.chen@company.com`
- **Standard Rate:** `$80/hour`
- **Initials:** `MC`
- **Group:** `Development Team`

**Save all resources**

---

### Step 3.5: Enable Edit Mode and Build Team

**Critical:** Before assigning resources, enable edit mode and build the Project Team.

#### A. Activate Edit In Browser Mode

1. Click the **TASK** tab in the ribbon
2. Click the **"Edit"** button (far left, pencil icon)
3. Select **"In Browser"** from dropdown
4. Grid cells become white and editable

#### B. Build the Project Team

1. Click the **PROJECT** tab in the ribbon
2. Click **"Build Team"** button
3. In the Build Team window:
   - **Left:** Enterprise Resource Pool
   - **Right:** Project Team
4. Add resources:
   - Find **Sarah Johnson** → Click **"Add >"**
   - Find **Michael Chen** → Click **"Add >"**
5. Click **"Save & Close"**

---

### Step 4: Assign Resources to Tasks

Now resources will appear in assignment dropdowns:

#### Task 2: Requirements Gathering
- **Click** in "Resource Name" cell for Task 2
- **Select** from dropdown: Sarah Johnson, Michael Chen
- Or right-click Task 2 → Task Information → Resources tab

#### Task 5: UI/UX Design
- **Click** in "Resource Name" cell for Task 5
- **Select** from dropdown: Sarah Johnson, Michael Chen

**Save the project**

### Step 5: Publish the Project

1. **Review** your project structure
   - Verify all 5 tasks are present
   - Check that task hierarchy shows properly
   - Confirm all 4 resource assignments are in place

2. **Publish**
   - Click **File** → **Publish** (or find the Publish button in ribbon)
   - Confirm the publish operation
   - Wait for "Project published successfully" message

3. **Verify in Project List**
   - Navigate back to Projects list
   - Confirm "Enterprise Website Redesign - Test Data" appears
   - Note the Project ID for the next step

## Extract the Real Data

Once the project is published, extract it using the API:

```bash
# List all projects to verify it's there
npm run extract-real-data --list

# Extract the test project (copy project ID from the list)
npm run extract-real-data <project-id>

# Or extract the first available project
npm run extract-real-data
```

**What this creates:**

The extraction script generates:
- `test/integration/fixtures/real-data/<date>-<project-name>-complete.json` - Full project data
- `test/integration/fixtures/real-data/<date>-<project-name>-schema.json` - Schema analysis
- `test/integration/fixtures/real-data/<date>-<project-name>-samples/` - Sample entities
- `test/integration/fixtures/real-data/<date>-<project-name>-README.md` - Documentation

## Use in Integration Tests

Import the extracted data in your tests:

```typescript
import realData from './fixtures/real-data/2024-12-30-enterprise-website-redesign-complete.json';

const { project, tasks, resources, assignments } = realData;

// Validate complete E2E flow:
// Project Online → Extract → Transform → Smartsheet
```

## Troubleshooting

### Can't Find "Enterprise Project" Option

**Problem:** "New" button doesn't show "Enterprise Project"  
**Solution:** Your account may lack project creation permissions. Contact your Project Online administrator to request access.

### Project Doesn't Appear After Publishing

**Problem:** Project saved but not visible in Projects list  
**Solution:** 
- Ensure you clicked **Publish** (not just Save)
- Unpublished or draft projects don't appear via REST API
- Wait 1-2 minutes for indexing, then refresh the Projects list

### Extraction Returns 0 Projects

**Problem:** `npm run extract-real-data --list` shows 0 projects  
**Solution:** 
- Verify the project appears in Project Online web UI
- Wait a few minutes for Project Online indexing
- Confirm PROJECT_ONLINE_URL in `.env.test` matches your PWA site
- Ensure you published the project (not just saved as draft)

### Task Hierarchy Not Preserved

**Problem:** All tasks appear at the same level  
**Solution:** Use the **Indent** and **Outdent** buttons in the task view to create parent-child relationships. Summary tasks should be outdented, subtasks should be indented.

### Extraction Script Fails with 404

**Problem:** Script shows "Project not found" or 404 error  
**Solution:**
- Verify the project ID is correct
- Use `--list` flag first to see all available projects
- Check that the project is published (not in draft status)

## Understanding What This Validates

Creating a real test project proves your E2E pipeline:

1. **✅ API Client** - Successfully extracts data from Project Online
2. **✅ Type Definitions** - TypeScript interfaces match actual Project Online schema
3. **✅ Transformers** - Handle real data structure correctly
4. **✅ Complete ETL** - Data flows from Project Online through to Smartsheet

**This is more valuable than generated fixtures** because it validates against the actual Project Online API and schema, not assumptions.

## Alternative: Generated Fixtures

If you cannot create projects in Project Online (permissions or access issues), realistic fallback fixtures are available:

```bash
npm run generate-fixtures
```

These fixtures:
- Match Project Online schema exactly
- Pass all integration tests
- Enable development without Project Online access

**However**, they don't validate actual API extraction, which is why real data is preferred.

---

## Next Steps

After creating and extracting your test project:

1. ✅ **Verify** extraction completed successfully
2. ✅ **Review** the schema analysis report
3. ✅ **Update** integration tests to use real data
4. ✅ **Run** integration tests: `npm run test:integration`
5. ✅ **Confirm** E2E pipeline works with real Project Online data

**You now have real Project Online data for comprehensive E2E testing!**

---

<div align="center">

[← Previous: Authentication Setup](./Authentication-Setup.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>
