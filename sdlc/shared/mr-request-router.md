# MR Request Router

## Overview

Routes MR-related requests to appropriate workflows based on user intent and input patterns. This routing logic enables the MR Actions mode to handle both information queries and feedback processing workflows.

**CRITICAL**: All MR data retrieval MUST use GitLab API calls as defined in [`mr-api-execution-workflow.md`](./mr-api-execution-workflow.md). NO git command-line fallbacks permitted.

## Applies To

- ✅ Roo Modes: MR Actions mode
- ✅ Claude Agents: mr-actions agent

## Request Type Detection

### Information/Status Queries

**Trigger Patterns:**
- "status of MR #286"
- "show me MR 286"
- "what's the status of MR #286"
- "get MR details for #286"
- "tell me about MR 286"
- "display MR #286"
- "check MR 286"
- "MR 286 status"
- "info on MR #286"

**Workflow:** Direct API Query → Return Information (see [`mr-information-workflow.md`](./mr-information-workflow.md))

### Feedback Processing

**Trigger Patterns:**
- "process MR feedback"
- "implement MR suggestions"
- "address code review feedback"
- "process feedback for MR #286"
- "handle reviewer comments"
- "act on MR feedback"
- "resolve MR discussions"
- "implement reviewer requests"
- "address MR comments for #286"

**Workflow:** Interactive Feedback Processing (see [`mr-interactive-workflow.md`](./mr-interactive-workflow.md))

## MR Identification Methods

The router supports three methods for identifying which MR to work with:

### Method 1: Explicit MR Number/IID

**Patterns:**
- `#286` - Hash with number
- `MR #286` - Explicit MR prefix with hash
- `MR 286` - Explicit MR prefix without hash
- `!286` - GitLab-style MR reference
- `merge request 286` - Full text with number

**Extraction Logic:**
```
1. Search for patterns: #\d+, MR #?\d+, !\d+, merge request \d+
2. Extract numeric IID from match
3. Validate IID is positive integer
4. Use IID for direct API query
```

**Action:** Extract IID, query directly via git platform API

### Method 2: MR URL

**Patterns:**
- `https://gitlab.com/group/project/-/merge_requests/286`
- `https://github.com/owner/repo/pull/286`
- Full URL to merge request or pull request

**Extraction Logic:**
```
1. Parse URL to extract:
   - Platform (GitLab, GitHub, etc.)
   - Project/repository path
   - MR/PR number
2. Validate URL format
3. Use extracted information for API query
```

**Action:** Parse URL, extract project and IID, query via API

### Method 3: Current Branch Discovery

**Pattern:** No explicit MR identifier provided in user input

**Detection Logic:**
```
1. Check user input for MR identifiers (Method 1 & 2)
2. If none found, fall back to branch discovery
3. Execute: source "$(pwd)/.env" && git branch --show-current
4. Map branch to remote
5. Search for MR associated with branch
```

**Action:** Use existing branch discovery workflow (see [`git-integration-patterns.md`](./git-integration-patterns.md))

## Workflow Router Logic

### Phase 0: Request Analysis (Entry Point)

This phase MUST execute before any other MR Actions workflow phases.

```
┌─────────────────────────────────────┐
│  User Input Received                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 1: Parse for MR Identifiers   │
│  - Check for explicit MR number     │
│  - Check for MR URL                 │
│  - Check for current branch only    │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────────┐  ┌─────────────┐
│ Found ID/URL│  │  No ID Found│
└──────┬──────┘  └──────┬──────┘
       │                │
       │                ▼
       │         ┌─────────────────┐
       │         │ Use Branch      │
       │         │ Discovery       │
       │         └──────┬──────────┘
       │                │
       └────────┬───────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Step 2: Classify Request Type      │
│  - Information query keywords?      │
│  - Feedback processing keywords?    │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Information  │  │  Feedback    │
│ Query        │  │  Processing  │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Execute      │  │ Execute      │
│ Info Query   │  │ Interactive  │
│ Workflow     │  │ Workflow     │
└──────────────┘  └──────────────┘
```

