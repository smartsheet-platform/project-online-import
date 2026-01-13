/**
 * AssignmentTransformer - Transforms Project Online assignments to Smartsheet assignment columns
 *
 * CRITICAL DISTINCTION:
 * - Work resources (people) → MULTI_CONTACT_LIST columns (enables collaboration)
 * - Material/Cost resources → MULTI_PICKLIST columns (simple text values)
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { ProjectOnlineAssignment, ProjectOnlineResource } from '../types/ProjectOnline';
import { addColumnsIfNotExist } from '../util/SmartsheetHelpers';

export class AssignmentTransformer {
  constructor(private client: SmartsheetClient) {}

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

    // Extract task-resource mappings from assignments
    const taskResourceMappings = new Map<string, string[]>(); // TaskId -> ResourceIds[]
    
    // assignments.forEach((assignment) => {
    //   // Extract Resource ID from deferred URI
    //   const resourceUri = assignment.Resource?.__deferred?.uri;
    //   const resourceMatch = resourceUri?.match(/ProjectResources\('([^']+)'\)/);
    //   const resourceId = resourceMatch?.[1];
      
    //   // Extract Task ID from deferred URI  
    //   const taskUri = assignment.Task?.__deferred?.uri;
    //   const taskMatch = taskUri?.match(/Tasks\('([^']+)'\)/);
    //   const taskId = taskMatch?.[1];
      
    //   if (resourceId && taskId) {
    //     if (!taskResourceMappings.has(taskId)) {
    //       taskResourceMappings.set(taskId, []);
    //     }
    //     taskResourceMappings.get(taskId)!.push(resourceId);
    //   }
    // });

    // Get unique resources that are actually assigned to tasks
    const assignedResourceIds = new Set<string>();
    taskResourceMappings.forEach((resourceIds) => {
      resourceIds.forEach((id) => assignedResourceIds.add(id));
    });

    // Group assigned resources by type
    const workResources: ProjectOnlineResource[] = [];
    const nonWorkResources: ProjectOnlineResource[] = [];

    assignedResourceIds.forEach((resourceId) => {
      const resource = resourceMap.get(resourceId);
      if (resource) {
        // Use CSOM DefaultBookingType: 1=Work, 2=Material, 3=Cost
        if (resource.DefaultBookingType === 1) {
          workResources.push(resource);
        } else {
          nonWorkResources.push(resource);
        }
      }
    });

    // OPTIMIZATION: Batch add all assignment columns together
    // Build array of all columns to add (Work resources + Material/Cost resources)
    const columnsToAdd: Array<{ title: string; type: 'MULTI_CONTACT_LIST' | 'MULTI_PICKLIST' }> =
      [];

    // Add MULTI_CONTACT_LIST columns for Work resources
    for (const resource of workResources) {
      const columnName = resource.Name || 'Unknown Resource';
      columnsToAdd.push({
        title: columnName,
        type: 'MULTI_CONTACT_LIST',
      });
    }

    // Add MULTI_PICKLIST columns for Material/Cost resources
    for (const resource of nonWorkResources) {
      const columnName = resource.Name || 'Unknown Resource';
      columnsToAdd.push({
        title: columnName,
        type: 'MULTI_PICKLIST',
      });
    }

    // Use batch helper to add all columns at once (skips existing columns automatically)
    const addedColumns = await addColumnsIfNotExist(this.client, taskSheetId, columnsToAdd);

    // Count only newly created columns
    const columnsCreated = addedColumns.filter((col) => col.wasCreated).length;

    return {
      columnsCreated,
      sheetId: taskSheetId,
    };
  }
}
