/**
 * Token Cache Manager
 *
 * Manages secure storage and retrieval of OAuth tokens in the user's home directory.
 * Implements platform-specific security measures for token protection.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../util/Logger';

export interface CachedToken {
  version: string;
  tenant_id: string;
  client_id: string;
  access_token: string;
  refresh_token?: string;
  expires_on: string;
  cached_at: string;
  scopes: string[];
}

export class TokenCacheManager {
  private cacheDir: string;
  private logger: Logger;
  private readonly CACHE_VERSION = '1.0';

  constructor(cacheDir?: string, logger?: Logger) {
    this.cacheDir = cacheDir || path.join(os.homedir(), '.project-online-tokens');
    this.logger = logger ?? new Logger();
  }

  /**
   * Save token to cache
   */
  async save(
    tenantId: string,
    clientId: string,
    tokenData: Omit<CachedToken, 'version' | 'tenant_id' | 'client_id' | 'cached_at'>
  ): Promise<void> {
    try {
      // Ensure cache directory exists with secure permissions
      await this.ensureCacheDir();

      const token: CachedToken = {
        version: this.CACHE_VERSION,
        tenant_id: tenantId,
        client_id: clientId,
        cached_at: new Date().toISOString(),
        ...tokenData,
      };

      const cachePath = this.getCachePath(tenantId, clientId);

      // Write token to file with restrictive permissions (owner read/write only)
      await fs.writeFile(cachePath, JSON.stringify(token, null, 2), { mode: 0o600 });

      // Verify permissions were set correctly
      await this.verifyFilePermissions(cachePath);

      this.logger.debug(`Token cached to: ${cachePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save token to cache: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Load token from cache
   */
  async load(tenantId: string, clientId: string): Promise<CachedToken | null> {
    try {
      const cachePath = this.getCachePath(tenantId, clientId);

      // Check if cache file exists
      try {
        await fs.access(cachePath);
      } catch {
        this.logger.debug('No cached token found');
        return null;
      }

      // Verify file permissions before reading
      await this.verifyFilePermissions(cachePath);

      // Read and parse token
      const content = await fs.readFile(cachePath, 'utf-8');
      const token: CachedToken = JSON.parse(content);

      // Validate token structure
      if (!this.validateToken(token)) {
        this.logger.warn('Cached token is invalid or corrupted');
        await this.clear(tenantId, clientId);
        return null;
      }

      // Check if token is for correct tenant/client
      if (token.tenant_id !== tenantId || token.client_id !== clientId) {
        this.logger.warn('Cached token is for different tenant/client');
        return null;
      }

      this.logger.debug('Loaded token from cache');
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to load token from cache: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Clear cached token for specific tenant/client
   */
  async clear(tenantId: string, clientId: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(tenantId, clientId);

      try {
        await fs.unlink(cachePath);
        this.logger.debug(`Cleared token cache: ${cachePath}`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, nothing to clear
      }
    } catch (error) {
      this.logger.error(
        `Failed to clear token cache: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Clear all cached tokens
   */
  async clearAll(): Promise<void> {
    try {
      // Check if cache directory exists
      try {
        await fs.access(this.cacheDir);
      } catch {
        // Directory doesn't exist, nothing to clear
        return;
      }

      // Read all files in cache directory
      const files = await fs.readdir(this.cacheDir);

      // Delete all .json files
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }

      this.logger.debug(`Cleared all token caches from: ${this.cacheDir}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear all token caches: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get cache file path for tenant/client combination
   */
  private getCachePath(tenantId: string, _clientId: string): string {
    // Use tenant ID as filename (one token per tenant)
    // clientId parameter kept for future use if needed for multiple apps per tenant
    return path.join(this.cacheDir, `${tenantId}.json`);
  }

  /**
   * Ensure cache directory exists with secure permissions
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      // Create directory with restrictive permissions (owner access only)
      await fs.mkdir(this.cacheDir, { mode: 0o700, recursive: true });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
        throw error;
      }
    }

    // Verify directory permissions
    const stats = await fs.stat(this.cacheDir);

    // On Unix-like systems, check permissions
    if (process.platform !== 'win32') {
      const permissions = stats.mode & 0o777;
      if (permissions !== 0o700) {
        this.logger.warn(
          `Cache directory has insecure permissions: ${permissions.toString(8)}, fixing...`
        );
        await fs.chmod(this.cacheDir, 0o700);
      }
    }
  }

  /**
   * Verify cache file has secure permissions
   */
  private async verifyFilePermissions(filePath: string): Promise<void> {
    // On Windows, file permissions work differently
    if (process.platform === 'win32') {
      return; // Windows uses ACLs, which are handled differently
    }

    const stats = await fs.stat(filePath);
    const permissions = stats.mode & 0o777;

    // File should be readable/writable by owner only (0600)
    if (permissions !== 0o600) {
      this.logger.warn(
        `Token cache file has insecure permissions: ${permissions.toString(8)}, fixing...`
      );
      await fs.chmod(filePath, 0o600);
    }
  }

  /**
   * Validate token structure and required fields
   */
  private validateToken(token: unknown): token is CachedToken {
    return (
      token !== null &&
      token !== undefined &&
      typeof token === 'object' &&
      'version' in token &&
      typeof token.version === 'string' &&
      'tenant_id' in token &&
      typeof token.tenant_id === 'string' &&
      'client_id' in token &&
      typeof token.client_id === 'string' &&
      'access_token' in token &&
      typeof token.access_token === 'string' &&
      'expires_on' in token &&
      typeof token.expires_on === 'string' &&
      'cached_at' in token &&
      typeof token.cached_at === 'string' &&
      'scopes' in token &&
      Array.isArray(token.scopes)
    );
  }

  /**
   * Check if cached token is still valid (with buffer)
   */
  isTokenValid(token: CachedToken, bufferMinutes: number = 5): boolean {
    try {
      const expiresOn = new Date(token.expires_on);
      const now = new Date();
      const bufferMs = bufferMinutes * 60 * 1000;

      return expiresOn.getTime() - now.getTime() > bufferMs;
    } catch {
      return false;
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}
