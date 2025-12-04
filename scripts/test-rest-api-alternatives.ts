/**
 * Test Alternative REST API Endpoints for Project Online Access
 * 
 * This script tests various SharePoint and Project Online REST API endpoints
 * to determine which ones support app-only authentication (Client Credentials flow).
 * 
 * Purpose: Evaluate if alternative API approaches can access Project Online data
 * when the ProjectData OData endpoint rejects app-only tokens.
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { MSALAuthHandler, AuthConfig } from '../src/lib/MSALAuthHandler';
import { Logger } from '../src/util/Logger';

// Load environment configuration
dotenv.config({ path: '.env.test' });

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'unauthorized' | 'forbidden' | 'not_found' | 'error';
  statusCode?: number;
  message: string;
  responsePreview?: string;
}

class RestApiTester {
  private authHandler: MSALAuthHandler;
  private logger: Logger;
  private siteUrl: string;
  private results: TestResult[] = [];

  constructor() {
    this.logger = new Logger();
    
    // Validate required environment variables
    const requiredVars = ['TENANT_ID', 'CLIENT_ID', 'PROJECT_ONLINE_URL'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    const config: AuthConfig = {
      tenantId: process.env.TENANT_ID!,
      clientId: process.env.CLIENT_ID!,
      projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
    };

    this.siteUrl = config.projectOnlineUrl;
    this.authHandler = new MSALAuthHandler(config, this.logger);
  }

  /**
   * Test an API endpoint
   */
  private async testEndpoint(
    endpoint: string,
    method: string = 'GET',
    description: string
  ): Promise<TestResult> {
    const fullUrl = `${this.siteUrl}${endpoint}`;
    
    console.log(`\nTesting: ${description}`);
    console.log(`  URL: ${fullUrl}`);
    console.log(`  Method: ${method}`);

    try {
      const token = await this.authHandler.getAccessToken();
      
      const response = await axios({
        method,
        url: fullUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
        },
        validateStatus: () => true, // Don't throw on any status code
      });

      const result: TestResult = {
        endpoint,
        method,
        status: this.categorizeStatus(response.status),
        statusCode: response.status,
        message: '',
        responsePreview: '',
      };

      if (response.status === 200) {
        result.status = 'success';
        result.message = '✅ SUCCESS - Endpoint accessible with app-only token';
        result.responsePreview = this.getResponsePreview(response.data);
        console.log(`  ✅ Status: ${response.status} - SUCCESS`);
      } else if (response.status === 401) {
        result.status = 'unauthorized';
        result.message = '❌ UNAUTHORIZED - App-only token rejected';
        result.responsePreview = this.getErrorMessage(response.data);
        console.log(`  ❌ Status: ${response.status} - UNAUTHORIZED`);
        console.log(`     Error: ${result.responsePreview}`);
      } else if (response.status === 403) {
        result.status = 'forbidden';
        result.message = '⚠️  FORBIDDEN - Insufficient permissions';
        result.responsePreview = this.getErrorMessage(response.data);
        console.log(`  ⚠️  Status: ${response.status} - FORBIDDEN`);
      } else if (response.status === 404) {
        result.status = 'not_found';
        result.message = '❓ NOT FOUND - Endpoint may not exist';
        console.log(`  ❓ Status: ${response.status} - NOT FOUND`);
      } else {
        result.message = `❓ Status ${response.status} - ${response.statusText}`;
        result.responsePreview = this.getErrorMessage(response.data);
        console.log(`  ❓ Status: ${response.status} - ${response.statusText}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ ERROR: ${errorMessage}`);
      
      return {
        endpoint,
        method,
        status: 'error',
        message: `❌ ERROR: ${errorMessage}`,
      };
    }
  }

  private categorizeStatus(statusCode: number): TestResult['status'] {
    if (statusCode === 200) return 'success';
    if (statusCode === 401) return 'unauthorized';
    if (statusCode === 403) return 'forbidden';
    if (statusCode === 404) return 'not_found';
    return 'error';
  }

  private getResponsePreview(data: any): string {
    if (!data) return 'No data';
    
    try {
      // For SharePoint OData responses
      if (data.d) {
        if (data.d.results && Array.isArray(data.d.results)) {
          return `Array with ${data.d.results.length} items`;
        }
        return JSON.stringify(data.d).substring(0, 200);
      }
      
      // For modern JSON responses
      if (data.value && Array.isArray(data.value)) {
        return `Array with ${data.value.length} items`;
      }
      
      return JSON.stringify(data).substring(0, 200);
    } catch {
      return 'Unable to parse response';
    }
  }

  private getErrorMessage(data: any): string {
    if (!data) return 'No error message';
    
    try {
      // SharePoint OData error format
      if (data.error) {
        if (typeof data.error === 'string') return data.error;
        if (data.error.message) {
          return typeof data.error.message === 'string' 
            ? data.error.message 
            : data.error.message.value || JSON.stringify(data.error.message);
        }
      }
      
      // Simple string error
      if (typeof data === 'string') return data;
      
      return JSON.stringify(data).substring(0, 200);
    } catch {
      return 'Unable to parse error';
    }
  }

  /**
   * Run all API endpoint tests
   */
  async runAllTests(): Promise<void> {
    console.log('===========================================');
    console.log('REST API Alternatives Test');
    console.log('===========================================');
    console.log(`\nSite URL: ${this.siteUrl}`);
    console.log('\nTesting various API endpoints with app-only authentication...\n');

    // Test 1: ProjectData OData (current approach - expected to fail)
    this.results.push(await this.testEndpoint(
      '/_api/ProjectData/Projects',
      'GET',
      'ProjectData OData - Projects'
    ));

    // Test 2: SharePoint REST API - Web properties
    this.results.push(await this.testEndpoint(
      '/_api/web',
      'GET',
      'SharePoint REST - Web Properties'
    ));

    // Test 3: SharePoint REST API - Lists
    this.results.push(await this.testEndpoint(
      '/_api/web/lists',
      'GET',
      'SharePoint REST - Lists'
    ));

    // Test 4: SharePoint REST API - Site Info
    this.results.push(await this.testEndpoint(
      '/_api/site',
      'GET',
      'SharePoint REST - Site Info'
    ));

    // Test 5: Project Server REST API - Projects (alternative endpoint)
    this.results.push(await this.testEndpoint(
      '/_api/ProjectServer/Projects',
      'GET',
      'ProjectServer REST - Projects'
    ));

    // Test 6: Lists API - Check for Project-related lists
    this.results.push(await this.testEndpoint(
      '/_api/web/lists?$filter=BaseTemplate eq 150',
      'GET',
      'SharePoint REST - Project Lists (BaseTemplate 150)'
    ));

    // Test 7: Search API - Query for projects
    this.results.push(await this.testEndpoint(
      '/_api/search/query?querytext=\'contentclass:STS_ListItem_ProjectTasks\'',
      'GET',
      'SharePoint Search - Project Tasks'
    ));

    // Test 8: Context Info (required for POST operations)
    this.results.push(await this.testEndpoint(
      '/_api/contextinfo',
      'POST',
      'SharePoint REST - Context Info (for POST operations)'
    ));

    // Print summary
    this.printSummary();
  }

  /**
   * Print test summary and recommendations
   */
  private printSummary(): void {
    console.log('\n\n===========================================');
    console.log('Test Summary');
    console.log('===========================================\n');

    const successEndpoints = this.results.filter(r => r.status === 'success');
    const unauthorizedEndpoints = this.results.filter(r => r.status === 'unauthorized');
    const forbiddenEndpoints = this.results.filter(r => r.status === 'forbidden');
    const notFoundEndpoints = this.results.filter(r => r.status === 'not_found');
    const errorEndpoints = this.results.filter(r => r.status === 'error');

    console.log(`Total Endpoints Tested: ${this.results.length}`);
    console.log(`✅ Success:       ${successEndpoints.length}`);
    console.log(`❌ Unauthorized:  ${unauthorizedEndpoints.length}`);
    console.log(`⚠️  Forbidden:     ${forbiddenEndpoints.length}`);
    console.log(`❓ Not Found:     ${notFoundEndpoints.length}`);
    console.log(`❌ Error:         ${errorEndpoints.length}`);

    if (successEndpoints.length > 0) {
      console.log('\n✅ ACCESSIBLE ENDPOINTS (App-Only Token Works):');
      console.log('===========================================');
      successEndpoints.forEach(result => {
        console.log(`\n  ${result.endpoint}`);
        console.log(`  ${result.message}`);
        if (result.responsePreview) {
          console.log(`  Preview: ${result.responsePreview}`);
        }
      });
      
      console.log('\n\n🎉 RECOMMENDATION:');
      console.log('===========================================');
      console.log('One or more alternative endpoints support app-only authentication!');
      console.log('Consider modifying the ProjectOnlineClient to use these endpoints instead.');
    } else {
      console.log('\n\n❌ RESULT:');
      console.log('===========================================');
      console.log('No tested endpoints support app-only authentication.');
      console.log('\nPossible reasons:');
      console.log('  1. Project Online API requires user context (delegated permissions)');
      console.log('  2. Additional permissions may be needed in Azure AD');
      console.log('  3. SharePoint tenant may have app-only access disabled');
      console.log('\nNext Steps:');
      console.log('  1. Contact your SharePoint/Azure AD administrator');
      console.log('  2. Verify app-only access is enabled for your tenant');
      console.log('  3. Consider implementing user authentication flow instead');
    }

    if (unauthorizedEndpoints.length > 0) {
      console.log('\n\n❌ UNAUTHORIZED ENDPOINTS (App-Only Token Rejected):');
      console.log('===========================================');
      unauthorizedEndpoints.forEach(result => {
        console.log(`\n  ${result.endpoint}`);
        if (result.responsePreview) {
          console.log(`  Error: ${result.responsePreview}`);
        }
      });
    }
  }
}

// Main execution
async function main() {
  try {
    const tester = new RestApiTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
