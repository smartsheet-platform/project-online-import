/**
 * Device Code Display Utility
 * 
 * Handles formatting and displaying device code authentication messages to users.
 * Provides clear, prominent instructions for the OAuth 2.0 Device Code Flow.
 */

import { Logger } from './Logger';

export class DeviceCodeDisplay {
  private static logger = new Logger();

  /**
   * Display device code authentication instructions to user
   */
  static displayDeviceCode(userCode: string, verificationUrl: string): void {
    console.log('\n' + '='.repeat(60));
    console.log('Authentication Required');
    console.log('='.repeat(60));
    console.log('\nTo access Project Online, please authenticate with your Microsoft account.');
    console.log('\n' + '─'.repeat(60));
    console.log('\n1. Open your browser and go to:');
    console.log(`   ${this.colorize(verificationUrl, 'cyan')}`);
    console.log('\n2. Enter this code:');
    console.log(`   ${this.colorize(userCode, 'yellow', true)}`);
    console.log('\n3. Sign in with your Microsoft credentials');
    console.log('\n' + '─'.repeat(60));
    console.log('\nWaiting for authentication... (this may take up to 5 minutes)');
    console.log('');
  }

  /**
   * Show polling status while waiting for user authentication
   */
  static showPollingStatus(attempt: number, _maxAttempts: number): void {
    if (attempt % 6 === 0) { // Update every ~30 seconds (6 attempts * 5s interval)
      const elapsed = Math.floor((attempt * 5) / 60);
      const minutes = elapsed > 0 ? `${elapsed} minute${elapsed > 1 ? 's' : ''}` : 'a few seconds';
      process.stdout.write(`\rStill waiting... (${minutes} elapsed)                    `);
    }
  }

  /**
   * Show successful authentication message
   */
  static showSuccess(): void {
    console.log('\n');
    this.logger.success('✓ Authentication successful!');
    this.logger.success('✓ Token cached for future use');
    console.log('');
  }

  /**
   * Show authentication error with actionable message
   */
  static showError(errorCode: string, errorMessage?: string): void {
    console.log('\n');
    this.logger.error('✗ Authentication failed');
    
    switch (errorCode) {
      case 'authorization_declined':
        console.log('\nYou declined the authentication request.');
        console.log('Please run the command again and approve the request to continue.');
        break;
        
      case 'expired_token':
        console.log('\nThe authentication code expired (15 minute timeout).');
        console.log('Please run the command again to get a new code.');
        break;
        
      case 'authorization_pending':
        console.log('\nAuthentication timed out - you did not complete authentication in time.');
        console.log('Please run the command again and complete authentication within 5 minutes.');
        break;
        
      case 'bad_verification_code':
        console.log('\nInvalid verification code entered.');
        console.log('Please run the command again and enter the code exactly as shown.');
        break;
        
      default:
        console.log(`\nError: ${errorMessage || errorCode}`);
        console.log('Please try again or contact your administrator if the problem persists.');
    }
    
    console.log('');
  }

  /**
   * Show token refresh message
   */
  static showTokenRefresh(): void {
    this.logger.info('Refreshing authentication token...');
  }

  /**
   * Show using cached token message
   */
  static showUsingCachedToken(): void {
    this.logger.success('✓ Using cached authentication token');
  }

  /**
   * Show cached token expired message
   */
  static showCachedTokenExpired(): void {
    this.logger.warn('⚠ Cached token expired, re-authenticating...');
  }

  /**
   * Display authentication help text
   */
  static displayHelp(): void {
    console.log('\n' + '='.repeat(60));
    console.log('Project Online Authentication Help');
    console.log('='.repeat(60));
    console.log('\nThe Project Online migration tool requires authentication to access');
    console.log('your Project Online data. This is a one-time process per session.');
    console.log('\nAuthentication Flow:');
    console.log('  1. The tool generates a unique device code');
    console.log('  2. You open a browser and enter the code at microsoft.com/devicelogin');
    console.log('  3. You sign in with your Microsoft credentials');
    console.log('  4. Your authentication token is cached securely');
    console.log('  5. Subsequent commands use the cached token (no re-authentication)');
    console.log('\nToken Lifetime:');
    console.log('  • Access tokens are valid for 1 hour');
    console.log('  • Tokens are automatically refreshed when expired');
    console.log('  • You typically only need to authenticate once per day');
    console.log('\nPrivacy & Security:');
    console.log('  • Tokens are stored in your home directory with restrictive permissions');
    console.log('  • Only your user account can access the cached tokens');
    console.log('  • Tokens are never logged or transmitted outside of Azure AD');
    console.log('\nTroubleshooting:');
    console.log('  • If authentication fails, try: npm run cli auth:clear');
    console.log('  • Then run your command again for a fresh authentication');
    console.log('  • Contact your IT administrator if you cannot authenticate');
    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Display manual authentication command instructions
   */
  static displayManualAuthInstructions(): void {
    console.log('\n' + '='.repeat(60));
    console.log('Manual Authentication');
    console.log('='.repeat(60));
    console.log('\nThis will authenticate with Project Online and cache the token');
    console.log('for future use. After authentication, you can run migration commands');
    console.log('without re-authenticating.\n');
  }

  /**
   * Display auth:clear confirmation
   */
  static displayClearConfirmation(cacheDir: string, filesDeleted: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('Clear Cached Tokens');
    console.log('='.repeat(60));
    console.log(`\n✓ Cleared ${filesDeleted} cached token${filesDeleted !== 1 ? 's' : ''}`);
    console.log(`✓ Cache directory: ${cacheDir}`);
    console.log('\nYou will be prompted to authenticate on your next command.\n');
  }

  /**
   * Colorize text for terminal output (optional, basic implementation)
   */
  private static colorize(text: string, color: 'cyan' | 'yellow' | 'green' | 'red', bold: boolean = false): string {
    const colors = {
      cyan: '\x1b[36m',
      yellow: '\x1b[33m',
      green: '\x1b[32m',
      red: '\x1b[31m',
    };
    
    const reset = '\x1b[0m';
    const boldCode = bold ? '\x1b[1m' : '';
    
    return `${boldCode}${colors[color]}${text}${reset}`;
  }
}
