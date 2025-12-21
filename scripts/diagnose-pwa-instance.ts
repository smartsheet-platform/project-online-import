#!/usr/bin/env ts-node
/**
 * Diagnose PWA Instance Configuration
 * 
 * This script helps identify if a SharePoint site has a Project Web App (PWA) instance
 * configured. The site may exist but lack the required PWA instance, causing 404 errors.
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import { MSALAuthHandler } from '../src/lib/MSALAuthHandler';
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

// Verify required environment variables
const requiredVars = ['TENANT_ID', 'CLIENT_ID', 'PROJECT_ONLINE_URL'];
const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables in .env.test:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

const logger = new Logger();

async function diagnosePWA() {
  console.log('\n===========================================');
  console.log('PWA Instance Diagnostic');
  console.log('===========================================\n');

  const siteUrl = process.env.PROJECT_ONLINE_URL!.replace(/\/$/, '');
  console.log(`Checking site: ${siteUrl}\n`);

  try {
    // Initialize auth handler (Device Code Flow)
    const authHandler = new MSALAuthHandler(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        projectOnlineUrl: siteUrl,
        useDeviceCodeFlow,
      },
      logger
    );

    console.log('Step 1: Authenticating...');
    const token = await authHandler.getAccessToken();
    console.log('✓ Authentication successful\n');

    // Test 1: Check if site exists
    console.log('Step 2: Checking if SharePoint site exists...');
    try {
      await axios.get(`${siteUrl}/_api/web`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;odata=verbose',
        },
      });
      console.log('✓ SharePoint site exists and is accessible\n');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('❌ SharePoint site does not exist or is not accessible\n');
        console.log('Action Required:');
        console.log('  • Verify the PROJECT_ONLINE_URL is correct');
        console.log('  • Ensure you have access to this site');
        console.log(`  • Try opening in browser: ${siteUrl}\n`);
        process.exit(1);
      }
      throw error;
    }

    // Test 2: Check for ProjectData endpoint (PWA OData API)
    console.log('Step 3: Checking for PWA instance (ProjectData API)...');
    try {
      const projectDataUrl = `${siteUrl}/_api/ProjectData`;
      await axios.get(projectDataUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;odata=verbose',
        },
      });
      console.log('✓ PWA instance is configured and ProjectData API is accessible\n');
      console.log('===========================================');
      console.log('✅ SUCCESS - PWA Instance Configured!');
      console.log('===========================================\n');
      console.log('Your Project Online site is properly configured.');
      console.log('You can proceed with running the connection test:\n');
      console.log('  npm run test:connection\n');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('❌ PWA instance NOT found (404 on ProjectData API)\n');
        console.log('===========================================');
        console.log('PROBLEM IDENTIFIED');
        console.log('===========================================\n');
        console.log('Your SharePoint site exists, but it does NOT have a');
        console.log('Project Web App (PWA) instance configured.\n');
        
        console.log('📋 Required Actions:\n');
        console.log('Option 1: Enable PWA on this site');
        console.log('  1. Contact your SharePoint administrator');
        console.log('  2. Request PWA instance creation at:');
        console.log(`     ${siteUrl}`);
        console.log('  3. Admin must enable PWA through:');
        console.log('     • SharePoint Admin Center > Settings > Project Online');
        console.log('     • Create a new PWA instance on this site\n');
        
        console.log('Option 2: Use a different site that already has PWA');
        console.log('  1. Ask your administrator for the correct PWA site URL');
        console.log('  2. Update PROJECT_ONLINE_URL in .env.test');
        console.log('  3. Common PWA site patterns:');
        console.log('     • https://[tenant].sharepoint.com/sites/pwa');
        console.log('     • https://[tenant].sharepoint.com/pwa');
        console.log('     • https://[tenant].sharepoint.com (root site)\n');
        
        console.log('💡 How to Find Your PWA Site:\n');
        console.log('  1. Open Project Online web app in your browser');
        console.log('  2. Check the URL in the address bar');
        console.log('  3. Use that URL as PROJECT_ONLINE_URL');
        console.log('  4. Or ask your Project Online administrator\n');
        
        console.log('🔍 Technical Details:\n');
        console.log(`  • Site URL: ${siteUrl}`);
        console.log(`  • API Endpoint: ${siteUrl}/_api/ProjectData`);
        console.log('  • Error: HTTP 404 (Not Found)');
        console.log('  • This means: No PWA OData API is available\n');
        
        process.exit(1);
      }
      throw error;
    }

    // Test 3: Try to list projects
    console.log('Step 4: Attempting to list projects...');
    try {
      const projectsUrl = `${siteUrl}/_api/ProjectData/Projects?$top=1`;
      const response = await axios.get(projectsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;odata=verbose',
        },
      });
      console.log('✓ Successfully queried Projects collection\n');
      
      if (response.data.value && response.data.value.length > 0) {
        console.log(`Found ${response.data.value.length} project(s)`);
        console.log('Sample project:', response.data.value[0].Name);
      } else {
        console.log('No projects found (empty PWA instance)');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          console.log('⚠️  Permission issue (403 Forbidden)\n');
          console.log('The PWA instance exists but you may not have permission to access it.');
          console.log('\nCheck:');
          console.log('  • You have access to Project Online');
          console.log('  • Your Azure AD app has delegated permissions');
          console.log('  • Your user account has Project Online license\n');
        } else {
          console.log(`⚠️  Unexpected error (${status}): ${error.message}\n`);
        }
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.log('\n===========================================');
    console.log('❌ ERROR - Unexpected Error');
    console.log('===========================================\n');

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      console.error(`HTTP ${status}: ${error.message}`);
      if (error.response?.data) {
        console.error('\nResponse data:', JSON.stringify(error.response.data, null, 2));
      }
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', String(error));
    }

    console.log('');
    process.exit(1);
  }
}

// Run the diagnostic
diagnosePWA();
