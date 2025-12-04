#!/usr/bin/env ts-node
/**
 * Diagnose Project Online Permissions
 * Detailed diagnostics for Project Online API access issues
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import { MSALAuthHandler } from '../src/lib/MSALAuthHandler';
import { Logger } from '../src/util/Logger';
import * as path from 'path';

// Load .env.test
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

const logger = new Logger();

async function diagnose() {
  console.log('\n===========================================');
  console.log('Project Online Permissions Diagnostic');
  console.log('===========================================\n');

  // Step 1: Test Azure AD Authentication
  console.log('Step 1: Testing Azure AD Authentication...');
  const authHandler = new MSALAuthHandler(
    {
      tenantId: process.env.TENANT_ID!,
      clientId: process.env.CLIENT_ID!,
      projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
    },
    logger
  );

  try {
    const authSuccess = await authHandler.testAuthentication();
    if (authSuccess) {
      console.log('✓ Azure AD authentication successful\n');
    } else {
      console.log('✗ Azure AD authentication failed\n');
      return;
    }
  } catch (error) {
    console.log('✗ Azure AD authentication failed\n');
    console.error(error);
    return;
  }

  // Step 2: Get Access Token
  console.log('Step 2: Getting access token...');
  let token: string;
  try {
    token = await authHandler.getAccessToken();
    console.log('✓ Access token obtained');
    console.log(`  Token preview: ${token.substring(0, 20)}...${token.substring(token.length - 20)}\n`);
  } catch (error) {
    console.log('✗ Failed to get access token\n');
    console.error(error);
    return;
  }

  // Step 3: Decode token to check claims
  console.log('Step 3: Analyzing token claims...');
  try {
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    console.log('  Issued for:', payload.aud || 'N/A');
    console.log('  Application ID:', payload.appid || payload.azp || 'N/A');
    console.log('  Roles/Scopes:', payload.roles || payload.scp || 'N/A');
    console.log('  Token expiry:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A');
    console.log('');

    if (!payload.roles && !payload.scp) {
      console.log('⚠️  WARNING: No roles or scopes found in token!');
      console.log('   This usually means API permissions are not granted or admin consent is missing.\n');
    }
  } catch (error) {
    console.log('  (Could not decode token)\n');
  }

  // Step 4: Test SharePoint API directly
  console.log('Step 4: Testing SharePoint site access...');
  const siteUrl = process.env.PROJECT_ONLINE_URL!.replace(/\/$/, '');
  try {
    const response = await axios.get(`${siteUrl}/_api/web`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=verbose',
      },
    });
    console.log('✓ SharePoint site accessible');
    console.log(`  Site title: ${response.data?.d?.Title || 'N/A'}\n`);
  } catch (error: any) {
    const status = error.response?.status;
    console.log(`✗ SharePoint site access failed (${status})`);
    
    if (status === 401) {
      console.log('  401 Unauthorized - This indicates a permissions issue\n');
    } else if (status === 403) {
      console.log('  403 Forbidden - Access denied\n');
    } else {
      console.log(`  ${error.message}\n`);
    }
  }

  // Step 5: Test Project Online API
  console.log('Step 5: Testing Project Online API...');
  try {
    await axios.get(`${siteUrl}/_api/ProjectData/Projects?$top=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=verbose',
      },
    });
    console.log('✓ Project Online API accessible');
    console.log(`  Projects endpoint working\n`);
  } catch (error: any) {
    const status = error.response?.status;
    console.log(`✗ Project Online API access failed (${status})`);
    
    if (status === 401) {
      console.log('  401 Unauthorized - Permissions issue\n');
    } else if (status === 403) {
      console.log('  403 Forbidden - Access denied\n');
    } else if (status === 404) {
      console.log('  404 Not Found - Project Online may not be enabled at this site\n');
    } else {
      console.log(`  ${error.message}\n`);
    }
    
    if (error.response?.data) {
      console.log('  API response:', JSON.stringify(error.response.data, null, 2));
      console.log('');
    }
  }

  // Summary and recommendations
  console.log('===========================================');
  console.log('Diagnosis Summary');
  console.log('===========================================\n');
  
  console.log('Next Steps:\n');
  console.log('1. Verify Azure AD App Permissions:');
  console.log('   • Go to: https://portal.azure.com/#allservices/category/All');
  console.log('   • Navigate to: Identity → App registrations');
  console.log('   • Find your app and click API permissions');
  console.log('   • Verify Sites.ReadWrite.All is listed');
  console.log('   • Check "Granted for [Organization]" has green checkmark');
  console.log('');
  console.log('   If NOT granted:');
  console.log('   • If you see "Grant admin consent" button: Click it');
  console.log('   • If you DON\'T see the button: Contact your IT administrator');
  console.log('     (You need Azure AD admin privileges to grant consent)');
  console.log('   • See test/INTEGRATION_TEST_SETUP_GUIDE.md for admin request template\n');
  
  console.log('2. Verify Site Access:');
  console.log('   • Can you access this URL in browser?');
  console.log(`   • ${siteUrl}`);
  console.log('   • Is Project Online properly configured at this site?\n');
  
  console.log('3. Check App Registration:');
  console.log(`   • Tenant ID: ${process.env.TENANT_ID}`);
  console.log(`   • Client ID: ${process.env.CLIENT_ID}`);
  console.log('   • Verify these match your Azure AD app\n');
}

diagnose();