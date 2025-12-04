# API Client Code Mode Customizations

## Purpose

This file contains project-specific customizations for the API Client Code mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom API client patterns specific to your APIs
- Project-specific authentication mechanisms
- Custom error handling for your API responses
- Integration with your team's API testing tools
- Additional validation rules for API specifications

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/api-client-code-generation.md`
- `../../shared/api-client-role-definition.md`
- `../../shared/ecosystem-knowledge.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom API Client Code mode rules below this line -->



<!-- Example: Custom authentication pattern
## Custom Authentication

All API clients must implement OAuth2 with automatic token refresh:

```typescript
interface AuthConfig {
  type: 'oauth2_with_refresh';
  tokenStorage: 'encrypted_keychain';
  refreshThreshold: number; // seconds before expiry
}
```

Token storage must use the encrypted keychain for security.
-->

<!-- Example: Custom error handling
## Error Handling Standards

All API client errors must be wrapped in our custom error types:

```typescript
class APIClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public retryable: boolean
  ) {
    super(message);
  }
}
```
-->