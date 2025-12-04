# Code Mode Customizations

## Purpose

This file contains project-specific customizations for the Code mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom coding standards or style guidelines
- Project-specific code generation patterns
- Custom testing requirements or frameworks
- Integration with your team's CI/CD pipelines
- Additional file naming conventions
- Custom error handling patterns

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/implementer-code-guidance.md`
- `../../shared/implementer-role-definition.md`
- `../../shared/implementer-targeted-implementation.md`
- `../../shared/ecosystem-knowledge.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom Code mode rules below this line -->



<!-- Example: Custom testing requirement
## Testing Standards

All API endpoints must have integration tests:

**Framework**: pytest with custom fixtures in `tests/conftest.py`
**Coverage Threshold**: 90% minimum
**Test Structure**:
```python
def test_endpoint_name_scenario():
    # Arrange
    setup_test_data()
    
    # Act
    response = client.post('/api/endpoint', json=payload)
    
    # Assert
    assert response.status_code == 200
    assert response.json()['field'] == expected_value
```

Run tests before committing: `pytest tests/ --cov=src --cov-report=term-missing`
-->

<!-- Example: Custom error handling
## Error Handling Pattern

All functions must use our custom error handling decorator:

```python
from utils.errors import handle_errors, AppError

@handle_errors
def process_data(data: dict) -> Result:
    if not validate(data):
        raise AppError("Invalid data", code="VALIDATION_ERROR")
    return transform(data)
```

Errors are automatically logged and formatted for API responses.
-->