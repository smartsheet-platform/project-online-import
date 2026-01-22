<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🏗️ How it Works</h1>

[🎯 Migrating](./Project-Online-Migration-Overview.md) · 🏗️ How it Works · [🛠️ Contributing](../code/Conventions.md)

</div>

<div align="center">

[← Previous: Data Transformation Guide](./Data-Transformation-Guide.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Template Workspace Creation →](./Template-Based-Workspace-Creation.md)

</div>

---

# Workspace Creation Options

## Overview

When you migrate your projects, the tool creates your Smartsheet workspaces in an organized structure. You have options for how this organization works, allowing you to choose what makes sense for your team.

## Default Approach: Independent Workspaces

The tool creates each project as its own independent workspace. This approach keeps your projects clearly separated and easy to manage.

**What you get:**
- One workspace for each Project Online project
- A central Standards workspace that all projects reference for consistent values
- Each workspace is self-contained with its own sheets

**Why this works well:**
- Clear boundaries between projects
- Each workspace can have different access permissions
- Easy to share specific projects with team members
- Straightforward structure that's familiar from Project Online

## Configuration

You can control how workspaces are created through your configuration file:

```bash
# In your .env file
SOLUTION_TYPE=StandaloneWorkspaces  # Default - creates independent workspaces
```

If you don't specify this setting, the tool automatically uses the default approach.

### Optional Settings

**Reuse existing Standards workspace:**
```bash
PMO_STANDARDS_WORKSPACE_ID=your_workspace_id
```

If you've already run a migration and want to reuse the same Standards workspace for new projects, you can provide its identifier here.

**Use a template workspace:**
```bash
TEMPLATE_WORKSPACE_ID=your_template_id
```

If you've created a template workspace with your preferred structure and formatting, the tool can copy from that template for each project migration.

## Future Option: Portfolio Structure

A portfolio-based approach is planned for future releases. This would organize your projects within a hierarchical portfolio structure, similar to how you might organize projects in Project Online.

**What it would provide:**
- Grouped projects under portfolios
- Cross-project reporting and dependencies
- Portfolio-level roll-ups

**Status:** Not yet available - the default independent workspace approach is currently supported

## How It Helps You

### Consistency Across Projects

All your migrated projects reference the same Standards workspace. This means:
- Status values are consistent across all projects
- Priority levels use the same definitions everywhere
- You manage standard values in one place

### Flexibility

Different workspace structures suit different organizational needs:
- **Independent workspaces** work well for distinct projects with different teams
- **Portfolio structure** (future) would work well for related projects that need to share information

### Safe Migrations

The workspace creation process is designed to handle interruptions:
- Can safely re-run if the migration stops partway through
- Checks if workspaces already exist before creating new ones
- Reuses existing resources when appropriate

## What Happens During Migration

When you run a migration, the tool:

1. **Sets up or verifies** your Standards workspace exists (done once for all projects)
2. **Creates your project workspace** with the name matching your Project Online project
3. **Creates three sheets** within the workspace (Summary, Tasks, Resources)
4. **Connects dropdown lists** to your Standards workspace for consistency
5. **Loads your data** into the sheets

This process repeats for each project you migrate, with all projects sharing the same Standards workspace.

<div align="center">

[← Previous: Data Transformation Guide](./Data-Transformation-Guide.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Template Workspace Creation →](../project/Template-Based-Workspace-Creation.md)

</div>