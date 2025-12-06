/**
 * MSAL Authentication Handler for Project Online
 * Handles OAuth token acquisition and refresh using Azure AD
 */

import * as msal from '@azure/msal-node';
import { Logger } from '../../util/Logger';
import { ErrorHandler } from '../../util/ErrorHandler';

export interface AuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  projectOnlineUrl: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresOn: Date;
}

export class MSALAuthHandler {
  private confidentialClientApp: msal.ConfidentialClientApplication;
  private cachedToken?: TokenResponse;
  private logger: Logger;
  private config: AuthConfig;

  constructor(config: AuthConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? new Logger();

    // Validate configuration
    this.validateConfig();

    // Initialize MSAL confidential client
    const msalConfig: msal.Configuration = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret,
      },
    };

    this.confidentialClientApp = new msal.ConfidentialClientApplication(msalConfig);
    this.logger.debug('MSAL authentication handler initialized');
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

    if (!this.config.clientSecret) {
      throw ErrorHandler.configError('CLIENT_SECRET', 'Azure AD client secret is required');
    }

    if (!this.config.projectOnlineUrl) {
      throw ErrorHandler.configError(
        'PROJECT_ONLINE_URL',
        'Project Online site URL is required'
      );
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
    // Check if we have a valid cached token
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      this.logger.debug('Using cached access token');
      return this.cachedToken.accessToken;
    }

    // Acquire new token
    this.logger.debug('Acquiring new access token from Azure AD');
    const tokenResponse = await this.acquireToken();
    return tokenResponse.accessToken;
  }

  /**
   * Acquire new access token from Azure AD
   */
  private async acquireToken(): Promise<TokenResponse> {
    try {
      // Extract SharePoint domain from Project Online URL
      const url = new URL(this.config.projectOnlineUrl);
      const sharePointDomain = `${url.protocol}//${url.hostname}`;

      // Request token with SharePoint scope
      const tokenRequest: msal.ClientCredentialRequest = {
        scopes: [`${sharePointDomain}/.default`],
      };

      const response = await this.confidentialClientApp.acquireTokenByClientCredential(
        tokenRequest
      );

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

      this.logger.debug(`Access token acquired, expires: ${this.cachedToken.expiresOn.toISOString()}`);
      return this.cachedToken;
    } catch (error) {
      if (error instanceof msal.AuthError) {
        throw ErrorHandler.authError(
          `MSAL authentication error: ${error.errorCode}`,
          `Message: ${error.errorMessage}\n\n` +
            'Common causes:\n' +
            '  • Invalid tenant ID, client ID, or client secret\n' +
            '  • Azure AD app not properly configured\n' +
            '  • Missing API permissions (Sites.ReadWrite.All)\n' +
            '  • Admin consent not granted'
        );
      }
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
  clearCache(): void {
    this.cachedToken = undefined;
    this.logger.debug('Token cache cleared');
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
      this.logger.error(`✗ Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}