# Python Best Practices

This checklist covers Python-specific best practices.

**See also:** [Universal Programming Best Practices](universal.md) - language-agnostic principles that apply to all code.

## Type Hints
- [ ] Type hints used appropriately
- [ ] Function signatures include parameter and return types
- [ ] Complex types properly annotated (List[], Dict[], Optional[])
- [ ] Type hints aid readability and IDE support

## Exception Handling (Python-Specific)

Beyond the [universal error handling practices](universal.md#error-handling):

- [ ] Specific exceptions caught (not bare `except:`)
- [ ] Exception chaining preserved (`raise from`)
- [ ] Custom exceptions inherit from appropriate base classes

## Resource Management
- [ ] Context managers for resource management
- [ ] `with` statement used for files, connections, locks
- [ ] Custom context managers when appropriate
- [ ] Resources properly closed even on errors

## List Comprehensions
- [ ] List comprehensions used appropriately
- [ ] Comprehensions not too complex (prefer readability)
- [ ] Generator expressions for large datasets
- [ ] Dict/set comprehensions where appropriate

## Async Operations
- [ ] Async operations handled correctly (asyncio patterns)
- [ ] `async`/`await` used properly
- [ ] Async context managers (`async with`)
- [ ] No blocking calls in async functions
- [ ] Event loop managed correctly

## Code Style (Python-Specific)

Beyond the [universal code clarity practices](universal.md#code-clarity-and-readability):

- [ ] PEP 8 compliance (snake_case for functions/variables, PascalCase for classes)
- [ ] Docstrings for modules, classes, and public functions (Google/NumPy style)
- [ ] Import organization (standard library, third-party, local)
- [ ] `if __name__ == "__main__":` for executable scripts

## Testing (Python-Specific)

Beyond the [universal testing practices](universal.md#testing):

- [ ] pytest used for tests (preferred over unittest)
- [ ] Fixtures used for test setup/teardown
- [ ] Parametrized tests for multiple scenarios (`@pytest.mark.parametrize`)
- [ ] `unittest.mock` or `pytest-mock` for mocking
- [ ] Async tests handled correctly (`pytest-asyncio`)

## Data Structures
- [ ] Appropriate data structures chosen
- [ ] Collections module used when beneficial (Counter, defaultdict)
- [ ] Generators for memory efficiency
- [ ] Named tuples or dataclasses for structured data

## Object-Oriented Design (Python-Specific)

Beyond the [universal design principles](universal.md#design-principles):

- [ ] Properties (`@property`) used for computed attributes
- [ ] Magic methods (`__str__`, `__repr__`, `__eq__`) implemented appropriately
- [ ] Abstract base classes (ABC) for interfaces
- [ ] Dataclasses used for simple data containers

## Functional Programming (Python-Specific)

- [ ] List/dict comprehensions preferred over map/filter for readability
- [ ] Generator expressions for memory efficiency
- [ ] Built-in functions leveraged (`enumerate`, `zip`, `any`, `all`)
- [ ] `itertools` for efficient iteration patterns
- [ ] `functools` for higher-order functions (`partial`, `reduce`)

## Django Specific (if applicable)
- [ ] Models properly designed (relationships, constraints)
- [ ] QuerySet optimization (select_related, prefetch_related)
- [ ] Form validation comprehensive
- [ ] Template context minimal and secure
- [ ] Migrations reviewed for safety

## FastAPI Specific (if applicable)
- [ ] Pydantic models for request/response validation
- [ ] Dependency injection used properly
- [ ] OpenAPI documentation accurate
- [ ] Async endpoints for I/O-bound operations
- [ ] Proper status codes returned
