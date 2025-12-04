---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Run command: `npm run dev -- import ...`
2. Configure .env with: '...'
3. See error: '...'

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Error Messages

```
Paste any error messages here
```

## Environment

**System Information:**
- OS: [e.g., macOS 14.0, Windows 11, Ubuntu 22.04]
- Node.js version: [run `node --version`]
- npm version: [run `npm --version`]
- Tool version: [e.g., 1.0.0]

**Configuration:**
```bash
# Sanitized .env configuration (remove actual tokens!)
PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa
SMARTSHEET_API_TOKEN=<redacted>
TEMPLATE_WORKSPACE_ID=12345...
# ... other relevant config
```

## Project Online Details

- **Source Project ID:** [GUID]
- **Number of tasks:** [approximate]
- **Number of resources:** [approximate]
- **Custom fields used:** [Yes/No]

## Logs

<details>
<summary>Full logs (expand to view)</summary>

```
Paste full command output here
```

</details>

## Additional Context

Add any other context about the problem here (screenshots, related issues, etc.).

## Checklist

- [ ] I have searched existing issues for duplicates
- [ ] I have included error messages and logs
- [ ] I have sanitized sensitive information (tokens, emails, etc.)
- [ ] I have provided environment details
