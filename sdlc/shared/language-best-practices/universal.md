# Universal Programming Best Practices

This checklist covers best practices that apply across all programming languages. These principles should be followed regardless of the specific language you're working in.

## Code Clarity and Readability

- [ ] Functions and methods are small and focused; they should fit within a reasonably-sized editor window
- [ ] Each function has a single, clear responsibility
- [ ] Meaningful, descriptive names for functions, variables, and classes
- [ ] Function names describe actions (verb phrases: `calculateTotal`, `validateInput`)
- [ ] Variable names describe content (noun phrases: `userId`, `transactions`)
- [ ] Variable names don't needlessly include the data type
- [ ] Boolean variables ask questions (`isValid`, `hasPermission`, `canEdit`)
- [ ] Constants use clear, descriptive names (convention varies by language)
- [ ] Nesting depth kept minimal (typically ≤ 3 levels)
- [ ] Early returns and guard clauses used to reduce nesting
- [ ] Code is self-documenting (clear intent without comments)

## Comments and Documentation

- [ ] Comments explain "why" not "what" (code should show "what")
- [ ] Complex algorithms have explanatory comments
- [ ] Public APIs are documented
- [ ] TODO/FIXME comments include context and attribution
- [ ] Commented-out code removed (use version control instead)
- [ ] Comments updated when code changes

## Function Design

- [ ] Functions have clear, single purposes
- [ ] Function parameters limited (typically ≤ 4 parameters)
- [ ] Parameter objects used when many related parameters needed
- [ ] Functions operate at one level of abstraction
- [ ] No side effects in functions that appear to be queries
- [ ] Functions return early on error conditions (fail fast)

## Error Handling

- [ ] Errors handled at appropriate level (not every level)
- [ ] Error messages provide clear, actionable information
- [ ] Error handling doesn't hide original errors
- [ ] Resources cleaned up properly in error paths
- [ ] Exceptions/errors used for exceptional cases, not flow control
- [ ] Error handling is consistent across the codebase
- [ ] Exceptions should typically be logged where they are handled, not where they are thrown

## Immutability and State Management

- [ ] Immutable data preferred when mutation isn't required
- [ ] Mutable state minimized and localized
- [ ] Mutable state not exposed directly from classes/modules
- [ ] State changes are intentional and clear
- [ ] Concurrent access to mutable state properly synchronized

## Code Organization

- [ ] Related code grouped together
- [ ] Separation of concerns maintained
- [ ] Prefer package-by-feature over package-by-layer
- [ ] Classes/modules have single, clear responsibilities
- [ ] Dependencies flow in one direction (no circular dependencies)
- [ ] File/module size kept reasonable (typically < 300-500 lines)
- [ ] Public interface clearly separated from internal implementation

## Testing

- [ ] Unit tests written for business logic
- [ ] Tests have clear, descriptive names that explain what they test
- [ ] Tests follow Arrange-Act-Assert (or Given-When-Then) pattern
- [ ] Each test tests one thing (one logical assertion)
- [ ] Tests are independent (no shared state, no execution order dependencies)
- [ ] Test data is clear and minimal (only what's needed for the test)
- [ ] Tests are maintainable (don't test implementation details)
- [ ] Minimize the use of mocking libraries; prefer reusable, custom fake implementations that can be shared between tests
- [ ] Edge cases and error paths covered
- [ ] Tests run quickly (slow tests in separate suite)

## Dependencies and Coupling

- [ ] Dependencies injected rather than hard-coded
- [ ] Use constructor injection, not field- or setter injection
- [ ] Depend on abstractions/interfaces, not concrete implementations
- [ ] Circular dependencies avoided
- [ ] Third-party dependencies used judiciously
- [ ] Coupling minimized (loose coupling, high cohesion)

## Performance Considerations

- [ ] Algorithms chosen appropriately for expected data size
- [ ] No obvious performance issues (N+1 queries, nested loops on large data)
- [ ] Premature optimization avoided (clarity first, optimize if needed)
- [ ] Performance-critical sections identified and justified
- [ ] Resources released when no longer needed

## Security Awareness

- [ ] Input validation performed on all external inputs
- [ ] Sensitive data not logged or exposed
- [ ] Authentication and authorization checked where required
- [ ] SQL injection, XSS, and similar attacks prevented
- [ ] Secrets and credentials not hard-coded
- [ ] Security best practices followed for language/framework

## Code Duplication

- [ ] No significant code duplication (DRY principle)
- [ ] But don't sacrifice simplicity for DRY! Simplicity is more important.
- [ ] Common logic extracted into reusable functions/methods
- [ ] Similar patterns abstracted appropriately

## Magic Numbers and Configuration

- [ ] Magic numbers replaced with named constants
- [ ] Configuration externalized (not hard-coded)
- [ ] Constants grouped logically
- [ ] Configuration values have sensible defaults where appropriate

## Version Control Practices

- [ ] Commits are atomic (one logical change per commit)
- [ ] Commit messages are clear and descriptive
- [ ] Work-in-progress code not committed to main branches
- [ ] Generated files not committed (build outputs, dependencies)

## Code Review Readiness

- [ ] Code follows project conventions and style guides
- [ ] Changes are focused (one feature/fix per PR/MR)
- [ ] Breaking changes clearly identified
- [ ] Backwards compatibility maintained where required
- [ ] Migration path provided for breaking changes

## Defensive Programming

- [ ] Assumptions validated with assertions or checks
- [ ] Boundary conditions handled correctly
- [ ] Null/nil/undefined values handled appropriately
- [ ] Array/list bounds checked
- [ ] Division by zero prevented
- [ ] Resource availability checked before use

## Code Smells to Avoid

- [ ] Long methods (> 50 lines)
- [ ] Large classes (> 300-500 lines)
- [ ] Long parameter lists (> 4 parameters)
- [ ] Deep nesting (> 3 levels)
- [ ] God objects (classes that know/do too much)
- [ ] Feature envy (methods using mostly external data)
- [ ] Data clumps (same group of parameters passed everywhere)
- [ ] Primitive obsession (using primitives instead of domain objects)
- [ ] Switch/case statements on type codes (use polymorphism)
- [ ] Temporary fields (fields only set in certain circumstances)

## Design Principles

- [ ] Single Responsibility Principle (one reason to change)
- [ ] Open/Closed Principle (open for extension, closed for modification)
- [ ] Liskov Substitution Principle (subtypes must be substitutable)
- [ ] Interface Segregation Principle (many specific interfaces > one general)
- [ ] Dependency Inversion Principle (depend on abstractions)
- [ ] YAGNI (You Aren't Gonna Need It - don't build what you don't need)
- [ ] KISS (Keep It Simple, Stupid - simplest solution that works)
