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
 * Determine if an error is retryable based on error classification
 *
 * Retryable errors:
 * - Network timeouts (ETIMEDOUT, ECONNABORTED, ECONNREFUSED, ENOTFOUND, ENETUNREACH)
 * - Server errors (500, 502, 503, 504)
 * - Rate limits (429)
 * - Not Found errors (404) - for eventual consistency in read-after-write sequences
 *
 * Non-retryable errors:
 * - Authentication errors (401)
 * - Authorization errors (403)
 * - Client errors (400, 422, other 4xx except 404 and 429)
 *
 * @param error - The error to classify
 * @returns true if error should be retried, false otherwise
 */
function isRetryableError(error: any): boolean {
  // Check for Smartsheet API errors with statusCode property
  if (error.statusCode) {
    const status = error.statusCode;

    // Retryable: 404 (eventual consistency), 429 (rate limit), or 5xx (server errors)
    if (status === 404 || status === 429 || (status >= 500 && status < 600)) {
      return true;
    }

    // Non-retryable: everything else (2xx, 3xx, 4xx except 404 and 429, 600+)
    return false;
  }

  // Check for Axios errors with response status
  if (error.response?.status) {
    const status = error.response.status;

    // Retryable: 404 (eventual consistency), 429 (rate limit), or 5xx (server errors)
    if (status === 404 || status === 429 || (status >= 500 && status < 600)) {
      return true;
    }

    // Non-retryable: everything else (2xx, 3xx, 4xx except 404 and 429, 600+)
    return false;
  }

  // Check for Node.js network errors (transient errors)
  if (error.code) {
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNABORTED',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
    ];
    if (retryableCodes.includes(error.code)) {
      return true;
    }
  }

  // Default: retry unknown errors (could be transient)
  return true;
}

/**
 * Convenience function to wrap an async operation with exponential backoff retry logic
 *
 * Implements error classification:
 * - Rate limit errors (429) trigger retries with exponential backoff
 * - Transient errors (network timeouts, 5xx) trigger retries
 * - Non-retryable errors (401, 403, 4xx) are thrown immediately without retry
 *
 * @param operationFunction - Async function to execute with retry logic
 * @param maximumNumberOfTries - Maximum retry attempts (default: from RETRY_MAX_RETRIES env or 5)
 * @param initialBackoffMilliseconds - Initial delay in milliseconds (default: from RETRY_INITIAL_DELAY_MS env or 1000)
 * @param logger - Optional logger for retry messages
 * @returns Promise resolving to the operation result
 * @throws Error immediately for non-retryable errors, or after exhausting retries for retryable errors
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
  maximumNumberOfTries: number = parseInt(process.env.RETRY_MAX_RETRIES || '5', 10),
  initialBackoffMilliseconds: number = parseInt(process.env.RETRY_INITIAL_DELAY_MS || '1000', 10),
  logger?: Logger
): Promise<T> {
  const backoff = new ExponentialBackoff(maximumNumberOfTries, initialBackoffMilliseconds, logger);

  while (await backoff.continue()) {
    try {
      const result = await operationFunction();
      return result;
    } catch (error) {
      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error - throw immediately without retry
        if (logger) {
          logger.error(
            'Non-retryable error encountered (401, 403, or 4xx), skipping retry',
            error as Error
          );
        }
        throw error;
      }

      // Retryable error - continue with retry logic
      // On last attempt, raise the error
      backoff.evalStop(error as Error, true);
    }
  }

  // This should never be reached due to evalStop throwing on last attempt
  throw new Error('Exhausted all retry attempts');
}
