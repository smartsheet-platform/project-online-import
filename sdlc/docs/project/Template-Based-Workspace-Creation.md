<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🏗️ How it Works</h1>

[🎯 Migrating](../architecture/project-online-migration-overview.md) · 🏗️ How it Works · [🛠️ Contributing](../code/conventions.md)

</div>

<div align="center">

[← Previous: Workspace Creation Strategies](../architecture/Factory-Pattern-Design.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Safe Re-runs →](./Re-run-Resiliency.md)

</div>

---


# Using Workspace Templates

## What This Feature Does

When migrating your projects, the tool can use a pre-configured template to create your new Smartsheet workspaces. This means your workspaces start with all the right columns and sheet structure already set up.

## Why Use a Template

**Consistency**: Every project workspace you migrate has the same structure, making it easier to work across multiple projects.

**Pre-configured Columns**: Complex column settings like dropdown lists and contact lists are already set up correctly.

**Simplicity**: The template defines the standard structure once, and every migration uses it.

## How It Works

### Setting Up the Template

You can optionally specify a template workspace in your configuration file (`.env`):

```bash
# Optional: Use a template workspace
TEMPLATE_WORKSPACE_ID=your_template_id_here

# Or leave empty to create workspaces from scratch
TEMPLATE_WORKSPACE_ID=
```

**What the Tool Does**:
- **If you specify a template**: Copies that workspace and customizes it for each project
- **If you don't specify**: Creates a blank workspace and builds it from scratch

### Template Contents

Your template workspace should contain:
- **Summary Sheet**: All 15 project information columns properly configured
- **Tasks Sheet**: All 18 task columns including duration and dependencies
- **Resources Sheet**: All 18 resource columns with dropdown lists and checkboxes

### Migration Process

When you run a migration using a template:

1. **Copies the Template**: Makes a complete copy of your template workspace
2. **Renames Sheets**: Updates sheet names to match your project:
   - `Tasks` becomes `{Your Project Name} - Tasks`
   - `Resources` becomes `{Your Project Name} - Resources`  
   - `Summary` becomes `{Your Project Name} - Summary`
3. **Clears Sample Data**: Removes any rows from the template, keeping only the column structure
4. **Loads Your Data**: Fills the sheets with your actual project information

## Managing Your Template

### When to Update the Template

You'll want to update your template workspace when:
- You want to change which columns appear
- You need to reorder columns
- Column formatting needs adjustment
- You want to add new sheets

### How to Update

1. Make changes directly to your template workspace in Smartsheet
2. Test that the changes work by running a sample migration
3. Update the `TEMPLATE_WORKSPACE_ID` in your configuration if you're using a different template

No code changes are needed - the tool automatically uses whatever template you configure.

### Creating a New Template

If you need to set up a new template:

1. Create a new workspace in Smartsheet with the structure you want
2. Add all the sheets with the columns configured properly
3. Optionally add sample data to see what it looks like (the tool will remove this during migration)
4. Note the workspace ID and add it to your `.env` configuration file:
   ```bash
   TEMPLATE_WORKSPACE_ID=your_new_template_id_here
   ```

## Testing Your Template

You can test that your template works correctly by running the migration with sample data. The tool will verify:
- The new workspace is created successfully
- Sheets have the correct names
- All expected columns are present
- Sample data is removed before your real data is loaded

---

<div align="center">

[← Previous: Workspace Creation Strategies](../architecture/Factory-Pattern-Design.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Safe Re-runs →](./Re-run-Resiliency.md)

</div>