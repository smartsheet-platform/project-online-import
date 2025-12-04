# TypeScript/JavaScript Best Practices

This checklist covers TypeScript and JavaScript-specific best practices.

**See also:** [Universal Programming Best Practices](universal.md) - language-agnostic principles that apply to all code.

## Type Safety
- [ ] Type safety maintained (avoid `any`, use proper types)
- [ ] Interfaces defined for complex objects
- [ ] Generics used appropriately
- [ ] Type guards for runtime type checking
- [ ] Proper use of union types and discriminated unions

## Async Operations
- [ ] Async operations handled correctly (Promise chains, async/await)
- [ ] Error handling in async functions (try-catch with async/await)
- [ ] Promise chains have error handlers (.catch())
- [ ] No unhandled promise rejections
- [ ] Appropriate use of Promise.all() for parallel operations

## Error Handling (Language-Specific)

Beyond the [universal error handling practices](universal.md#error-handling):

- [ ] Error handling in async functions (try-catch with async/await)
- [ ] Promise chains have error handlers (`.catch()`)
- [ ] React Error Boundaries for component errors (if React)

## Memory Management
- [ ] Memory leaks prevented
- [ ] Cleanup in useEffect return functions (React)
- [ ] Event listeners removed when no longer needed
- [ ] Subscriptions unsubscribed
- [ ] Large objects/arrays released when done

## Immutability
- [ ] Immutability patterns used (spread operators, immutable state)
- [ ] Array methods that don't mutate (map, filter, reduce)
- [ ] Object spread for shallow copies
- [ ] Proper use of const for variables that won't be reassigned
- [ ] State updates follow immutability patterns

## Side Effects (Language-Specific)

Beyond the [universal function design practices](universal.md#function-design):

- [ ] `useEffect` dependencies correct and complete (React)
- [ ] Side effects in `useEffect`, not during render (React)

## Testing (Language-Specific)

Beyond the [universal testing practices](universal.md#testing):

- [ ] Jest or Vitest for unit tests
- [ ] React Testing Library for components (if React)
- [ ] User-centric testing (query by role/label, not test IDs)
- [ ] Async operations properly awaited in tests (`waitFor`, `findBy`)
- [ ] MSW (Mock Service Worker) for API mocking when appropriate

## React Specific (if applicable)
- [ ] Hooks rules followed (only call at top level)
- [ ] Proper use of useMemo and useCallback for optimization
- [ ] Key props provided for list items
- [ ] Refs used appropriately (not overused)
- [ ] Component composition preferred over prop drilling
- [ ] Context used for global state appropriately

## Modern JavaScript
- [ ] ES6+ features used appropriately
- [ ] Destructuring for cleaner code
- [ ] Template literals for string interpolation
- [ ] Optional chaining (?.) for safe property access
- [ ] Nullish coalescing (??) for default values

## Node.js Specific (if applicable)
- [ ] Error-first callbacks handled properly
- [ ] Stream processing for large data
- [ ] Environment variables for configuration
- [ ] Proper use of middleware (Express/similar)
