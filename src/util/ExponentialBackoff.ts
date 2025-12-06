/**
 * Utility to encapsulate exponential backoff retry logic for API calls.
 * Provides resilient API calling with automatic retries and increasing delays.
 */

import { Logger } from './Logger';

/**
 * Delay for a specified number of milliseconds
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface ExponentialBackoffOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  logger?: Logger;
}

/**
 * ExponentialBackoff class for managing retry attempts with exponential backoff
 */
export class ExponentialBackoff {
  private maxTries: number;
  private backoffTime: number;
  private maxDelayMs: number;
  private tries: number;
  private logger?: Logger;

  constructor(options: ExponentialBackoffOptions);
  constructor(maximumNumberOfTries: number, initialBackoffMilliseconds: number, logger?: Logger);
  constructor(
    optionsOrMaxTries: ExponentialBackoffOptions | number,
    initialBackoffMilliseconds?: number,
    logger?: Logger
  ) {
    // Handle both constructor signatures
    if (typeof optionsOrMaxTries === 'object') {
      const options = optionsOrMaxTries;
      this.maxTries = options.maxRetries;
      this.backoffTime = options.initialDelayMs;
      this.maxDelayMs = options.maxDelayMs ?? 60000;
      this.logger = options.logger;
    } else {
      this.maxTries = optionsOrMaxTries;
      this.backoffTime = initialBackoffMilliseconds!;
      this.maxDelayMs = 60000;
      this.logger = logger;
    }

    // Validate
    if (!(this.maxTries > 0)) {
      throw new Error('Maximum Number of Tries must be greater than zero.');
    }

    if (!(this.backoffTime > 0)) {
      throw new Error('Initial Backoff Milliseconds must be greater than zero.');
    }

    this.tries = 0;
  }

  /**
   * Execute an operation with exponential backoff retry logic
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    while (await this.continue()) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.evalStop(lastError, false);
      }
    }

    // If we get here, we've exhausted all retries
    throw lastError ?? new Error('Operation failed after all retry attempts');
  }

  /**
   * Check if we should continue trying and apply backoff delay if needed
   */
  async continue(): Promise<boolean> {
    if (this.tries < this.maxTries) {
      if (this.tries > 0) {
        const delayMs = Math.min(this.backoffTime, this.maxDelayMs);
        await delay(delayMs); // Delay before retry
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
      if (this.logger) {
        this.logger.error(`Max retries (${this.maxTries}) exceeded`, error);
      } else {
        console.error(error);
      }
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
 * @param logger - Optional logger for retry messages
 * @returns Promise resolving to the operation result
 * @throws Error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await tryWith(
 *   () => oDataClient.getProjects({ limit: 100 }),
 *   5,
 *   1000,
 *   logger
 * );
 * ```
 */
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = 5,
  initialBackoffMilliseconds: number = 1000,
  logger?: Logger
): Promise<T> {
  const backoff = new ExponentialBackoff(maximumNumberOfTries, initialBackoffMilliseconds, logger);

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