### Step 1: Parse User Input for MR Identifiers

**Objective:** Determine how to identify the target MR

**Logic:**
```python
def identify_mr_source(user_input):
    # Check for explicit MR number
    # Handles: MR #286, #286, !286, MR 286
    mr_number_match = re.search(r'(?:MR\s*#?|#|!)(\d+)', user_input, re.IGNORECASE)
    if mr_number_match:
        iid = int(mr_number_match.group(1))
        # Validate IID is reasonable (positive, not excessively large)
        if iid > 0 and iid < 1000000:  # Reasonable upper limit
            return {
                'method': 'explicit_iid',
                'iid': iid
            }
    
    # Check for MR/PR URL (GitLab, GitHub, and other platforms)
    # Handles: /merge_requests/286 (GitLab) and /pull/286 (GitHub)
    url_match = re.search(r'https?://[^\s]+/(?:merge_requests|pull)/(\d+)', user_input)
    if url_match:
        iid = int(url_match.group(1))
        if iid > 0 and iid < 1000000:  # Reasonable upper limit
            return {
                'method': 'url',
                'url': url_match.group(0),
                'iid': iid
            }
    
    # Fall back to branch discovery
    return {
        'method': 'branch_discovery'
    }
```

**Edge Case Handling:**
- Leading zeros: Handled by `int()` conversion which strips them
- Very large numbers: Validated with upper limit check (< 1,000,000)
- Malformed URLs: Regex requires proper URL structure with http(s)://
- Invalid IIDs: Must be positive integers within reasonable range

### Step 2: Determine Request Type

**Objective:** Route to information query or feedback processing workflow

**Information Query Keywords:**
- status, show, display, get, tell, info, information, details, check, what, describe

**Feedback Processing Keywords:**
- process, implement, address, handle, act, resolve, fix, apply, take action

**Logic:**
```python
def classify_request_type(user_input):
    import re
    
    info_keywords = ['status', 'show', 'display', 'get', 'tell', 'info',
                     'information', 'details', 'check', 'what', 'describe']
    
    feedback_keywords = ['process', 'implement', 'address', 'handle', 'act',
                         'resolve', 'apply', 'take action', 'feedback',
                         'comments', 'suggestions', 'reviewer']
    
    input_lower = user_input.lower()
    
    # Use word boundaries to avoid partial matches (e.g., "fix" in "prefix")
    has_info_keywords = any(
        re.search(r'\b' + re.escape(keyword) + r'\b', input_lower)
        for keyword in info_keywords
    )
    has_feedback_keywords = any(
        re.search(r'\b' + re.escape(keyword) + r'\b', input_lower)
        for keyword in feedback_keywords
    )
    
    # If both present, feedback takes precedence
    if has_feedback_keywords:
        return 'feedback_processing'
    elif has_info_keywords:
        return 'information_query'
    else:
        # Default to feedback processing if ambiguous
        return 'feedback_processing'
```

**Improved Keyword Matching:**
- Uses word boundaries (`\b`) to prevent false positives
- "fix" in "prefix" won't trigger feedback processing
- "show" in "showroom" won't trigger information query
- More accurate classification of user intent

### Step 3: Execute Appropriate Workflow

**For Information Queries:**
- Route to [`mr-information-workflow.md`](./mr-information-workflow.md)
- Execute direct API query for MR details
- Present formatted information to user
- Offer next action options

**For Feedback Processing:**
- Route to [`mr-interactive-workflow.md`](./mr-interactive-workflow.md)
- Retrieve MR feedback and discussions
- Present item-by-item for approval
- Coordinate implementation through spec/code modes

## Integration with Existing Workflows

### With MR Processor Role

The request router executes as **Phase 0** before the existing MR Processor phases:

