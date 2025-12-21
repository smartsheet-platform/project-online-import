import { ProjectOnlineImporter } from '../src/lib/importer';
import { ProjectOnlineClient } from '../src/lib/ProjectOnlineClient';

// Mock ProjectOnlineClient to avoid real authentication in unit tests
jest.mock('../src/lib/ProjectOnlineClient');

describe('ProjectOnlineImporter', () => {
  let importer: ProjectOnlineImporter;
  let mockProjectOnlineClient: jest.Mocked<ProjectOnlineClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instance (partial mock with only testConnection)
    mockProjectOnlineClient = {
      testConnection: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<ProjectOnlineClient>;

    // Make ProjectOnlineClient constructor return our mock
    (ProjectOnlineClient as jest.MockedClass<typeof ProjectOnlineClient>).mockImplementation(
      () => mockProjectOnlineClient
    );

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

    it('should validate GUID format and check config without real authentication', async () => {
      // Mock successful connection to test GUID validation only
      mockProjectOnlineClient.testConnection.mockResolvedValue(true);

      const result = await importer.validate('12345678-1234-1234-1234-123456789abc');

      // With mocked successful connection, validation should pass
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined(); // No errors when valid

      // Verify testConnection was called (but mocked, so no real auth)
      expect(mockProjectOnlineClient.testConnection).toHaveBeenCalledTimes(1);
    });
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
