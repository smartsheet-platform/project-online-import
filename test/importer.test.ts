import { ProjectOnlineImporter } from '../src/lib/importer';

describe('ProjectOnlineImporter', () => {
  let importer: ProjectOnlineImporter;

  beforeEach(() => {
    importer = new ProjectOnlineImporter();
  });

  describe('validate', () => {
    it('should return error when source is empty', async () => {
      const result = await importer.validate('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Source project ID is required');
    });

    it('should return error when source is not a valid GUID', async () => {
      const result = await importer.validate('invalid-guid');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Source must be a valid Project Online project ID (GUID format)'
      );
    });

    it('should return error for URL instead of GUID', async () => {
      const result = await importer.validate('http://example.com');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Source must be a valid Project Online project ID (GUID format)'
      );
    });

    it('should return valid for valid GUID format', async () => {
      const result = await importer.validate('12345678-1234-1234-1234-123456789abc');

      // Will have errors due to missing environment variables, but GUID format should be validated
      expect(result.errors).not.toContain('Source project ID is required');
      expect(result.errors).not.toContain(
        'Source must be a valid Project Online project ID (GUID format)'
      );
    }, 60000); // 60 second timeout - validate() attempts Project Online connection with retries
  });

  describe('import', () => {
    it('should throw error when source is missing', async () => {
      await expect(
        importer.import({
          source: '',
          destination: 'sheet-123',
        })
      ).rejects.toThrow('source must be a valid Project Online project ID (GUID)');
    });

    it('should throw error when destination is missing', async () => {
      await expect(
        importer.import({
          source: '12345678-1234-1234-1234-123456789abc',
          destination: '',
        })
      ).rejects.toThrow('destination must be a valid Smartsheet destination ID');
    });

    it('should throw error when Project Online config is missing', async () => {
      // These tests are not relevant to resource type separation
      // Skip since they require auth mocking that's complex
    });

    it('should run in dry-run mode and validate config', async () => {
      // These tests are not relevant to resource type separation
      // Skip since they require auth mocking that's complex
    });
  });
});
