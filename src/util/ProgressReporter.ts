/**
 * Progress reporting for long-running operations
 * Provides visual feedback during ETL pipeline execution
 */

import { Logger } from './Logger';

export interface ProgressOptions {
  total: number;
  label?: string;
  showPercentage?: boolean;
  showCount?: boolean;
  showETA?: boolean;
}

export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  stage?: string;
  message?: string;
}

export class ProgressReporter {
  private current: number = 0;
  private total: number;
  private label: string;
  private showPercentage: boolean;
  private showCount: boolean;
  private showETA: boolean;
  private startTime?: number;
  private logger: Logger;
  private lastUpdate: number = 0;
  private updateInterval: number = 1000; // Update every 1 second

  constructor(options: ProgressOptions, logger?: Logger) {
    this.total = options.total;
    this.label = options.label ?? 'Progress';
    this.showPercentage = options.showPercentage ?? true;
    this.showCount = options.showCount ?? true;
    this.showETA = options.showETA ?? true;
    this.logger = logger ?? new Logger();
  }

  /**
   * Start progress tracking
   */
  start(): void {
    this.startTime = Date.now();
    this.current = 0;
    this.report();
  }

  /**
   * Update progress by increment
   */
  increment(count: number = 1, message?: string): void {
    this.current = Math.min(this.current + count, this.total);
    this.report(message);
  }

  /**
   * Set absolute progress
   */
  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    this.report(message);
  }

  /**
   * Complete progress
   */
  complete(message?: string): void {
    this.current = this.total;
    this.report(message, true);
  }

  /**
   * Report current progress
   */
  private report(message?: string, force: boolean = false): void {
    const now = Date.now();

    // Throttle updates unless forced
    if (!force && now - this.lastUpdate < this.updateInterval) {
      return;
    }

    this.lastUpdate = now;

    const parts: string[] = [this.label];

    // Add count
    if (this.showCount) {
      parts.push(`${this.current}/${this.total}`);
    }

    // Add percentage
    if (this.showPercentage) {
      const percentage = this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
      parts.push(`(${percentage}%)`);
    }

    // Add ETA
    if (this.showETA && this.startTime && this.current > 0) {
      const elapsed = now - this.startTime;
      const rate = this.current / elapsed; // items per ms
      const remaining = this.total - this.current;
      const eta = remaining / rate; // ms remaining

      if (eta > 0 && isFinite(eta)) {
        parts.push(`ETA: ${this.formatDuration(eta)}`);
      }
    }

    // Add custom message
    if (message) {
      parts.push(`- ${message}`);
    }

    const progressMessage = parts.join(' ');

    if (this.current >= this.total) {
      this.logger.success(`✓ ${progressMessage}`);
    } else {
      this.logger.info(progressMessage);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.round(ms / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get current progress state
   */
  getProgress(): ProgressUpdate {
    return {
      current: this.current,
      total: this.total,
      percentage: this.total > 0 ? (this.current / this.total) * 100 : 0,
    };
  }
}

/**
 * Multi-stage progress reporter for complex operations
 */
export class MultiStageProgressReporter {
  private stages: Map<string, { completed: number; total: number }> = new Map();
  private currentStage?: string;
  private logger: Logger;
  private stageOrder: string[] = [];

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger();
  }

  /**
   * Define stages
   */
  defineStages(stages: { name: string; total: number }[]): void {
    this.stageOrder = stages.map((s) => s.name);
    stages.forEach((stage) => {
      this.stages.set(stage.name, { completed: 0, total: stage.total });
    });
  }

  /**
   * Start a stage
   */
  startStage(stageName: string): void {
    this.currentStage = stageName;
    const stage = this.stages.get(stageName);
    if (stage) {
      this.logger.info(`\n📋 Stage: ${stageName} (0/${stage.total})`);
    }
  }

  /**
   * Update current stage progress
   */
  updateStage(count: number = 1, message?: string): void {
    if (!this.currentStage) return;

    const stage = this.stages.get(this.currentStage);
    if (!stage) return;

    stage.completed = Math.min(stage.completed + count, stage.total);

    const percentage = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0;
    const msg = message ? ` - ${message}` : '';
    this.logger.info(`  ${stage.completed}/${stage.total} (${percentage}%)${msg}`);
  }

  /**
   * Complete current stage
   */
  completeStage(message?: string): void {
    if (!this.currentStage) return;

    const stage = this.stages.get(this.currentStage);
    if (stage) {
      stage.completed = stage.total;
      const msg = message ? ` - ${message}` : '';
      this.logger.success(`✓ ${this.currentStage} complete${msg}`);
    }
    this.currentStage = undefined;
  }

  /**
   * Get overall progress across all stages
   */
  getOverallProgress(): ProgressUpdate {
    let totalCompleted = 0;
    let totalItems = 0;

    this.stages.forEach((stage) => {
      totalCompleted += stage.completed;
      totalItems += stage.total;
    });

    return {
      current: totalCompleted,
      total: totalItems,
      percentage: totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0,
    };
  }

  /**
   * Print summary of all stages
   */
  printSummary(): void {
    this.logger.info('\n📊 Import Summary:');

    this.stageOrder.forEach((stageName) => {
      const stage = this.stages.get(stageName);
      if (stage) {
        const status = stage.completed === stage.total ? '✓' : '⚠';
        this.logger.info(`  ${status} ${stageName}: ${stage.completed}/${stage.total}`);
      }
    });

    const overall = this.getOverallProgress();
    this.logger.info(
      `\n  Total: ${overall.current}/${overall.total} (${Math.round(overall.percentage)}%)`
    );
  }
}
