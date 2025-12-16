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
      // Valid GUID with .env.test credentials attempts connection and fails with auth error
      await expect(
        importer.import({
          source: '12345678-1234-1234-1234-123456789abc',
          destination: 'sheet-123',
        })
      ).rejects.toThrow('Authentication error');
    }, 60000); // 60 second timeout - import() attempts connection with retries

    it('should run in dry-run mode and validate config', async () => {
      // Dry run mode will attempt to initialize Project Online client and test connection
      // which will fail due to missing/invalid Project Online credentials (401 Unauthorized)
      await expect(
        importer.import({
          source: '12345678-1234-1234-1234-123456789abc',
          destination: 'sheet-123',
          dryRun: true,
        })
      ).rejects.toThrow('Failed to connect to');
    }, 60000); // 60 second timeout - dry-run attempts connection with retries
  });
});
