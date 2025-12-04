/**
 * WorkspaceFactoryProvider - Factory selector based on configuration
 *
 * Provides a centralized way to get the appropriate workspace factory
 * implementation based on the SOLUTION_TYPE configuration.
 *
 * Implements singleton pattern for factory instances to avoid unnecessary
 * object creation.
 */

import { WorkspaceFactory } from './WorkspaceFactory';
import { StandaloneWorkspacesFactory } from './StandaloneWorkspacesFactory';
import { PortfolioFactory } from './PortfolioFactory';
import { ConfigManager } from '../util/ConfigManager';

/**
 * Factory provider with caching
 */
export class WorkspaceFactoryProvider {
  private static instances: Map<string, WorkspaceFactory> = new Map();

  /**
   * Get the appropriate factory based on configuration
   *
   * @param configManager - Optional configuration manager. If not provided,
   *                        defaults to StandaloneWorkspacesFactory
   * @returns WorkspaceFactory instance
   * @throws Error if solution type is unknown or not yet implemented
   */
  static getFactory(configManager?: ConfigManager): WorkspaceFactory {
    // Get solution type from config or default to StandaloneWorkspaces
    const solutionType = configManager?.get().solutionType ?? 'StandaloneWorkspaces';

    // Return cached instance if available
    if (this.instances.has(solutionType)) {
      return this.instances.get(solutionType)!;
    }

    // Create new factory instance and cache it
    const factory = this.createFactory(solutionType);
    this.instances.set(solutionType, factory);
    return factory;
  }

  /**
   * Create factory instance based on solution type
   *
   * @param solutionType - The solution type to create factory for
   * @returns WorkspaceFactory instance
   * @throws Error if solution type is unknown or not yet implemented
   */
  private static createFactory(solutionType: string): WorkspaceFactory {
    switch (solutionType) {
      case 'StandaloneWorkspaces':
        return new StandaloneWorkspacesFactory();

      case 'Portfolio':
        return new PortfolioFactory();

      default:
        throw new Error(
          `Unknown SOLUTION_TYPE: "${solutionType}". ` +
            `Valid options are: StandaloneWorkspaces, Portfolio`
        );
    }
  }

  /**
   * Clear cached factory instances
   * Useful for testing or when configuration changes
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get currently cached factory types
   * Useful for debugging
   */
  static getCachedTypes(): string[] {
    return Array.from(this.instances.keys());
  }
}
