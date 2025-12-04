/**
 * Utility functions for data transformation
 * Based on the transformation mapping specification
 */

/**
 * Sanitize workspace name according to spec
 * - Remove/replace invalid characters: /\:*?"<>| → -
 * - Consolidate multiple consecutive dashes
 * - Trim leading/trailing spaces and dashes
 * - Truncate to 100 characters max
 */
export function sanitizeWorkspaceName(projectName: string): string {
  // Replace invalid characters with dash
  const invalidChars = /[/\\:*?"<>|]/g;
  let sanitized = projectName.replace(invalidChars, '-');

  // Consolidate multiple dashes
  sanitized = sanitized.replace(/-+/g, '-');

  // Trim leading/trailing spaces and dashes
  sanitized = sanitized.trim().replace(/^-+|-+$/g, '');

  // Truncate if too long
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 97) + '...';
  }

  return sanitized;
}

/**
 * Convert ISO 8601 DateTime to Smartsheet date format (YYYY-MM-DD)
 * Uses UTC methods to avoid timezone conversion issues
 */
export function convertDateTimeToDate(isoDateTime: string): string {
  // Parse datetime and extract date portion using UTC methods
  const date = new Date(isoDateTime);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO 8601 Duration to decimal days for project sheet Duration column
 * Examples: PT40H → 5.0, P5D → 5.0, PT480M → 1.0
 */
export function convertDurationToDecimalDays(isoDuration: string): number {
  // Parse ISO 8601 duration
  const hours = parseHoursFromISO(isoDuration);
  // Convert to days (8-hour workday)
  const days = hours / 8;
  return Math.round(days * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert ISO 8601 Duration to hours string for non-system columns
 * Examples: PT40H → "40h", PT80H → "80h"
 */
export function convertDurationToHoursString(isoDuration: string): string {
  const hours = parseHoursFromISO(isoDuration);
  return `${hours}h`;
}

/**
 * Parse hours from ISO 8601 duration string
 */
function parseHoursFromISO(isoDuration: string): number {
  if (!isoDuration) return 0;

  let totalHours = 0;

  // Match days: P5D or P0DT...
  const daysMatch = isoDuration.match(/P(\d+)D/);
  if (daysMatch) {
    totalHours += parseInt(daysMatch[1], 10) * 8; // 8-hour workday
  }

  // Match hours: PT40H
  const hoursMatch = isoDuration.match(/T(\d+)H/);
  if (hoursMatch) {
    totalHours += parseInt(hoursMatch[1], 10);
  }

  // Match minutes: PT480M
  const minutesMatch = isoDuration.match(/T(\d+)M/);
  if (minutesMatch) {
    totalHours += parseInt(minutesMatch[1], 10) / 60;
  }

  return totalHours;
}

/**
 * Map Project Online priority (0-1000) to Smartsheet picklist label
 * Maintains all 7 priority levels from Project Online
 */
export function mapPriority(priorityValue: number): string {
  if (priorityValue >= 1000) return 'Highest';
  if (priorityValue >= 800) return 'Very High';
  if (priorityValue >= 600) return 'Higher';
  if (priorityValue >= 500) return 'Medium';
  if (priorityValue >= 400) return 'Lower';
  if (priorityValue >= 200) return 'Very Low';
  return 'Lowest';
}

/**
 * Derive task status from percent complete
 */
export function deriveStatus(percentComplete: number): string {
  if (percentComplete === 0) return 'Not Started';
  if (percentComplete === 100) return 'Complete';
  return 'In Progress';
}

/**
 * Generate 3-4 letter prefix from project name for auto-number IDs
 */
export function generateProjectPrefix(projectName: string): string {
  // Clean and split
  const cleanName = projectName.replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 'PRJ';

  if (words.length === 1) {
    // Single word: use first 4 characters (or less if word is shorter)
    return words[0].toUpperCase().substring(0, 4);
  }

  if (words.length === 2) {
    // Two words: first char from each word, supplement from first word to reach 3 chars
    const first = words[0].toUpperCase();
    const second = words[1].toUpperCase();

    // Start with first char of each word
    let prefix = first[0] + second[0];

    // If first word has more characters, supplement to reach 3 chars total
    if (first.length > 1 && prefix.length < 3) {
      prefix = first[0] + first.substring(1, 2) + second[0];
    }

    return prefix;
  }

  // Three or more words: use first letter of each word (up to 4)
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  return initials.substring(0, 4);
}

/**
 * Convert max units (decimal) to percentage string
 * Example: 1.0 → "100%", 0.5 → "50%"
 */
export function convertMaxUnits(maxUnits: number): string {
  const percentage = Math.round(maxUnits * 100);
  return `${percentage}%`;
}

/**
 * Create contact object from name and email
 */
export function createContactObject(
  name?: string,
  email?: string
): { name?: string; email?: string } | null {
  if (!name && !email) return null;

  const contact: { name?: string; email?: string } = {};
  if (email) contact.email = email;
  if (name) contact.name = name;

  return contact;
}
