# API Client Code Generation Patterns

## Overview

Defines specific code generation patterns and templates for creating specification-compliant API clients. These patterns ensure API clients implement exactly what specifications document.

## Applies To

- ✅ Roo Mode: API Client Code
- ✅ Claude Agent: api-client-code

## Python Client Patterns

### Client Class Structure

Standard structure for Python API client classes:

```python
class {ApiName}Client:
    """
    {API_DESCRIPTION_FROM_SPEC}

    Generated from API specification: {SPEC_URL_OR_SOURCE}
    Specification version: {SPEC_VERSION}

    IMPORTANT: This client implements ONLY the methods documented in the API specification.
    Do not expect methods, parameters, or behaviors not explicitly documented.
    """

    def __init__(
        self,
        base_url: str = "{DEFAULT_BASE_URL_FROM_SPEC}",
        auth_token: Optional[str] = None,
        timeout: int = 30,
        headers: Optional[Dict[str, str]] = None
    ):
        """Initialize API client with specification-defined configuration."""
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.timeout = timeout

        # Set authentication exactly as specified
        if auth_token:
            self._configure_authentication(auth_token)

        # Set default headers from specification
        default_headers = {SPEC_DEFINED_HEADERS}
        if headers:
            default_headers.update(headers)
        self.session.headers.update(default_headers)

    def _configure_authentication(self, token: str) -> None:
        """Configure authentication exactly as documented in specification."""
        # Implementation based on spec auth mechanism
        {AUTH_IMPLEMENTATION_FROM_SPEC}
```

### Method Generation Pattern

Pattern for generating individual API method implementations:

```python
def {method_name}(
    self,
    {required_parameters_from_spec},
    {optional_parameters_from_spec} = None
) -> {return_type_from_spec}:
    """
    {METHOD_DESCRIPTION_FROM_SPEC}

    Specification Reference: {SPEC_SECTION_REFERENCE}

    Args:
        {parameter_documentation_from_spec}

    Returns:
        {return_documentation_from_spec}

    Raises:
        {exception_documentation_from_spec}

    API Specification Note: This method implements exactly what is documented
    in the API specification. If behavior differs from expectations, consult
    the official API documentation.
    """
    # Validate required parameters match specification
    {parameter_validation_code}

    # Prepare request exactly as specified
    url = f"{self.base_url}{spec_defined_path}"
    {request_preparation_code}

    # Make request with specification-defined method
    response = self.session.{http_method}(
        url,
        {request_parameters_from_spec},
        timeout=self.timeout
    )

    # Handle response according to specification
    return self._handle_{method_name}_response(response)

def _handle_{method_name}_response(self, response: requests.Response) -> {return_type}:
    """Handle response according to API specification status codes."""
    {status_code_handling_from_spec}
```

### Response Handling Patterns

#### Success Response Pattern

```python
if response.status_code == {SUCCESS_CODE_FROM_SPEC}:
    try:
        response_data = response.json()
        return {ResponseModel}.model_validate(response_data)
    except (ValueError, ValidationError) as e:
        raise APIResponseError(
            f"Invalid response format from API: {e}",
            status_code=response.status_code,
            response_data=response.text
        )
```

#### Error Response Pattern

```python
elif response.status_code == {ERROR_CODE_FROM_SPEC}:
    try:
        error_data = response.json()
        error_model = {ErrorModel}.model_validate(error_data)
        raise {SpecificException}(
            message=error_model.message,
            error_code=error_model.code,
            status_code=response.status_code,
            details=error_model.details
        )
    except (ValueError, ValidationError):
        # Fallback for non-JSON error responses
        raise {SpecificException}(
            message=f"API error: {response.text}",
            status_code=response.status_code
        )
```

#### Unknown Status Handling

```python
else:
    # Handle status codes not documented in specification
    raise APIError(
        f"Unexpected status code {response.status_code} not documented in API specification",
        status_code=response.status_code,
        response_data=response.text,
        specification_note="This status code is not documented in the API specification. "
                          "Please consult the API provider or update the specification."
    )
```

