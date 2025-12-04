# Kotlin on JVM Best Practices

This checklist covers Kotlin-specific best practices for code running on the JVM.

**See also:** [Universal Programming Best Practices](universal.md) - language-agnostic principles that apply to all code.

## Null Safety

Kotlin's null safety is a core language feature. Use it properly:

- [ ] Nullable types declared explicitly with `?` when null is valid
- [ ] Safe call operator `?.` used for potentially null values
- [ ] Elvis operator `?:` used for default values instead of explicit null checks
- [ ] Non-null assertion `!!` used sparingly and only when you can prove non-nullity
- [ ] `let` scope function used to safely handle nullable values
- [ ] Platform types from Java interop handled carefully with explicit nullability

## Exception Handling

- [ ] Specific exception types caught rather than broad `Exception`
- [ ] Exception handling appropriate to the layer (don't catch at every level)
- [ ] Exceptions used for exceptional cases, not flow control
- [ ] Resource cleanup guaranteed in exception paths
- [ ] Custom exception types defined for domain-specific errors
- [ ] Exception messages provide clear context for debugging

## Resource Management

Kotlin provides `use` for automatic resource management:

- [ ] `use` function used for `AutoCloseable` resources (files, streams, connections)
- [ ] No manual `try-finally` blocks where `use` would work
- [ ] Resource leaks prevented in all code paths including exceptions
- [ ] Database connections, HTTP clients properly closed
- [ ] `useLines` for efficient file line-by-line processing

## Immutability

Prefer immutable data structures and values:

- [ ] `val` used instead of `var` whenever possible
- [ ] Data classes used for immutable DTOs and value objects
- [ ] Immutable collections preferred (`listOf`, `setOf`, `mapOf`)
- [ ] Mutable collections only when mutation is truly needed
- [ ] Copy methods on data classes used for "modifications"
- [ ] No mutable state exposed from classes

## Collections and Sequences

Kotlin collections are powerful but sequences avoid intermediate allocations:

- [ ] Collection operations (`map`, `filter`, `flatMap`) used idiomatically
- [ ] Sequences used for large datasets or chains of operations
- [ ] No unnecessary intermediate collections created
- [ ] Collection operations chained efficiently
- [ ] `asSequence()` used for multi-step transformations on large collections
- [ ] Terminal operations (`toList()`, `toSet()`) called on sequences when needed

## Coroutines and Async

Kotlin coroutines for structured concurrency:

- [ ] Before you commit to using coroutines, understand the downsides of non-blocking code (see "[What color is your function?]") and consider whether [virtual threads] might be a better option
- [ ] Coroutines used for async operations instead of threads
- [ ] Proper coroutine scope management (`CoroutineScope`, `viewModelScope`, etc.)
- [ ] `suspend` functions used for async operations
- [ ] `async`/`await` used for parallel operations that need results
- [ ] `launch` used for fire-and-forget operations
- [ ] Structured concurrency principles followed (children canceled when parent canceled)
- [ ] `Dispatchers.IO` for I/O operations, `Dispatchers.Default` for CPU work
- [ ] Flow used for streams of values over time
- [ ] No blocking calls in coroutine contexts

[What color is your function?]: https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/
[virtual threads]: https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html

## Scope Functions

Kotlin's scope functions (`let`, `run`, `with`, `apply`, `also`) have specific uses:

- [ ] Use scope functions _judiciously_; always prioritize readability over cleverness
- [ ] `let` for null safety and transformations
- [ ] `apply` for object configuration (returns `this`)
- [ ] `also` for side effects while keeping the object (returns `this`)
- [ ] `run` for executing a block and returning result
- [ ] `with` for operating on a non-null object without extension
- [ ] Scope functions not nested too deeply (prefer extracting functions)

## Extension Functions

- [ ] Extension functions used to enhance existing types idiomatically
- [ ] Extension functions grouped logically in files
- [ ] No unnecessary extension functions (use regular functions if more appropriate)
- [ ] Extension properties used for computed read-only properties

## Data Classes and Sealed Classes

- [ ] Data classes used for value objects and DTOs
- [ ] Sealed classes used for restricted class hierarchies (state management, results)
- [ ] `copy()` method used for "modifications" of data classes
- [ ] Sealed classes exhaustively handled in `when` expressions

## Type System

- [ ] Type inference used where it improves readability
- [ ] Explicit types provided when they aid understanding
- [ ] Generics used appropriately for type-safe abstractions
- [ ] Inline classes used for type-safe wrappers without runtime overhead
- [ ] Type aliases used to clarify complex types

## Companion Objects and Top-Level Functions

- [ ] Companion objects used for factory methods and constants
- [ ] Top-level functions used for utility functions that don't need object context
- [ ] `@JvmStatic` used on companion functions when called from Java
- [ ] Constants defined in companion objects or top-level with `const val`

## Delegation

- [ ] Class delegation (`by` keyword) used to avoid boilerplate
- [ ] Property delegation used for lazy initialization, observables, etc.
- [ ] `lazy` delegate used for expensive initialization
- [ ] Custom delegates created when appropriate for repeated patterns

## Interoperability with Java

When working with Java code or libraries:

- [ ] Platform types from Java handled carefully
- [ ] `@JvmName` used to avoid JVM signature clashes
- [ ] `@JvmStatic` used on companion object members called from Java
- [ ] `@JvmOverloads` used for default parameters called from Java
- [ ] `@Throws` declared when Kotlin functions throw checked exceptions
- [ ] Collections converted properly between Kotlin and Java

## Dependency Injection (Kotlin-Specific)

Beyond the [universal dependency principles](universal.md#dependencies-and-coupling):

- [ ] Primary constructor used for dependency injection
- [ ] Property declarations and dependency injection combined in constructor

## Testing (Kotlin-Specific)

Beyond the [universal testing practices](universal.md#testing):

- [ ] Coroutine testing utilities used (`runTest`, `TestCoroutineScheduler`)
- [ ] Test data builders use Kotlin features (default parameters, named arguments)

## Spring Boot on Kotlin

When using Spring Boot with Kotlin:

- [ ] All Spring beans are open (use `kotlin-spring` plugin for automatic `open`)
- [ ] Proper Spring annotations used (`@Service`, `@Repository`, `@Component`)
- [ ] Transaction boundaries appropriate (`@Transactional` on service methods)
- [ ] Configuration classes use `@ConfigurationProperties` with data classes
- [ ] Validation annotations used on DTOs (`@Valid`, JSR-303)
- [ ] Exception handling with `@ControllerAdvice` and Kotlin exception types

## Kotlin Code Conventions

Beyond the [universal code clarity practices](universal.md#code-clarity-and-readability):

- [ ] Official Kotlin coding conventions followed
- [ ] Kotlin idioms preferred over Java-style code
- [ ] Expression bodies used for simple functions
- [ ] `when` expressions used instead of long if-else chains
