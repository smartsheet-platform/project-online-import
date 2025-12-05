/**
 * Jest setup file - loads test environment variables
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test file
const envPath = resolve(__dirname, '..', '.env.test');
const result = config({ path: envPath });

if (result.error) {
  console.warn('Warning: .env.test file not found. Integration tests may fail.');
  console.warn('Create .env.test from .env.test.example and add your SMARTSHEET_API_TOKEN');
} else {
  console.log('Loaded test environment from .env.test');
}
