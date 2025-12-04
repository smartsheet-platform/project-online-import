/**
 * MSAL Authentication Handler for Project Online
 * Handles OAuth token acquisition and refresh using Azure AD Device Code Flow
 * Uses delegated permissions with user authentication
 */

import * as msal from '@azure/msal-node';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { TokenCacheManager } from './TokenCacheManager';
import { DeviceCodeDisplay } from '../util/DeviceCodeDisplay';

export interface AuthConfig {
  tenantId: string;
  clientId: string;
  projectOnlineUrl: string;
  tokenCacheDir?: string; // Optional - custom cache directory
}

export interface TokenResponse {
  accessToken: string;
  expiresOn: Date;
  refreshToken?: string;
}

export class MSALAuthHandler {
  private publicClientApp: msal.PublicClientApplication;
  private cachedToken?: TokenResponse;
  private logger: Logger;
  private config: AuthConfig;
  private tokenCacheManager: TokenCacheManager;

  constructor(config: AuthConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? new Logger();

    // Initialize token cache manager
    this.tokenCacheManager = new TokenCacheManager(config.tokenCacheDir, this.logger);

    // Validate configuration
    this.validateConfig();

    // Initialize MSAL Public Client for Device Code Flow
    this.publicClientApp = this.initializePublicClient();
  }

