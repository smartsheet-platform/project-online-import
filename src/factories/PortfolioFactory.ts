/**
 * PortfolioFactory - Portfolio workspace creation strategy (NOT YET IMPLEMENTED)
 *
 * This is a stub implementation for the Portfolio solution type.
 * The Portfolio approach will create workspaces within a portfolio structure
 * instead of creating standalone workspaces.
 *
 * TODO: Implement portfolio workspace creation logic
 * TODO: Define portfolio-specific configuration requirements
 * TODO: Implement portfolio-specific workspace relationships
 * TODO: Add tests for portfolio workspace creation
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { ProjectOnlineProject } from '../types/ProjectOnline';
import { Logger } from '../util/Logger';
import { ConfigManager } from '../util/ConfigManager';
import {
  WorkspaceFactory,
  PMOStandardsWorkspaceInfo,
  ProjectWorkspaceResult,
} from './WorkspaceFactory';

/**
 * Portfolio workspace factory implementation
 *
 * This factory will create workspaces using a portfolio-based approach where:
 * - PMO Standards workspace may be organized differently
 * - Project workspaces are created within a portfolio structure
 * - Different organizational hierarchy and relationships
 *
 * CURRENT STATUS: NOT IMPLEMENTED - Throws errors when called
 */
export class PortfolioFactory implements WorkspaceFactory {
  /**
   * Create PMO Standards workspace for Portfolio solution type
   *
   * @throws Error - Not yet implemented
   */
  async createStandardsWorkspace(
    _client: SmartsheetClient,
    _existingWorkspaceId?: number,
    _logger?: Logger
  ): Promise<PMOStandardsWorkspaceInfo> {
    throw new Error(
      'Portfolio solution type is not yet implemented. ' +
        'Please use SOLUTION_TYPE=StandaloneWorkspaces in your .env file.'
    );
  }

  /**
   * Create project workspace for Portfolio solution type
   *
   * @throws Error - Not yet implemented
   */
  async createProjectWorkspace(
    _client: SmartsheetClient,
    _project: ProjectOnlineProject,
    _configManager?: ConfigManager,
    _workspaceId?: number
  ): Promise<ProjectWorkspaceResult> {
    throw new Error(
      'Portfolio solution type is not yet implemented. ' +
        'Please use SOLUTION_TYPE=StandaloneWorkspaces in your .env file.'
    );
  }
}

/**
 * Implementation Notes for Future Development:
 *
 * Portfolio Structure Considerations:
 * ─────────────────────────────────────────────────────────────────
 *
 * 1. Portfolio Workspace Hierarchy:
 *    - Top-level Portfolio workspace (container)
 *    - PMO Standards as child workspace or sheets within portfolio
 *    - Project workspaces as children of portfolio
 *    - Shared resources across portfolio projects
 *
 * 2. Configuration Requirements:
 *    - PORTFOLIO_WORKSPACE_ID: ID of the portfolio container
 *    - Portfolio-specific naming conventions
 *    - Portfolio-specific permissions and access control
 *
 * 3. Workspace Creation Differences:
 *    - Projects created as child workspaces of portfolio
 *    - Cross-project references and dependencies
 *    - Portfolio-level reporting and rollup sheets
 *    - Shared PMO Standards within portfolio context
 *
 * 4. Migration Considerations:
 *    - How to handle existing StandaloneWorkspaces
 *    - Data migration path from standalone to portfolio
 *    - Backward compatibility requirements
 *
 * 5. Testing Strategy:
 *    - Mock portfolio workspace structure
 *    - Test hierarchy creation and relationships
 *    - Test cross-project references
 *    - Test permission inheritance
 *
 * 6. Documentation Requirements:
 *    - Portfolio setup guide
 *    - Configuration examples
 *    - Migration guide from StandaloneWorkspaces
 *    - Best practices for portfolio management
 */
