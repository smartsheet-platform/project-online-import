#!/usr/bin/env ts-node
/**
 * Test Project Online API Connection
 * Verifies that Azure AD credentials and Project Online URL are configured correctly
 * Supports both Client Credentials and Device Code authentication flows
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

// Verify required environment variables (CLIENT_SECRET is optional for Device Code Flow)
const requiredVars = [
  'TENANT_ID',
  'CLIENT_ID',
  'PROJECT_ONLINE_URL',
];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables in .env.test:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease update .env.test with your Azure AD credentials.');
  console.error('See test/INTEGRATION_TEST_SETUP_GUIDE.md for instructions.');
  process.exit(1);
}

// Determine authentication flow
const useDeviceCodeFlow = process.env.USE_DEVICE_CODE_FLOW === 'true' || !process.env.CLIENT_SECRET;
const authFlow = useDeviceCodeFlow ? 'Device Code Flow' : 'Client Credentials Flow';

// Display configuration (with masked secrets)
console.log('\n===========================================');
console.log('Project Online Connection Test');
console.log('===========================================\n');

console.log('Configuration loaded from: .env.test');
console.log('');
console.log('Azure AD Configuration:');
console.log(`  Tenant ID:     ${process.env.TENANT_ID}`);
console.log(`  Client ID:     ${process.env.CLIENT_ID}`);
if (process.env.CLIENT_SECRET) {
  console.log(`  Client Secret: ${maskSecret(process.env.CLIENT_SECRET)}`);
}
console.log('');
console.log('Project Online:');
console.log(`  Site URL:      ${process.env.PROJECT_ONLINE_URL}`);
console.log('');
console.log('Authentication:');
console.log(`  Method:        ${authFlow}`);
if (useDeviceCodeFlow) {
  console.log(`  Note:          You may be prompted to authenticate in your browser`);
}
console.log('');

// Function to mask secrets
function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
}

// Create client and test connection
async function testConnection() {
  const logger = new Logger();

  try {
    console.log('Step 1: Initializing Project Online client...');
    const client = new ProjectOnlineClient(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        clientSecret: process.env.CLIENT_SECRET,
        projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
        useDeviceCodeFlow: useDeviceCodeFlow,
      },
      logger
    );
    console.log('✓ Client initialized\n');

    if (useDeviceCodeFlow) {
      console.log('Step 2: Authenticating with Device Code Flow...');
      console.log('(You will be prompted to open a browser and enter a code)\n');
    } else {
      console.log('Step 2: Testing authentication with Azure AD...');
    }
    
    const success = await client.testConnection();

    if (success) {
      console.log('\n===========================================');
      console.log('✅ SUCCESS - Connection Test Passed!');
      console.log('===========================================\n');
      console.log('Your Project Online configuration is working correctly.');
      
      if (useDeviceCodeFlow) {
        console.log('\nAuthentication token has been cached for future use.');
        console.log('Subsequent commands will not require re-authentication.');
      }
      
      console.log('\nYou can now run integration tests with:');
      console.log('  npm run test:integration');
      console.log('');
      process.exit(0);
    } else {
      console.log('\n===========================================');
      console.log('❌ FAILED - Connection Test Failed');
      console.log('===========================================\n');
      
      if (useDeviceCodeFlow) {
        console.log('Please check the error messages above and verify:');
        console.log('  1. Your Azure AD app registration exists');
        console.log('  2. Client ID and Tenant ID are correct');
        console.log('  3. App is configured for public client flows (Allow public client flows = Yes)');
        console.log('  4. Delegated permissions are granted (AllSites.Read, AllSites.Write)');
        console.log('  5. You completed authentication in the browser');
        console.log('  6. Project Online URL is accessible');
      } else {
        console.log('Please check the error messages above and verify:');
        console.log('  1. Your Azure AD app registration exists');
        console.log('  2. Client ID, Client Secret, and Tenant ID are correct');
        console.log('  3. API permissions (Sites.ReadWrite.All) are granted');
        console.log('  4. Admin consent has been provided');
        console.log('  5. Project Online URL is accessible');
        console.log('  6. Tenant allows app-only authentication');
        console.log('');
        console.log('Note: If app-only authentication is disabled on your tenant,');
        console.log('      try Device Code Flow by removing CLIENT_SECRET from .env.test');
      }
      
      console.log('');
      console.log('See test/INTEGRATION_TEST_SETUP_GUIDE.md for detailed setup instructions.');
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

    if (errorMessage.includes('unsupported app only token')) {
      console.log('App-Only Authentication Disabled:');
      console.log('  • Your SharePoint tenant has app-only authentication disabled');
      console.log('  • Solution: Use Device Code Flow instead');
      console.log('  • Action: Remove CLIENT_SECRET from .env.test or set USE_DEVICE_CODE_FLOW=true');
      console.log('  • Device Code Flow uses user authentication (delegated permissions)');
    } else if (errorMessage.includes('auth') || errorMessage.includes('401')) {
      console.log('Authentication Error (401):');
      if (useDeviceCodeFlow) {
        console.log('  • Verify TENANT_ID and CLIENT_ID are correct');
        console.log('  • Ensure Azure AD app is configured for public client flows');
        console.log('  • Check delegated permissions (AllSites.Read, AllSites.Write) are added');
        console.log('  • Make sure you completed authentication in the browser');
      } else {
        console.log('  • Verify TENANT_ID, CLIENT_ID, and CLIENT_SECRET are correct');
        console.log('  • Check client secret has not expired');
        console.log('  • Ensure you copied the secret VALUE, not the Secret ID');
        console.log('  • Consider using Device Code Flow if app-only auth is disabled');
      }
    } else if (errorMessage.includes('authorization_declined')) {
      console.log('Authentication Declined:');
      console.log('  • You declined the authentication request in your browser');
      console.log('  • Run the test again and approve the authentication request');
    } else if (errorMessage.includes('expired_token')) {
      console.log('Device Code Expired:');
      console.log('  • The device code expired (15 minute timeout)');
      console.log('  • Run the test again and complete authentication within 15 minutes');
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      console.log('Permission Error (403):');
      if (useDeviceCodeFlow) {
        console.log('  • Your Azure AD app needs delegated permissions');
        console.log('  • Add: AllSites.Read and AllSites.Write (delegated)');
        console.log('  • User must have access to the Project Online site');
      } else {
        console.log('  • Your Azure AD app needs Sites.ReadWrite.All permission');
        console.log('  • Admin consent must be granted for the permission');
        console.log('  • Check the app has access to the Project Online site');
      }
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
      console.log('  • Check test/INTEGRATION_TEST_SETUP_GUIDE.md');
      console.log('  • Verify all Azure AD configuration steps were completed');
      
      if (!useDeviceCodeFlow) {
        console.log('  • Try Device Code Flow: Remove CLIENT_SECRET from .env.test');
      }
    }

    console.log('');
    process.exit(1);
  }
}

// Run the test
testConnection();
