/**
 * MSAL Authentication Handler for Project Online
 * Handles OAuth token acquisition and refresh using Azure AD
 * Supports both Client Credentials flow (app-only) and Device Code flow (user auth)
 */

import * as msal from '@azure/msal-node';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { TokenCacheManager } from './TokenCacheManager';
import { DeviceCodeDisplay } from '../util/DeviceCodeDisplay';

export interface AuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret?: string; // Optional - for Client Credentials flow
  projectOnlineUrl: string;
  useDeviceCodeFlow?: boolean; // Default: auto-detect based on clientSecret
  tokenCacheDir?: string; // Optional - custom cache directory
}

export interface TokenResponse {
  accessToken: string;
  expiresOn: Date;
  refreshToken?: string;
}

export class MSALAuthHandler {
  private confidentialClientApp?: msal.ConfidentialClientApplication;
  private publicClientApp?: msal.PublicClientApplication;
  private cachedToken?: TokenResponse;
  private logger: Logger;
  private config: AuthConfig;
  private tokenCacheManager: TokenCacheManager;
  private useDeviceCodeFlow: boolean;

  constructor(config: AuthConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? new Logger();

    // Initialize token cache manager
    this.tokenCacheManager = new TokenCacheManager(config.tokenCacheDir, this.logger);

    // Determine authentication flow
    this.useDeviceCodeFlow = config.useDeviceCodeFlow ?? !config.clientSecret;

    // Validate configuration
    this.validateConfig();

    // Initialize appropriate MSAL client
    if (this.useDeviceCodeFlow) {
      this.initializePublicClient();
    } else {
      this.initializeConfidentialClient();
    }
  }

  /**
   * Initialize Public Client for Device Code Flow
   */
  private initializePublicClient(): void {
    const msalConfig: msal.Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
      },
    };

    this.publicClientApp = new msal.PublicClientApplication(msalConfig);
    this.logger.debug('MSAL public client initialized (Device Code Flow)');
  }

  /**
   * Initialize Confidential Client for Client Credentials Flow
   */
  private initializeConfidentialClient(): void {
    if (!this.config.clientSecret) {
      throw ErrorHandler.configError(
        'CLIENT_SECRET',
        'Client secret is required for Client Credentials flow'
      );
    }

    const msalConfig: msal.Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
        clientSecret: this.config.clientSecret,
      },
    };

    this.confidentialClientApp = new msal.ConfidentialClientApplication(msalConfig);
    this.logger.debug('MSAL confidential client initialized (Client Credentials Flow)');
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

    // Client secret only required for Client Credentials flow
    if (!this.useDeviceCodeFlow && !this.config.clientSecret) {
      throw ErrorHandler.configError(
        'CLIENT_SECRET',
        'Azure AD client secret is required for Client Credentials flow'
      );
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
   * Get access token for Project Online API
   * Uses cached token if still valid, otherwise acquires new token
   */
  async getAccessToken(): Promise<string> {
    if (this.useDeviceCodeFlow) {
      return this.getAccessTokenDeviceCodeFlow();
    } else {
      return this.getAccessTokenClientCredentials();
    }
  }

  /**
   * Get access token using Device Code Flow
   */
  private async getAccessTokenDeviceCodeFlow(): Promise<string> {
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
   * Get access token using Client Credentials Flow
   */
  private async getAccessTokenClientCredentials(): Promise<string> {
    // Check if we have a valid in-memory cached token
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      this.logger.debug('Using cached access token');
      return this.cachedToken.accessToken;
    }

    // Acquire new token
    this.logger.debug('Acquiring new access token from Azure AD');
    const tokenResponse = await this.acquireTokenByClientCredential();
    return tokenResponse.accessToken;
  }

  /**
   * Acquire token using Device Code Flow
   */
  private async acquireTokenByDeviceCode(): Promise<TokenResponse> {
    if (!this.publicClientApp) {
      throw ErrorHandler.authError(
        'Public client not initialized',
        'Device Code Flow requires public client initialization'
      );
    }

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
   * Acquire token using Client Credentials Flow
   */
  private async acquireTokenByClientCredential(): Promise<TokenResponse> {
    if (!this.confidentialClientApp) {
      throw ErrorHandler.authError(
        'Confidential client not initialized',
        'Client Credentials Flow requires confidential client initialization'
      );
    }

    try {
      // Extract SharePoint domain from Project Online URL
      const url = new URL(this.config.projectOnlineUrl);
      const sharePointDomain = `${url.protocol}//${url.hostname}`;

      // Request token with SharePoint scope
      const tokenRequest: msal.ClientCredentialRequest = {
        scopes: [`${sharePointDomain}/.default`],
      };

      const response =
        await this.confidentialClientApp.acquireTokenByClientCredential(tokenRequest);

      if (!response || !response.accessToken) {
        throw ErrorHandler.authError(
          'Failed to acquire access token from Azure AD',
          'Verify your Azure AD app registration and credentials'
        );
      }

      // Cache the token
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresOn: response.expiresOn ?? new Date(Date.now() + 3600000), // Default 1 hour
      };

      this.logger.debug(
        `Access token acquired, expires: ${this.cachedToken.expiresOn.toISOString()}`
      );
      return this.cachedToken;
    } catch (error: unknown) {
      if (error instanceof msal.AuthError) {
        throw ErrorHandler.authError(
          `MSAL authentication error: ${error.errorCode}`,
          `Message: ${error.errorMessage}\n\n` +
            'Common causes:\n' +
            '  • Invalid tenant ID, client ID, or client secret\n' +
            '  • Azure AD app not properly configured\n' +
            '  • Missing API permissions (Sites.ReadWrite.All)\n' +
            '  • Admin consent not granted\n' +
            '  • Tenant has app-only authentication disabled'
        );
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw ErrorHandler.authError('Authentication failed', errorMessage);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    if (!this.publicClientApp) {
      throw ErrorHandler.authError(
        'Public client not initialized',
        'Token refresh requires public client initialization'
      );
    }

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
   * Check if token is still valid (with 5-minute buffer)
   */
  private isTokenValid(tokenResponse: TokenResponse): boolean {
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const expiresAt = tokenResponse.expiresOn.getTime();
    const now = Date.now();
    return expiresAt - now > bufferMs;
  }

  /**
   * Clear cached token (force token refresh on next request)
   */
  async clearCache(): Promise<void> {
    this.cachedToken = undefined;
    if (this.useDeviceCodeFlow) {
      await this.tokenCacheManager.clear(this.config.tenantId, this.config.clientId);
    }
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
  getAuthenticationFlow(): 'device-code' | 'client-credentials' {
    return this.useDeviceCodeFlow ? 'device-code' : 'client-credentials';
  }

  /**
   * Get token cache directory
   */
  getTokenCacheDir(): string {
    return this.tokenCacheManager.getCacheDir();
  }
}
