/**
 * Logging utility for CLI operations
 * Provides structured logging with different levels and formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamps?: boolean;
  colors?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamps: boolean;
  private colors: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '';
    this.timestamps = options.timestamps ?? false;
    this.colors = options.colors ?? true;
  }

  /**
   * Set the logging level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log debug message (only shown if level is DEBUG)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, args, '\x1b[90m'); // Gray
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, args, '\x1b[36m'); // Cyan
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, args, '\x1b[33m'); // Yellow
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, args, '\x1b[31m'); // Red
    }
  }

  /**
   * Log success message (always shown unless SILENT)
   */
  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('SUCCESS', message, args, '\x1b[32m'); // Green
    }
  }

  /**
   * Format and output log message
   */
  private log(level: string, message: string, args: unknown[], color: string): void {
    const timestamp = this.timestamps ? `[${new Date().toISOString()}] ` : '';
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const levelStr = `[${level}]`;
    const reset = '\x1b[0m';

    const formattedMessage = this.colors
      ? `${color}${timestamp}${levelStr}${reset} ${prefix}${message}`
      : `${timestamp}${levelStr} ${prefix}${message}`;

    if (level === 'ERROR') {
      console.error(formattedMessage, ...args);
    } else {
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      timestamps: this.timestamps,
      colors: this.colors,
    });
  }
}

// Default logger instance
export const logger = new Logger({
  level: LogLevel.INFO,
  timestamps: false,
  colors: true,
});
