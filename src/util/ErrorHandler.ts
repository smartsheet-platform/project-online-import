/**
 * Error handling with actionable user messages
 * Provides context-specific guidance for common error scenarios
 */

import { Logger } from './Logger';

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly actionable: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export class ConfigurationError extends ImportError {
  constructor(message: string, actionable: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', actionable, details);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends ImportError {
  constructor(message: string, actionable: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', actionable, details);
    this.name = 'ValidationError';
  }
}

export class ConnectionError extends ImportError {
  constructor(message: string, actionable: string, details?: unknown) {
    super(message, 'CONNECTION_ERROR', actionable, details);
    this.name = 'ConnectionError';
  }
}

export class DataError extends ImportError {
  constructor(message: string, actionable: string, details?: unknown) {
    super(message, 'DATA_ERROR', actionable, details);
    this.name = 'DataError';
  }
}

/**
 * Error handler with context-aware messaging
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger();
  }

  /**
   * Handle and format error with actionable guidance
   */
  handle(error: unknown, context?: string): void {
    if (error instanceof ImportError) {
      this.handleImportError(error, context);
    } else if (error instanceof Error) {
      this.handleGenericError(error, context);
    } else {
      this.handleUnknownError(error, context);
    }
  }

  /**
   * Handle known import errors with actionable messages
   */
  private handleImportError(error: ImportError, context?: string): void {
    const prefix = context ? `[${context}] ` : '';

    this.logger.error(`${prefix}${error.message}`);
    this.logger.info(`\n💡 What to do: ${error.actionable}`);

    if (error.details) {
      this.logger.debug('Error details:', error.details);
    }
  }

  /**
   * Handle generic errors with helpful context
   */
  private handleGenericError(error: Error, context?: string): void {
    const prefix = context ? `[${context}] ` : '';

    this.logger.error(`${prefix}${error.message}`);

    // Provide context-specific guidance
    const actionable = this.inferActionableGuidance(error);
    if (actionable) {
      this.logger.info(`\n💡 What to do: ${actionable}`);
    }

    this.logger.debug('Stack trace:', error.stack);
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: unknown, context?: string): void {
    const prefix = context ? `[${context}] ` : '';

    this.logger.error(`${prefix}An unexpected error occurred`);
    this.logger.debug('Error details:', error);

    this.logger.info(
      '\n💡 What to do: This is an unexpected error. ' +
        'Please check your configuration and try again. ' +
        'If the problem persists, contact support with the error details.'
    );
  }

  /**
   * Infer actionable guidance from error message patterns
   */
  private inferActionableGuidance(error: Error): string | null {
    const message = error.message.toLowerCase();

    // API token issues
    if (message.includes('token') || message.includes('unauthorized') || message.includes('401')) {
      return (
        'Check your SMARTSHEET_API_TOKEN in the .env file. ' +
        "Ensure it's valid and has the necessary permissions."
      );
    }

    // Network issues
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused')
    ) {
      return (
        'Check your internet connection. ' +
        'Verify that you can access the Smartsheet API at https://api.smartsheet.com'
      );
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return (
        "You've hit the API rate limit. " +
        'Wait a few minutes and try again. ' +
        'Consider reducing batch sizes if this persists.'
      );
    }

    // Permission issues
    if (
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('403')
    ) {
      return (
        'Your API token lacks the required permissions. ' +
        'Ensure the token has access to create workspaces and sheets.'
      );
    }

    // Not found
    if (message.includes('not found') || message.includes('404')) {
      return (
        'The specified resource was not found. ' + 'Verify the workspace or sheet ID is correct.'
      );
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return (
        'The data failed validation. ' +
        'Check that all required fields are present and properly formatted.'
      );
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out')) {
      return (
        'The operation timed out. ' +
        'This may be due to processing a large dataset. ' +
        'Try again or consider breaking the import into smaller batches.'
      );
    }

    return null;
  }

  /**
   * Create configuration error with actionable message
   */
  static configError(field: string, issue: string): ConfigurationError {
    return new ConfigurationError(
      `Configuration error: ${field} - ${issue}`,
      `Update your .env file to set ${field} correctly. ` +
        `Copy .env.sample to .env if you haven't already, then fill in the required values.`
    );
  }

  /**
   * Create validation error with actionable message
   */
  static validationError(field: string, expected: string, actual?: string): ValidationError {
    const details = actual ? ` (got: ${actual})` : '';
    return new ValidationError(
      `Validation error: ${field} must be ${expected}${details}`,
      `Ensure ${field} is ${expected} before importing. ` +
        `Check your source data for missing or invalid values.`
    );
  }

  /**
   * Create connection error with actionable message
   */
  static connectionError(service: string, details?: string): ConnectionError {
    return new ConnectionError(
      `Failed to connect to ${service}${details ? `: ${details}` : ''}`,
      `Check your internet connection and verify that ${service} is accessible. ` +
        `If using a corporate network, ensure the service URL is not blocked.`,
      details
    );
  }

  /**
   * Create data error with actionable message
   */
  static dataError(issue: string, suggestion: string): DataError {
    return new DataError(`Data error: ${issue}`, suggestion);
  }

  /**
   * Create authentication error with actionable message
   */
  static authError(message: string, suggestion: string): ConnectionError {
    return new ConnectionError(`Authentication error: ${message}`, suggestion);
  }

  /**
   * Create rate limit error with actionable message
   */
  static rateLimitError(retryAfterMs?: number): ConnectionError {
    const waitTime = retryAfterMs
      ? `Wait ${Math.ceil(retryAfterMs / 1000)} seconds`
      : 'Wait a few minutes';

    return new ConnectionError(
      'API rate limit exceeded',
      `${waitTime} before retrying. Consider reducing the request rate or batch size.`,
      { retryAfterMs }
    );
  }

  /**
   * Create API error with actionable message
   */
  static apiError(message: string, details?: string): ConnectionError {
    return new ConnectionError(
      message,
      'Check the service status and your network connection. If the problem persists, contact support.',
      details
    );
  }

  /**
   * Create network error with actionable message
   */
  static networkError(message: string, suggestion: string): ConnectionError {
    return new ConnectionError(message, suggestion);
  }
}
