# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do NOT Open a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities. Public disclosure before a fix is available can put users at risk.

### 2. Report Privately

Use **GitHub Security Advisories** to report vulnerabilities privately:

1. Go to: https://github.com/smartsheet/project-online-import/security/advisories
2. Click "Report a vulnerability"
3. Fill out the advisory form with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

### 3. Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 1 week
- **Fix Timeline:** Varies by severity
  - Critical: 24-72 hours
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next regular release

### 4. Disclosure Policy

- We will work with you to understand and resolve the issue
- Once fixed, we will credit you in the security advisory (if desired)
- We follow coordinated disclosure practices

## Security Best Practices for Users

### Authentication

**OAuth Tokens:**
- Never commit `.env` files to version control
- Rotate tokens regularly (every 90 days recommended)
- Use separate tokens for development and production
- Store tokens securely (use secret management systems in production)

**Azure AD Application:**
- Use minimal required permissions:
  - `Sites.Read.All` for read-only access
  - `Sites.ReadWrite.All` only if creating projects
- Create separate Azure AD apps for different environments
- Review app permissions regularly
- Enable audit logging

### Configuration Security

**Environment Variables:**
```bash
# ✅ DO: Use .env files (ignored by git)
SMARTSHEET_API_TOKEN=your-token-here

# ❌ DON'T: Hardcode in source
const token = "abc123..."; // Never do this!
```

**File Permissions:**
```bash
# Restrict access to .env file
chmod 600 .env

# Ensure token cache directory is private
chmod 700 ~/.project-online-tokens/
```

### Network Security

- Use HTTPS for all API calls (enforced by the tool)
- Run in trusted networks when handling sensitive project data
- Consider using VPN for remote access
- Review network logs for unusual activity

### Data Handling

- **Audit exported data** - Project data may contain sensitive information
- **Clean up test data** - Don't leave test projects with real data
- **Workspace permissions** - Review Smartsheet workspace access after import
- **Compliance** - Ensure compliance with your organization's data policies

## Known Security Considerations

### 1. Token Storage

**Device Code Flow tokens** are cached in `~/.project-online-tokens/`:
- Tokens are stored as JSON files
- Directory is created with user-only permissions (700)
- Tokens auto-refresh before expiration
- **Recommendation:** Clear cache after use: `rm -rf ~/.project-online-tokens/`

### 2. Template Workspace

**Template acquisition** via distribution link:
- Requires manual browser interaction
- User must use same Smartsheet account as API token
- Template workspace becomes visible to your account
- **Recommendation:** Review template contents before accepting

### 3. API Rate Limiting

- Default: 300 requests/minute
- Configurable via `RATE_LIMIT_PER_MINUTE`
- Respects Smartsheet and Microsoft rate limits
- **Recommendation:** Don't disable rate limiting in production

### 4. Error Logging

- Tool logs API responses for debugging
- Logs may contain project names, IDs, and metadata
- **Recommendation:** Review logs before sharing publicly

## Dependencies

We monitor dependencies for vulnerabilities using:
- npm audit
- Dependabot (GitHub)
- Regular dependency updates

Run security audit locally:
```bash
npm audit
npm audit fix  # Apply automatic fixes
```

## Reporting Issues with Dependencies

If you find a vulnerability in a dependency:
1. Check if it's already reported on npm/GitHub
2. Update to latest version if available
3. If no fix exists, report to us via security email
4. We will evaluate and potentially find alternatives

## Security Update Policy

- Security patches are released as soon as possible
- Users are notified via GitHub Security Advisories
- Critical vulnerabilities will trigger immediate patch releases
- Update notifications will be posted in README

---

**Last Updated:** 2026-01-19
