# MR Timestamp Logging

## Overview

Workflow steps in MR feedback processing should print timestamps at the beginning and end to track execution time and provide visibility into processing progress.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Timestamp Format

**Format**: ISO 8601 with timezone information

**Examples**:
- UTC: `2025-10-09T20:00:00.000Z`
- With timezone: `2025-10-09T13:00:00.000-07:00`

## Logging Pattern

### Step Start
```
⏱️ **Step {step_number} Started:** {step_title}
🕐 **Start Time:** {timestamp}
```

**Example**:
```
⏱️ **Step 1 Started:** Discover MR Context
🕐 **Start Time:** 2025-10-09T20:00:00.000Z
```

### Step End
```
✅ **Step {step_number} Completed:** {step_title}
🕐 **End Time:** {timestamp}
⏲️ **Duration:** {duration_seconds}s
```

**Example**:
```
✅ **Step 1 Completed:** Discover MR Context
🕐 **End Time:** 2025-10-09T20:00:30.000Z
⏲️ **Duration:** 30s
```

## Duration Calculation

**Method**:
1. Record start timestamp when step begins
2. Record end timestamp when step completes
3. Calculate difference in seconds
4. Report duration in human-readable format

**Formatting**:
- Under 60 seconds: `{seconds}s`
- 60-3600 seconds: `{minutes}m {seconds}s`
- Over 3600 seconds: `{hours}h {minutes}m {seconds}s`

## Typical Workflow with Timestamps

### Phase 1: MR Discovery
```
⏱️ **Phase 1 Started:** MR Discovery and Mapping
🕐 **Start Time:** 2025-10-09T20:00:00.000Z

⏱️ **Step 1.1 Started:** Identify Current Branch
🕐 **Start Time:** 2025-10-09T20:00:00.000Z
[Executing: source "$(pwd)/.env" && git branch --show-current]
[Current branch: feature/SA-001-task-alert-tool]
✅ **Step 1.1 Completed:** Identify Current Branch
🕐 **End Time:** 2025-10-09T20:00:05.000Z
⏲️ **Duration:** 5s

⏱️ **Step 1.2 Started:** Map to Remote Branch
🕐 **Start Time:** 2025-10-09T20:00:05.000Z
[Executing: source "$(pwd)/.env" && git remote -v && git branch -vv]
[Remote: origin git@gitlab.example.com:group/repo.git]
✅ **Step 1.2 Completed:** Map to Remote Branch
🕐 **End Time:** 2025-10-09T20:00:10.000Z
⏲️ **Duration:** 5s

⏱️ **Step 1.3 Started:** Discover Associated MRs
🕐 **Start Time:** 2025-10-09T20:00:10.000Z
[Calling API: GET /projects/.../merge_requests?source_branch=...]
[Found MR: !123 - "Add Task Alert Tool functionality"]
✅ **Step 1.3 Completed:** Discover Associated MRs
🕐 **End Time:** 2025-10-09T20:00:20.000Z
⏲️ **Duration:** 10s

✅ **Phase 1 Completed:** MR Discovery and Mapping
🕐 **End Time:** 2025-10-09T20:00:20.000Z
⏲️ **Duration:** 20s
```

### Phase 2: Feedback Analysis
```
⏱️ **Phase 2 Started:** MR Feedback Analysis
🕐 **Start Time:** 2025-10-09T20:00:20.000Z

⏱️ **Step 2.1 Started:** Retrieve MR Comments
🕐 **Start Time:** 2025-10-09T20:00:20.000Z
[Execute API calls to retrieve discussions, comments, and feedback]
✅ **Step 2.1 Completed:** Retrieve MR Comments
🕐 **End Time:** 2025-10-09T20:00:35.000Z
⏲️ **Duration:** 15s

⏱️ **Step 2.2 Started:** Categorize Feedback
🕐 **Start Time:** 2025-10-09T20:00:35.000Z
[Analyze and categorize feedback by type and priority]
✅ **Step 2.2 Completed:** Categorize Feedback
🕐 **End Time:** 2025-10-09T20:00:45.000Z
⏲️ **Duration:** 10s

✅ **Phase 2 Completed:** MR Feedback Analysis
🕐 **End Time:** 2025-10-09T20:00:45.000Z
⏲️ **Duration:** 25s
```

### Complete Workflow
```
🎯 **MR Feedback Workflow Started:** Processing MR feedback for SA-001-task-alert-tool
🕐 **Start Time:** 2025-10-09T20:00:00.000Z

[All phases...]

✅ **MR Feedback Workflow Completed:** Processing MR feedback for SA-001-task-alert-tool
🕐 **End Time:** 2025-10-09T20:05:00.000Z
⏲️ **Total Duration:** 5m 0s
```

## Best Practices

1. **Log Immediately**: Print step start timestamp as the very first action in each step
2. **Log Before Completion**: Print step completion timestamp as the very last action before moving to next step
3. **Include MR Context**: Add MR URL and branch name to logs for better traceability
4. **Maintain Log Consistency**: Use the exact same format for all timestamp logs across all MR feedback tasks