## Data Model Generation

### Pydantic Model Pattern

Generate Pydantic models exactly matching specification schemas:

```python
class {ModelName}(BaseModel):
    """
    {MODEL_DESCRIPTION_FROM_SPEC}

    Generated from API specification schema: {SCHEMA_REFERENCE}

    SPECIFICATION COMPLIANCE: All fields, types, and validation rules
    are derived directly from the API specification. Do not expect
    fields or behaviors not documented in the specification.
    """

    # Required fields from specification
    {required_fields_with_types}

    # Optional fields from specification
    {optional_fields_with_defaults}

    # Specification-defined validation
    {validation_rules_from_spec}

    class Config:
        """Pydantic configuration for specification compliance."""
        extra = "forbid"  # Reject fields not in specification
        validate_assignment = True  # Validate on assignment
        use_enum_values = True  # Use enum values as specified

    @field_validator('{field_name}')
    @classmethod
    def validate_{field_name}(cls, value):
        """Validate field according to specification constraints."""
        {validation_logic_from_spec}
        return value
```

### Enum Generation Pattern

Generate enums from specification-defined constant values:

```python
class {EnumName}(str, Enum):
    """
    {ENUM_DESCRIPTION_FROM_SPEC}

    Values are exactly as defined in API specification.
    Do not expect additional values not documented.
    """

    {enum_values_from_spec}

    @classmethod
    def from_specification_value(cls, value: str) -> '{EnumName}':
        """Convert specification value to enum, with validation."""
        try:
            return cls(value)
        except ValueError:
            valid_values = [e.value for e in cls]
            raise ValueError(
                f"Value '{value}' not found in API specification. "
                f"Valid values: {valid_values}"
            )
```

## Exception Hierarchy

### Base Exception Pattern

```python
class {ApiName}Error(Exception):
    """Base exception for all API-related errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        response_data: Optional[str] = None,
        specification_note: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.response_data = response_data
        self.specification_note = specification_note

    def __str__(self) -> str:
        parts = [f"API Error: {self.message}"]
        if self.status_code:
            parts.append(f"Status: {self.status_code}")
        if self.error_code:
            parts.append(f"Code: {self.error_code}")
        if self.specification_note:
            parts.append(f"Spec Note: {self.specification_note}")
        return " | ".join(parts)
```

### Specific Exception Pattern

```python
class {SpecificError}({ApiName}Error):
    """
    {ERROR_DESCRIPTION_FROM_SPEC}

    Thrown when API returns status code: {STATUS_CODE_FROM_SPEC}
    Specification reference: {SPEC_ERROR_SECTION}
    """

    def __init__(self, message: str, details: Optional[Dict] = None, **kwargs):
        super().__init__(message, **kwargs)
        self.details = details or {}
```

## Authentication Patterns

### API Key Authentication

```python
def _configure_api_key_auth(self, api_key: str) -> None:
    """Configure API key authentication as specified."""
    # Implementation based on specification requirements
    {auth_header_from_spec} = f"{auth_prefix}{api_key}"
    self.session.headers['{header_name_from_spec}'] = {auth_header_from_spec}
```

### Bearer Token Authentication

```python
def _configure_bearer_auth(self, token: str) -> None:
    """Configure Bearer token authentication as specified."""
    self.session.headers['Authorization'] = f"Bearer {token}"
```

### OAuth Authentication

```python
def _configure_oauth_auth(self, access_token: str) -> None:
    """Configure OAuth authentication as specified."""
    self.session.headers['Authorization'] = f"Bearer {access_token}"
    # Additional OAuth configuration from specification
    {oauth_config_from_spec}
```

## Specification Compliance Validation

### Method Coverage Validation

```python
def _validate_specification_coverage(self) -> Dict[str, bool]:
    """
    Validate that all specification-defined endpoints are implemented.

    Returns mapping of endpoint -> implemented status.
    Used for development verification only.
    """
    specification_endpoints = {
        {spec_endpoints_list}
    }

    implemented_methods = [
        method for method in dir(self)
        if not method.startswith('_') and callable(getattr(self, method))
    ]

    coverage = {}
    for endpoint, method_name in specification_endpoints.items():
        coverage[endpoint] = method_name in implemented_methods

    return coverage
```

