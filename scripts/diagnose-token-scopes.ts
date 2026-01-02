#!/usr/bin/env ts-node
/**
 * Diagnose OAuth Token Scopes
 * Decodes the access token to inspect granted scopes
 */

import * as dotenv from 'dotenv';
import { MSALAuthHandler } from '../src/lib/MSALAuthHandler';
import { Logger } from '../src/util/Logger';
import * as path from 'path';

// Load .env.test configuration
const envPath = path.join(__dirname, '..', '.env.test');
dotenv.config({ path: envPath });

interface TokenPayload {
  aud?: string;
  iss?: string;
  scp?: string;
  roles?: string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [key: string]: unknown;
}

function decodeJWT(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = parts[1];
  const decoded = Buffer.from(payload, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

async function diagnoseToken() {
  const logger = new Logger();

  console.log('\n===========================================');
  console.log('OAuth Token Scope Diagnostic');
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

    console.log('Acquiring access token...\n');
    const token = await authHandler.getAccessToken();

    console.log('✓ Token acquired successfully\n');
    console.log('Decoding token...\n');

    const payload = decodeJWT(token);

    console.log('Token Details:');
    console.log('─────────────────────────────────────────');
    console.log(`Audience (aud):   ${payload.aud}`);
    console.log(`Issuer (iss):     ${payload.iss}`);
    
    if (payload.scp) {
      console.log(`Scopes (scp):     ${payload.scp}`);
    } else {
      console.log('Scopes (scp):     NOT PRESENT');
    }

    if (payload.roles && payload.roles.length > 0) {
      console.log(`Roles:            ${payload.roles.join(', ')}`);
    }

    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      console.log(`Expires:          ${expDate.toISOString()}`);
    }

    console.log('─────────────────────────────────────────\n');

    // Analyze the token
    console.log('Analysis:');
    console.log('─────────────────────────────────────────');

    const expectedAudience = process.env.PROJECT_ONLINE_URL!
      .replace(/\/$/, '')
      .replace(/\/sites\/.*$/, '');
    
    if (payload.aud !== expectedAudience && !payload.aud?.includes('sharepoint.com')) {
      console.log('⚠️  WARNING: Audience (aud) does not match SharePoint domain');
      console.log(`   Expected: ${expectedAudience}`);
      console.log(`   Got:      ${payload.aud}`);
    } else {
      console.log('✓ Audience matches SharePoint domain');
    }

    if (payload.scp) {
      const scopes = payload.scp.toLowerCase();
      if (scopes.includes('allsites.read') || scopes.includes('sites.read')) {
        console.log('✓ Read permission scope found');
      } else {
        console.log('⚠️  WARNING: No read permission scope found');
      }

      if (scopes.includes('allsites.write') || scopes.includes('sites.write')) {
        console.log('✓ Write permission scope found');
      } else {
        console.log('⚠️  WARNING: No write permission scope found');
      }
    } else {
      console.log('❌ ERROR: No scopes (scp) claim in token');
      console.log('   This means the token has no delegated permissions');
    }

    console.log('─────────────────────────────────────────\n');

    // Recommendation
    if (!payload.scp || !payload.scp.toLowerCase().includes('allsites.read')) {
      console.log('RECOMMENDATION:');
      console.log('─────────────────────────────────────────');
      console.log('The token does not contain the required SharePoint scopes.');
      console.log('This could be due to:');
      console.log('  1. Incorrect scope format in the authentication request');
      console.log('  2. User has not consented to the requested permissions');
      console.log('  3. Permissions not properly granted in Azure AD');
      console.log('');
      console.log('Try the following:');
      console.log('  1. Clear token cache: rm -rf ~/.project-online-tokens/');
      console.log('  2. Re-authenticate and carefully review the consent screen');
      console.log('  3. Ensure you approve all requested permissions');
      console.log('─────────────────────────────────────────\n');
    }

    console.log('Full Token Payload (for debugging):');
    console.log('─────────────────────────────────────────');
    console.log(JSON.stringify(payload, null, 2));
    console.log('─────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

diagnoseToken();
