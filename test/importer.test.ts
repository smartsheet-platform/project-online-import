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
      expect(result.errors).toContain('Source URL is required');
    });

    it('should return error when source is not a valid URL', async () => {
      const result = await importer.validate('invalid-url');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Source must be a valid URL');
    });

    it('should return valid for http URL', async () => {
      const result = await importer.validate('http://example.com');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid for https URL', async () => {
      const result = await importer.validate('https://example.com');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('import', () => {
    it('should throw error when source is missing', async () => {
      await expect(
        importer.import({
          source: '',
          destination: 'sheet-123',
        })
      ).rejects.toThrow('Source URL is required');
    });

    it('should throw error when destination is missing', async () => {
      await expect(
        importer.import({
          source: 'https://example.com',
          destination: '',
        })
      ).rejects.toThrow('Destination ID is required');
    });

    it('should complete successfully with valid options', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await importer.import({
        source: 'https://example.com',
        destination: 'sheet-123',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Importing from https://example.com to sheet-123');

      consoleSpy.mockRestore();
    });

    it('should run in dry-run mode without making changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await importer.import({
        source: 'https://example.com',
        destination: 'sheet-123',
        dryRun: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith('(Dry run - no changes made)');

      consoleSpy.mockRestore();
    });
  });
});
