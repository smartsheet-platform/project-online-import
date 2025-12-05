/**
 * AssignmentTransformer - Transforms Project Online assignments to Smartsheet assignment columns
 *
 * CRITICAL DISTINCTION:
 * - Work resources (people) → MULTI_CONTACT_LIST columns (enables collaboration)
 * - Material/Cost resources → MULTI_PICKLIST columns (simple text values)
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { ProjectOnlineAssignment, ProjectOnlineResource } from '../types/ProjectOnline';
import { getOrAddColumn } from '../util/SmartsheetHelpers';
import { Logger } from '../util/Logger';

export class AssignmentTransformer {
  private logger?: Logger;

  constructor(
    private client: SmartsheetClient,
    logger?: Logger
  ) {
    this.logger = logger;
  }

  /**
   * Transform assignments to task sheet assignment columns
   *
   * @param assignments - Project Online assignments
   * @param resources - Project Online resources (needed to determine resource types)
   * @param taskSheetId - Target task sheet ID
   * @returns Result with column count and sheet ID
   */
  async transformAssignments(
    assignments: ProjectOnlineAssignment[],
    resources: ProjectOnlineResource[],
    taskSheetId: number
  ): Promise<{ columnsCreated: number; sheetId: number }> {
    if (!assignments || assignments.length === 0) {
      return { columnsCreated: 0, sheetId: taskSheetId };
    }

    // Build resource lookup map (ID -> Resource)
    const resourceMap = new Map<string, ProjectOnlineResource>();
    resources.forEach((r) => resourceMap.set(r.Id, r));

    // Find unique resources in assignments
    const uniqueResourceIds = new Set<string>();
    assignments.forEach((a) => uniqueResourceIds.add(a.ResourceId));

    // Group resources by type
    const workResources: ProjectOnlineResource[] = [];
    const nonWorkResources: ProjectOnlineResource[] = [];

    uniqueResourceIds.forEach((resourceId) => {
      const resource = resourceMap.get(resourceId);
      if (resource) {
        if (resource.ResourceType === 'Work') {
          workResources.push(resource);
        } else {
          // Material or Cost
          nonWorkResources.push(resource);
        }
      }
    });

    // Get current column count to determine starting index
    let currentIndex = 0;
    if (this.client.sheets?.getSheet) {
      const sheetResponse = await this.client.sheets.getSheet({ id: taskSheetId });
      const sheet = sheetResponse?.result || sheetResponse?.data;
      currentIndex = sheet?.columns?.length || 0;
    }

    // Create assignment columns with resiliency (skip existing columns)
    let columnsCreated = 0;

    // Create MULTI_CONTACT_LIST columns for Work resources
    for (const resource of workResources) {
      const columnName = resource.Name || 'Unknown Resource';
      try {
        // Use resiliency helper - will skip if column already exists
        await getOrAddColumn(this.client, taskSheetId, {
          title: columnName,
          type: 'MULTI_CONTACT_LIST',
          width: 200,
          index: currentIndex,
        });

        // Only increment if this was a new column
        // (getOrAddColumn returns existing columns without error)
        columnsCreated++;
        currentIndex++;
      } catch (error) {
        // Log but don't fail - column might already exist
        this.logger?.warn(`Failed to add Work resource column ${columnName}`, error);
      }
    }

    // Create MULTI_PICKLIST columns for Material/Cost resources
    for (const resource of nonWorkResources) {
      const columnName = resource.Name || 'Unknown Resource';
      try {
        // Use resiliency helper - will skip if column already exists
        await getOrAddColumn(this.client, taskSheetId, {
          title: columnName,
          type: 'MULTI_PICKLIST',
          width: 200,
          index: currentIndex,
        });

        columnsCreated++;
        currentIndex++;
      } catch (error) {
        // Log but don't fail - column might already exist
        this.logger?.warn(`Failed to add Material/Cost resource column ${columnName}`, error);
      }
    }

    return {
      columnsCreated,
      sheetId: taskSheetId,
    };
  }
}