  /**
   * Initialize Public Client for Device Code Flow
   */
  private initializePublicClient(): msal.PublicClientApplication {
    const msalConfig: msal.Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
      },
    };

    this.logger.debug('MSAL public client initialized (Device Code Flow)');
    return new msal.PublicClientApplication(msalConfig);
  }

  /**
   * Validate authentication configuration
   */
  private validateConfig(): void {
    if (!this.config.tenantId) {
      throw ErrorHandler.configError('TENANT_ID', 'Azure AD tenant ID is required');
    }

    if (!this.config.clientId) {
      throw ErrorHandler.configError('CLIENT_ID', 'Azure AD client (application) ID is required');
    }

    if (!this.config.projectOnlineUrl) {
      throw ErrorHandler.configError('PROJECT_ONLINE_URL', 'Project Online site URL is required');
    }

    // Validate URL format
    try {
      new URL(this.config.projectOnlineUrl);
    } catch {
      throw ErrorHandler.configError(
        'PROJECT_ONLINE_URL',
        'must be a valid URL (e.g., https://contoso.sharepoint.com/sites/pwa)'
      );
    }
  }

  /**
   * Get access token for Project Online API using Device Code Flow
   * Uses cached token if still valid, otherwise acquires new token
   */
  async getAccessToken(): Promise<string> {
    // Try to load token from file cache first
    const cachedToken = await this.tokenCacheManager.load(
      this.config.tenantId,
      this.config.clientId
    );

    if (cachedToken && this.tokenCacheManager.isTokenValid(cachedToken)) {
      DeviceCodeDisplay.showUsingCachedToken();
      this.cachedToken = {
        accessToken: cachedToken.access_token,
        expiresOn: new Date(cachedToken.expires_on),
        refreshToken: cachedToken.refresh_token,
      };
      return cachedToken.access_token;
    }

    // Try to refresh token if we have a refresh token
    if (cachedToken?.refresh_token) {
      try {
        DeviceCodeDisplay.showTokenRefresh();
        const refreshedToken = await this.refreshToken(cachedToken.refresh_token);
        return refreshedToken.accessToken;
      } catch (error) {
        this.logger.warn('Token refresh failed, re-authenticating...');
        await this.tokenCacheManager.clear(this.config.tenantId, this.config.clientId);
      }
    }

    // No valid cached token, acquire new token via device code
    if (cachedToken) {
      DeviceCodeDisplay.showCachedTokenExpired();
    }

    const tokenResponse = await this.acquireTokenByDeviceCode();
    return tokenResponse.accessToken;
  }

  /**
   * Acquire token using Device Code Flow
   */
  private async acquireTokenByDeviceCode(): Promise<TokenResponse> {
    try {
      // Extract SharePoint domain from Project Online URL
      const url = new URL(this.config.projectOnlineUrl);
      const sharePointDomain = `${url.protocol}//${url.hostname}`;

      // Define scopes for delegated permissions
      const scopes = [`${sharePointDomain}/AllSites.Read`, `${sharePointDomain}/AllSites.Write`];

      const deviceCodeRequest: msal.DeviceCodeRequest = {
        deviceCodeCallback: (response) => {
          DeviceCodeDisplay.displayDeviceCode(response.userCode, response.verificationUri);
        },
        scopes,
      };

      const response = await this.publicClientApp.acquireTokenByDeviceCode(deviceCodeRequest);

      if (!response || !response.accessToken) {
        throw ErrorHandler.authError(
          'Failed to acquire access token from Azure AD',
          'Device code authentication did not return a valid token'
        );
      }

      DeviceCodeDisplay.showSuccess();

      // Cache the token
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresOn: response.expiresOn ?? new Date(Date.now() + 3600000), // Default 1 hour
        refreshToken: (response as { refreshToken?: string }).refreshToken, // MSAL may not expose this in types
      };

      // Save to file cache
      await this.tokenCacheManager.save(this.config.tenantId, this.config.clientId, {
        access_token: response.accessToken,
        refresh_token: (response as { refreshToken?: string }).refreshToken,
        expires_on: this.cachedToken.expiresOn.toISOString(),
        scopes,
      });

      this.logger.debug(
        `Access token acquired, expires: ${this.cachedToken.expiresOn.toISOString()}`
      );
      return this.cachedToken;
    } catch (error: unknown) {
      if (error instanceof msal.AuthError) {
        DeviceCodeDisplay.showError(error.errorCode, error.errorMessage);
        throw ErrorHandler.authError(
          `Device code authentication error: ${error.errorCode}`,
          `Message: ${error.errorMessage}\n\n` +
            'Common causes:\n' +
            '  • User declined authentication\n' +
            '  • Device code expired (15 minute timeout)\n' +
            '  • Azure AD app not configured for public client flows\n' +
            '  • Missing delegated permissions (AllSites.Read, AllSites.Write)'
        );
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw ErrorHandler.authError('Device code authentication failed', errorMessage);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Extract SharePoint domain from Project Online URL
      const url = new URL(this.config.projectOnlineUrl);
      const sharePointDomain = `${url.protocol}//${url.hostname}`;

      const scopes = [`${sharePointDomain}/AllSites.Read`, `${sharePointDomain}/AllSites.Write`];

      const refreshRequest: msal.RefreshTokenRequest = {
        refreshToken,
        scopes,
      };

      const response = await this.publicClientApp.acquireTokenByRefreshToken(refreshRequest);

      if (!response || !response.accessToken) {
        throw new Error('Token refresh did not return a valid token');
      }

      // Cache the new token
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresOn: response.expiresOn ?? new Date(Date.now() + 3600000),
        refreshToken: (response as { refreshToken?: string }).refreshToken ?? refreshToken,
      };

      // Save to file cache
      await this.tokenCacheManager.save(this.config.tenantId, this.config.clientId, {
        access_token: response.accessToken,
        refresh_token: this.cachedToken.refreshToken,
        expires_on: this.cachedToken.expiresOn.toISOString(),
        scopes,
      });

      this.logger.debug('Access token refreshed successfully');
      return this.cachedToken;
    } catch (error) {
      this.logger.error('Token refresh failed');
      throw error;
    }
  }

  /**
   * Clear cached token (force token refresh on next request)
   */
  async clearCache(): Promise<void> {
    this.cachedToken = undefined;
    await this.tokenCacheManager.clear(this.config.tenantId, this.config.clientId);
    this.logger.debug('Token cache cleared');
  }

  /**
   * Clear all cached tokens
   */
  async clearAllCaches(): Promise<void> {
    this.cachedToken = undefined;
    await this.tokenCacheManager.clearAll();
    this.logger.debug('All token caches cleared');
  }

  /**
   * Test authentication by attempting to acquire a token
   */
  async testAuthentication(): Promise<boolean> {
    try {
      await this.getAccessToken();
      this.logger.success('✓ Authentication successful');
      return true;
    } catch (error) {
      this.logger.error(
        `✗ Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Get authentication flow being used
   */
  getAuthenticationFlow(): 'device-code' {
    return 'device-code';
  }

  /**
   * Get token cache directory
   */
  getTokenCacheDir(): string {
    return this.tokenCacheManager.getCacheDir();
  }
}