### Parameter Validation Pattern

```python
def _validate_parameters(
    self,
    provided_params: Dict[str, Any],
    required_params: List[str],
    optional_params: List[str],
    method_name: str
) -> None:
    """Validate parameters against specification requirements."""

    # Check required parameters
    missing_required = set(required_params) - set(provided_params.keys())
    if missing_required:
        raise ValueError(
            f"Missing required parameters for {method_name}: {missing_required}. "
            f"Required by specification: {required_params}"
        )

    # Check for unexpected parameters
    valid_params = set(required_params + optional_params)
    unexpected_params = set(provided_params.keys()) - valid_params
    if unexpected_params:
        raise ValueError(
            f"Unexpected parameters for {method_name}: {unexpected_params}. "
            f"Valid parameters per specification: {valid_params}"
        )
```

## Documentation Standards

### Method Documentation Template

```python
"""
{METHOD_DESCRIPTION_FROM_SPEC}

API Specification Details:
- Endpoint: {HTTP_METHOD} {ENDPOINT_PATH}
- Specification Section: {SPEC_SECTION_REFERENCE}
- Required Parameters: {REQUIRED_PARAMS_LIST}
- Optional Parameters: {OPTIONAL_PARAMS_LIST}
- Success Response: {SUCCESS_RESPONSE_SCHEMA}
- Error Responses: {ERROR_RESPONSE_SCHEMAS}

Specification Compliance Note:
This method implements exactly what is documented in the API specification.
If you expect different behavior, please consult the official API documentation
at: {API_DOCS_URL}

Args:
    {PARAMETER_DOCUMENTATION}

Returns:
    {RETURN_DOCUMENTATION}

Raises:
    {EXCEPTION_DOCUMENTATION}

Example:
    {USAGE_EXAMPLE_FROM_SPEC}
"""
```

### Class Documentation Template

```python
"""
{API_NAME} Client - Specification-Compliant Implementation

{API_DESCRIPTION_FROM_SPEC}

Specification Source: {SPEC_SOURCE_URL}
Generated: {GENERATION_TIMESTAMP}
Specification Version: {SPEC_VERSION}

IMPORTANT SPECIFICATION COMPLIANCE NOTES:

1. This client implements ONLY methods documented in the API specification
2. Parameter names, types, and requirements match the specification exactly
3. Response formats are as documented - no additional processing or convenience methods
4. Error handling covers only documented error scenarios
5. Authentication mechanisms match specification requirements exactly

If you encounter unexpected behavior:
1. Verify your usage matches the specification examples
2. Check that you're using documented parameters and methods
3. Consult the official API documentation: {API_DOCS_URL}
4. Verify you have the correct specification version

Do NOT expect:
- Methods not documented in the specification
- Parameters with different names or types than specified
- "Helpful" convenience methods or data transformations
- Error handling beyond what's documented

This client prioritizes specification accuracy over convenience.
"""
```

## Conflict Resolution Templates

### Method Not Found

```
The requested method '{method_name}' does not exist in the API specification.

Available methods for this resource:
{list_actual_methods}

Please consult the API documentation at: {api_docs_url}
```

### Parameter Mismatch

```
Parameter '{parameter_name}' with type '{requested_type}' does not match specification.

Specification defines:
- Name: {spec_parameter_name}
- Type: {spec_parameter_type}
- Required: {spec_parameter_required}

Please update your usage to match the specification.
```

### Specification Ambiguity Warning

```python
# SPECIFICATION AMBIGUITY WARNING:
# The specification does not clearly define the behavior for this scenario:
# {description_of_ambiguous_scenario}
#
# Current implementation assumes: {assumption_made}
#
# This assumption is based on: {reasoning_for_assumption}
#
# TODO: Clarify with API provider - specification section {spec_section}
#
# If behavior differs from this assumption, please:
# 1. Consult the API provider for clarification
# 2. Update this implementation based on official guidance
```