```
Phase 0: Request Analysis (NEW - from this document)
  ↓
Phase 1: MR Discovery (existing - updated to use Phase 0 results)
  ↓
Phase 2: Feedback Analysis (existing - only for feedback processing)
  ↓
Phase 3: Interactive Approval (existing - only for feedback processing)
  ↓
Phase 4: Implementation Coordination (existing - only for feedback processing)
  ↓
Phase 5: Session Completion (existing)
```

### With Git Integration Patterns

When Method 3 (branch discovery) is used, the router delegates to existing git integration patterns for:
- Branch identification
- Remote mapping
- MR search by branch name

## Error Handling

### No MR Identifier Found and No Current Branch

**Condition:** User input has no MR identifier AND git branch discovery fails

**Response:**
```
⚠️ **Unable to Identify Target MR**

I couldn't determine which MR to work with because:
- No MR number or URL was provided in your request
- Unable to identify current git branch

**Please specify the MR using one of these methods:**
1. MR number: "status of MR #286"
2. MR URL: "show me https://gitlab.com/project/-/merge_requests/286"
3. Ensure you're on a branch with an associated MR

Which MR would you like to work with?
```

### Invalid MR Identifier

**Condition:** Extracted MR identifier is invalid (non-numeric, negative, etc.)

**Response:**
```
⚠️ **Invalid MR Identifier**

The MR identifier "{extracted_value}" is not valid.

**Valid formats:**
- MR #286
- #286
- !286
- https://gitlab.com/project/-/merge_requests/286

Please provide a valid MR identifier.
```

### Ambiguous Request Type

**Condition:** Cannot clearly determine if request is information query or feedback processing

**Response:**
```
❓ **Clarification Needed**

I found MR #{iid}, but I'm not sure what you'd like to do:

**Option 1:** View MR status and information
**Option 2:** Process MR feedback and implement suggestions

Which would you prefer?
```

## Best Practices

1. **Always Execute Phase 0 First**: Never skip request analysis
2. **Explicit IDs Take Precedence**: If user provides MR number, use it (don't discover from branch)
3. **Clear User Communication**: Always confirm which MR is being worked with
4. **Fail Fast on Ambiguity**: Ask for clarification rather than guessing
5. **Preserve Context**: Pass identified MR information to subsequent workflow phases

## Examples

### Example 1: Information Query with Explicit ID

**User Input:** "tell me the status of MR #286"

**Router Processing:**
```
Step 1: Parse for MR identifiers
  → Found: #286 (explicit IID)
  → Method: explicit_iid
  → IID: 286

Step 2: Classify request type
  → Keywords found: "tell", "status"
  → Classification: information_query

Step 3: Execute workflow
  → Route to: mr-information-workflow.md
  → Action: Query MR 286 details via API
  → Present: Formatted MR information
```

### Example 2: Feedback Processing with Explicit ID

**User Input:** "process MR feedback for MR #286"

**Router Processing:**
```
Step 1: Parse for MR identifiers
  → Found: MR #286 (explicit IID)
  → Method: explicit_iid
  → IID: 286

Step 2: Classify request type
  → Keywords found: "process", "feedback"
  → Classification: feedback_processing

Step 3: Execute workflow
  → Route to: mr-interactive-workflow.md
  → Action: Retrieve MR 286 feedback
  → Present: Item-by-item approval workflow
```

### Example 3: Feedback Processing with Branch Discovery

**User Input:** "process MR feedback"

**Router Processing:**
```
Step 1: Parse for MR identifiers
  → Found: None
  → Method: branch_discovery
  → Action: Execute git branch --show-current

Step 2: Classify request type
  → Keywords found: "process", "feedback"
  → Classification: feedback_processing

Step 3: Execute workflow
  → Discover MR from current branch
  → Route to: mr-interactive-workflow.md
  → Action: Retrieve discovered MR feedback
  → Present: Item-by-item approval workflow