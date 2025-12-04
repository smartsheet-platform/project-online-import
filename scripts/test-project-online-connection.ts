#!/usr/bin/env ts-node
/**
 * Test Project Online API Connection
 * Verifies that Azure AD credentials and Project Online URL are configured correctly
 * Uses Device Code Flow authentication (interactive browser authentication)
 */

import * as dotenv from 'dotenv';
import { ProjectOnlineClient } from '../src/lib/ProjectOnlineClient';
import { Logger } from '../src/util/Logger';
import * as path from 'path';

// Load .env.test configuration
const envPath = path.join(__dirname, '..', '.env.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env.test file');
  console.error(`   Path: ${envPath}`);
  console.error(`   Error: ${result.error.message}`);
  process.exit(1);
}

// Verify required environment variables for Device Code Flow
const requiredVars = ['TENANT_ID', 'CLIENT_ID', 'PROJECT_ONLINE_URL'];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables in .env.test:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease update .env.test with your Azure AD credentials.');
  console.error('See sdlc/docs/project/Authentication-Setup.md for instructions.');
  process.exit(1);
}

// Display configuration
console.log('\n===========================================');
console.log('Project Online Connection Test');
console.log('===========================================\n');

console.log('Configuration loaded from: .env.test');
console.log('');
console.log('Azure AD Configuration:');
console.log(`  Tenant ID:     ${process.env.TENANT_ID}`);
console.log(`  Client ID:     ${process.env.CLIENT_ID}`);
console.log('');
console.log('Project Online:');
console.log(`  Site URL:      ${process.env.PROJECT_ONLINE_URL}`);
console.log('');
console.log('Authentication:');
console.log(`  Method:        Device Code Flow (interactive)`);
console.log(`  Note:          You'll authenticate in your browser if no cached token exists`);
console.log(`  Token Cache:   ~/.project-online-tokens/`);
console.log('');

// Create client and test connection
async function testConnection() {
  const logger = new Logger();

  try {
    console.log('Step 1: Initializing Project Online client...');
    const client = new ProjectOnlineClient(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
      },
      logger
    );
    console.log('✓ Client initialized\n');

    console.log('Step 2: Authenticating with Device Code Flow...');
    console.log('(You will be prompted to open a browser and enter a code if no token is cached)\n');

    const success = await client.testConnection();

    if (success) {
      console.log('\n===========================================');
      console.log('✅ SUCCESS - Connection Test Passed!');
      console.log('===========================================\n');
      console.log('Your Project Online configuration is working correctly.');

      console.log('\nAuthentication token has been cached for future use.');
      console.log('Subsequent commands will not require re-authentication.');

      console.log('\nYou can now run integration tests with:');
      console.log('  npm run test:integration');
      console.log('');
      process.exit(0);
    } else {
      console.log('\n===========================================');
      console.log('❌ FAILED - Connection Test Failed');
      console.log('===========================================\n');

      console.log('Please check the error messages above and verify:');
      console.log('  1. Your Azure AD app registration exists');
      console.log('  2. Client ID and Tenant ID are correct');
      console.log('  3. Public client flows enabled (Authentication → Allow public client flows = Yes)');
      console.log('  4. Delegated permissions granted (AllSites.Read, AllSites.Write)');
      console.log('  5. You completed browser authentication when prompted');
      console.log('  6. Project Online URL is accessible');
      console.log('  7. Your user account has access to the Project Online site');

      console.log('');
      console.log('See sdlc/docs/project/Authentication-Setup.md for detailed setup instructions.');
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    console.log('\n===========================================');
    console.log('❌ ERROR - Unexpected Error');
    console.log('===========================================\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', String(error));
    }

    console.log('\n===========================================');
    console.log('Troubleshooting Tips:');
    console.log('===========================================\n');

    // Provide specific troubleshooting based on error type
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('auth') || errorMessage.includes('401')) {
      console.log('Authentication Error (401):');
      console.log('  • Verify TENANT_ID and CLIENT_ID are correct');
      console.log('  • Ensure Azure AD app is configured for public client flows');
      console.log('  • Check delegated permissions (AllSites.Read, AllSites.Write) are added');
      console.log('  • Make sure you completed authentication in the browser');
      console.log('  • Try clearing cached tokens: npm run cli auth:clear');
    } else if (errorMessage.includes('authorization_declined')) {
      console.log('Authentication Declined:');
      console.log('  • You declined the authentication request in your browser');
      console.log('  • Run the test again and approve the authentication request');
    } else if (errorMessage.includes('expired_token') || errorMessage.includes('device code')) {
      console.log('Device Code Expired:');
      console.log('  • The device code expired (15 minute timeout)');
      console.log('  • Run the test again and complete authentication within 15 minutes');
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      console.log('Permission Error (403):');
      console.log('  • Your Azure AD app needs delegated permissions');
      console.log('  • Add: AllSites.Read and AllSites.Write (delegated)');
      console.log('  • Your user account must have access to the Project Online site');
      console.log('  • Verify you can access the site in your browser');
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      console.log('Site Not Found Error (404):');
      console.log('  • Verify PROJECT_ONLINE_URL is correct');
      console.log('  • Ensure the site exists and is accessible');
      console.log('  • Current URL: ' + process.env.PROJECT_ONLINE_URL);
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      console.log('Network/Timeout Error:');
      console.log('  • Check your internet connection');
      console.log('  • Verify firewall/proxy settings');
      console.log('  • The Project Online service may be temporarily unavailable');
    } else {
      console.log('General troubleshooting:');
      console.log('  • Review the error message above');
      console.log('  • Check sdlc/docs/project/Authentication-Setup.md');
      console.log('  • Verify all Azure AD configuration steps were completed');
      console.log('  • Verify your user account has Project Online access');
      console.log('  • Clear cached tokens if needed: npm run cli auth:clear');
    }

    console.log('');
    process.exit(1);
  }
}

// Run the test
testConnection();
