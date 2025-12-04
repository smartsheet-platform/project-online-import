import {
  sanitizeWorkspaceName,
  convertDateTimeToDate,
  convertDurationToDecimalDays,
  convertDurationToHoursString,
  mapPriority,
  deriveStatus,
  generateProjectPrefix,
  convertMaxUnits,
  createContactObject,
} from '../../src/transformers/utils';

describe('Transformation Utils', () => {
  describe('sanitizeWorkspaceName', () => {
    it('should preserve valid workspace names', () => {
      expect(sanitizeWorkspaceName('Website Redesign 2024')).toBe('Website Redesign 2024');
    });

    it('should replace invalid characters with dashes', () => {
      expect(sanitizeWorkspaceName('Q1/Q2 Planning & Execution')).toBe(
        'Q1-Q2 Planning & Execution'
      );
      expect(sanitizeWorkspaceName('Project: New Product Launch')).toBe(
        'Project- New Product Launch'
      );
      expect(sanitizeWorkspaceName('IT Infrastructure | Phase 1')).toBe(
        'IT Infrastructure - Phase 1'
      );
    });

    it('should consolidate multiple dashes', () => {
      expect(sanitizeWorkspaceName('Project -- Name')).toBe('Project - Name');
      expect(sanitizeWorkspaceName('A///B')).toBe('A-B');
    });

    it('should trim leading and trailing spaces and dashes', () => {
      expect(sanitizeWorkspaceName('  Project Name  ')).toBe('Project Name');
      expect(sanitizeWorkspaceName('-Project-')).toBe('Project');
    });

    it('should truncate long names', () => {
      const longName =
        'Very Long Project Name That Exceeds The Character Limit For Workspaces By Being Too Verbose And Detailed';
      const result = sanitizeWorkspaceName(longName);
      expect(result.length).toBe(100);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('convertDateTimeToDate', () => {
    it('should convert ISO 8601 DateTime to date string', () => {
      expect(convertDateTimeToDate('2024-03-15T09:00:00Z')).toBe('2024-03-15');
      expect(convertDateTimeToDate('2024-12-31T23:59:59Z')).toBe('2024-12-31');
    });

    it('should handle timezone offsets', () => {
      expect(convertDateTimeToDate('2024-03-15T09:00:00-08:00')).toBe('2024-03-15');
    });
  });

  describe('convertDurationToDecimalDays', () => {
    it('should convert hours to decimal days', () => {
      expect(convertDurationToDecimalDays('PT40H')).toBe(5.0); // 40 hours / 8 = 5 days
      expect(convertDurationToDecimalDays('PT8H')).toBe(1.0); // 8 hours = 1 day
      expect(convertDurationToDecimalDays('PT36H')).toBe(4.5); // 36 hours / 8 = 4.5 days
    });

    it('should convert days directly', () => {
      expect(convertDurationToDecimalDays('P5D')).toBe(5.0);
      expect(convertDurationToDecimalDays('P1D')).toBe(1.0);
    });

    it('should convert minutes to days', () => {
      expect(convertDurationToDecimalDays('PT480M')).toBe(1.0); // 480 min = 8 hours = 1 day
    });

    it('should handle zero duration', () => {
      expect(convertDurationToDecimalDays('')).toBe(0);
    });
  });

  describe('convertDurationToHoursString', () => {
    it('should convert duration to hours string', () => {
      expect(convertDurationToHoursString('PT40H')).toBe('40h');
      expect(convertDurationToHoursString('PT80H')).toBe('80h');
    });

    it('should handle days in duration', () => {
      expect(convertDurationToHoursString('P5D')).toBe('40h'); // 5 days * 8 hours
    });
  });

  describe('mapPriority', () => {
    it('should map priority values to labels', () => {
      expect(mapPriority(0)).toBe('Lowest');
      expect(mapPriority(200)).toBe('Very Low');
      expect(mapPriority(400)).toBe('Lower');
      expect(mapPriority(500)).toBe('Medium');
      expect(mapPriority(600)).toBe('Higher');
      expect(mapPriority(800)).toBe('Very High');
      expect(mapPriority(1000)).toBe('Highest');
    });

    it('should handle edge cases', () => {
      expect(mapPriority(199)).toBe('Lowest');
      expect(mapPriority(501)).toBe('Medium');
      expect(mapPriority(1001)).toBe('Highest');
    });
  });

  describe('deriveStatus', () => {
    it('should derive status from percent complete', () => {
      expect(deriveStatus(0)).toBe('Not Started');
      expect(deriveStatus(50)).toBe('In Progress');
      expect(deriveStatus(100)).toBe('Complete');
    });

    it('should handle edge cases', () => {
      expect(deriveStatus(1)).toBe('In Progress');
      expect(deriveStatus(99)).toBe('In Progress');
    });
  });

  describe('generateProjectPrefix', () => {
    it('should generate prefix from project name', () => {
      expect(generateProjectPrefix('Website Redesign')).toBe('WER'); // W, E from Website, R from Redesign
      expect(generateProjectPrefix('Website Redesign 2024')).toBe('WR2'); // 3 words = 3 initials
      expect(generateProjectPrefix('Q1 Planning')).toBe('Q1P'); // Q1 (2 chars) + P from Planning
      expect(generateProjectPrefix('Infrastructure')).toBe('INFR'); // single word, first 4 chars
      expect(generateProjectPrefix('ACME Corp Redesign')).toBe('ACR'); // 3 words = 3 initials
      expect(generateProjectPrefix('Web App Dev Q1')).toBe('WADQ'); // 4 words = 4 initials
    });

    it('should handle edge cases', () => {
      expect(generateProjectPrefix('IT')).toBe('IT'); // too short, no padding needed
      expect(generateProjectPrefix('')).toBe('PRJ'); // empty, default
      expect(generateProjectPrefix('A')).toBe('A'); // single letter
    });

    it('should handle special characters', () => {
      expect(generateProjectPrefix('Project: Name')).toBe('PRN'); // P, R from Project, N from Name
    });
  });

  describe('convertMaxUnits', () => {
    it('should convert decimal to percentage string', () => {
      expect(convertMaxUnits(1.0)).toBe('100%');
      expect(convertMaxUnits(0.5)).toBe('50%');
      expect(convertMaxUnits(1.5)).toBe('150%');
    });
  });

  describe('createContactObject', () => {
    it('should create contact with name and email', () => {
      expect(createContactObject('John Doe', 'john@example.com')).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should create contact with email only', () => {
      expect(createContactObject(undefined, 'john@example.com')).toEqual({
        email: 'john@example.com',
      });
    });

    it('should create contact with name only', () => {
      expect(createContactObject('John Doe', undefined)).toEqual({
        name: 'John Doe',
      });
    });

    it('should return null if both are missing', () => {
      expect(createContactObject(undefined, undefined)).toBeNull();
      expect(createContactObject('', '')).toBeNull();
    });
  });
});
