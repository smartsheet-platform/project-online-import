/**
 * Utility to encapsulate exponential backoff retry logic for API calls.
 * Provides resilient API calling with automatic retries and increasing delays.
 */

/**
 * Delay for a specified number of milliseconds
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ExponentialBackoff class for managing retry attempts with exponential backoff
 */
export class ExponentialBackoff {
  private maxTries: number;
  private backoffTime: number;
  private tries: number;

  constructor(maximumNumberOfTries: number, initialBackoffMilliseconds: number) {
    // Validate BEFORE defaulting to ensure we catch invalid values
    if (!(maximumNumberOfTries > 0)) {
      throw new Error('Maximum Number of Tries must be greater than zero.');
    }

    if (!(initialBackoffMilliseconds > 0)) {
      throw new Error('Initial Backoff Milliseconds must be greater than zero.');
    }

    this.maxTries = Number(maximumNumberOfTries);
    this.backoffTime = Number(initialBackoffMilliseconds);
    this.tries = 0;
  }

  /**
   * Check if we should continue trying and apply backoff delay if needed
   */
  async continue(): Promise<boolean> {
    if (this.tries < this.maxTries) {
      if (this.tries > 0) {
        await delay(this.backoffTime); // Delay before retry
        this.backoffTime *= 2; // Exponential backoff
      }
      this.tries++;
      return true;
    }
    return false;
  }

  /**
   * Evaluate whether to stop and optionally raise error
   */
  evalStop(error: Error, raise: boolean = false): void {
    if (this.tries === this.maxTries) {
      console.error(error);
      if (raise) {
        throw error;
      }
    }
  }
}

/**
 * Convenience function to wrap an async operation with exponential backoff retry logic
 *
 * @param operationFunction - Async function to execute with retry logic
 * @param maximumNumberOfTries - Maximum retry attempts (default: 5)
 * @param initialBackoffMilliseconds - Initial delay in milliseconds (default: 1000)
 * @returns Promise resolving to the operation result
 * @throws Error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await tryWith(
 *   () => oDataClient.getProjects({ limit: 100 }),
 *   5,
 *   1000
 * );
 * ```
 */
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = 5,
  initialBackoffMilliseconds: number = 1000
): Promise<T> {
  const backoff = new ExponentialBackoff(maximumNumberOfTries, initialBackoffMilliseconds);

  while (await backoff.continue()) {
    try {
      const result = await operationFunction();
      return result;
    } catch (error) {
      // On last attempt, raise the error
      backoff.evalStop(error as Error, true);
    }
  }

  // This should never be reached due to evalStop throwing on last attempt
  throw new Error('Exhausted all retry attempts');
}
