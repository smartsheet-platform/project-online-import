#!/usr/bin/env ts-node
/**
 * Test raw HTTP request with OAuth token
 * Bypasses the client to test token directly
 */

import * as dotenv from 'dotenv';
import { MSALAuthHandler } from '../src/lib/MSALAuthHandler';
import { Logger } from '../src/util/Logger';
import * as path from 'path';
import axios from 'axios';

// Load .env.test configuration
const envPath = path.join(__dirname, '..', '.env.test');
dotenv.config({ path: envPath });

async function testRawRequest() {
  const logger = new Logger();

  console.log('\n===========================================');
  console.log('Raw HTTP Request Test');
  console.log('===========================================\n');

  try {
    const authHandler = new MSALAuthHandler(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
      },
      logger
    );

    console.log('Step 1: Getting access token...');
    const token = await authHandler.getAccessToken();
    console.log('✓ Token acquired\n');

    const projectOnlineUrl = process.env.PROJECT_ONLINE_URL!.replace(/\/$/, '');
    const testUrl = `${projectOnlineUrl}/_api/ProjectData/Projects?$top=1`;

    console.log('Step 2: Making raw HTTP request...');
    console.log(`URL: ${testUrl}\n`);

    console.log('Request Headers:');
    console.log('  Authorization: Bearer [token]');
    console.log('  Accept: application/json;odata=verbose');
    console.log('  Content-Type: application/json;odata=verbose\n');

    const response = await axios.get(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      },
      timeout: 30000,
    });

    console.log('✓ Request successful!\n');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\nResponse Data (first 500 chars):');
    const dataStr = JSON.stringify(response.data, null, 2);
    console.log(dataStr.substring(0, 500));
    if (dataStr.length > 500) {
      console.log('...(truncated)');
    }

    console.log('\n===========================================');
    console.log('✅ SUCCESS - OAuth token works!');
    console.log('===========================================\n');

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('\n===========================================');
      console.log('❌ HTTP Request Failed');
      console.log('===========================================\n');
      
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('\nResponse Headers:', JSON.stringify(error.response?.headers, null, 2));
      console.log('\nResponse Data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 403) {
        console.log('\n-------------------------------------------');
        console.log('403 Forbidden Analysis:');
        console.log('-------------------------------------------');
        console.log('The token is valid but access is being denied.');
        console.log('This could mean:');
        console.log('  1. OAuth token auth requires additional setup');
        console.log('  2. SharePoint tenant has OAuth disabled');
        console.log('  3. Site-specific permission issue');
        console.log('  4. Token audience mismatch');
        console.log('\nNote: You CAN access the data via browser (cookie auth)');
        console.log('but OAuth token auth is being rejected.');
      }
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

testRawRequest();
