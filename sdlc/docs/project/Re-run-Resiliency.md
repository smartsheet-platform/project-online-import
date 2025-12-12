**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Using Workspace Templates](./Template-Based-Workspace-Creation.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Sheet Connections →](./Sheet-References.md) |
|:---|:---:|---:|

</div>

---

# Safe Re-runs

**Last Updated**: 2025-12-05

## What This Means

If you need to run a migration more than once for any reason, the tool protects against creating duplicate sheets or columns. This makes it safe to retry a migration if something goes wrong.

---

## Why This Matters

### When You Might Run a Migration Twice

You might need to run a migration again if:

1. **The Migration Stops Partway Through**: Network issues or other interruptions occur
2. **You Want to Update Data**: Running the migration again after making changes in Project Online
3. **You're Testing**: Trying out the migration before committing to it
4. **You Had an Issue**: Fixing a configuration problem and trying again

### What Could Go Wrong Without Protection

Without this safety feature, running a migration twice would cause:

- **Duplicate Sheets**: The tool would try to create sheets that already exist
- **Duplicate Columns**: Attempting to add columns that are already there
- **Error Messages**: Smartsheet would reject the duplicate attempts
- **Data Confusion**: Multiple versions of the same information
- **Unnecessary Work**: Repeating operations that already completed

---

## How the Protection Works

### Sheet-Level Protection

Before creating a new sheet, the tool checks if a sheet with that name already exists in your workspace. If it finds one, it uses that existing sheet instead of creating a duplicate.

**What Happens**:
- Tool looks for a sheet with the same name
- If found: Uses the existing sheet
- If not found: Creates a new sheet

### Column-Level Protection

Before adding a column to a sheet, the tool checks if a column with that name already exists. If it does, the existing column is used instead of adding a duplicate.

**What Happens**:
- Tool checks for columns with the same name
- Existing columns: Kept and reused
- New columns: Added to the sheet
- Result: You see which columns were added versus which already existed

Example of what you might see:
```
Results:
- Start Date: Created (new column)
- End Date: Created (new column)
- Status: Already exists (reused existing)
```

---

## Benefits for You

### Safety and Reliability

- **Safe Retries**: Run the migration again without worrying about duplicates
- **Resume from Interruptions**: Continue where you left off if something stops the migration
- **Efficiency**: Skips work that's already done
- **Clean Results**: No manual cleanup needed after retries

### When Testing

- **Experiment Freely**: Try different approaches without creating a mess
- **Easy Troubleshooting**: Re-run specific parts to diagnose issues
- **No Cleanup Needed**: Don't have to manually remove duplicate content

---

## What Gets Protected

### Always Protected

✅ **Use for these operations:**
- Creating new sheets in workspaces
- Adding columns to sheets
- Any operation you might need to run more than once

### Not Needed for Protection

❌ **Don't use for:**
- Adding data rows (new data is always new)
- Updating existing information (updates are already safe)
- One-time setup operations

---

<div align="center">

| [← Previous: Using Workspace Templates](./Template-Based-Workspace-Creation.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Sheet Connections →](./Sheet-References.md) |
|:---|:---:|---:|

</div>