### Consumer Expectation Mismatch

```python
# SPECIFICATION COMPLIANCE NOTE:
# The API specification defines this parameter as optional, but consumers
# may expect it to be required based on common usage patterns.
#
# Per specification: parameter '{param_name}' is optional with default behavior:
# {specification_default_behavior}
#
# If you need different behavior, please:
# 1. Consult the API provider about specification updates
# 2. Handle the optional nature in your application logic
# 3. Do not expect this client to modify the specification behavior
```

## Reality Enforcement

Actively identify and surface mismatches between specification and expectations.

### Detection Strategies

**Method Existence Validation**
- Verify all requested methods exist in specification
- Refuse to implement non-existent methods with clear explanation

**Parameter Validation**
- Validate all requested parameters against specification
- Reject invalid parameters and suggest correct alternatives

**Response Format Validation**
- Ensure response handling matches documented formats
- Implement exactly what's documented, document any assumptions

### When Specification Doesn't Match Expectations

- Detect mismatches (method existence, parameter validation, response formats)
- Refuse non-specified functionality clearly
- Provide guidance showing what's actually available
- Document mismatches for reference
- Suggest spec-compliant alternatives

## Quality Assurance

### Pre-Implementation Checks

Before generating API client code:
- Verify specification provides sufficient detail
- Check all endpoints have request/response schemas defined
- Confirm authentication mechanism is clearly specified
- Validate error response formats are documented
- Identify required vs optional parameters clearly
- Document any specification gaps found

**For Updates**: Analyze existing implementation vs specification
- Methods that exist but are not in current specification
- Methods in specification but missing from implementation
- Parameter mismatches between implementation and specification
- Response handling differences
- Authentication implementation accuracy

### Post-Implementation Validation

**Specification Coverage**
- All documented endpoints have corresponding methods
- All documented parameters are supported
- All documented response formats are handled
- All documented error codes are handled
- Authentication mechanisms are fully implemented

**Type Safety Verification**
- All methods have proper type hints
- All models use Pydantic validation
- Enum values match specification exactly
- Optional vs required parameters are correctly typed
- Response models handle all documented variations

**Documentation Completeness**
- Each method references specification section
- All assumptions are documented with rationale
- Specification gaps are clearly marked
- Consumer guidance is provided for complex scenarios
- Version information is included in all generated files

## Environment Issue Delegation

When encountering environment issues during API client development:
- Command not found errors
- ModuleNotFoundError or ImportError
- Permission denied errors
- Python/pip installation failures
- Package dependency failures
- Virtual environment issues
- Type checking tool failures (mypy, etc.)
- Linting tool failures
- API specification validation tool failures

**Action**: Immediately delegate to environment troubleshooting specialist.

**Principle**: API client specialists implement code, they don't fix environment issues.

**After delegation**: Resume exactly where left off and maintain all specification fidelity principles. Never modify specification compliance due to environment constraints.

## Completion Reporting

When API client implementation is complete, report back with:

```
**API Client Implementation Complete**

**Generated Components:**
- Client Class: {CLASS_NAME} ({LINE_COUNT} lines)
- Models: {MODEL_COUNT} Pydantic models
- Exceptions: {EXCEPTION_COUNT} API-specific exceptions
- Methods: {METHOD_COUNT} specification-compliant methods

**Specification Compliance:**
- Endpoints Covered: {ENDPOINT_COVERAGE}
- Authentication: {AUTH_STATUS}
- Error Handling: {ERROR_HANDLING_STATUS}
- Type Safety: {TYPE_SAFETY_STATUS}

**Implementation Notes:**
{SPECIFICATION_COMPLIANCE_NOTES}

**Files Modified/Created:**
{FILE_LIST}
```

## Issue Escalation

Report back to main system if unable to complete due to:
- Specification has critical gaps preventing implementation
- Requested functionality fundamentally conflicts with specification
- Authentication mechanism cannot be implemented as specified
- Response schemas are inconsistent or invalid
- Any blocking issue that requires specification clarification or update