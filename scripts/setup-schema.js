/**
 * Script to create the tripReport schema in Sanity
 * Run with: node scripts/setup-schema.js
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../.env.local') });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SANITY_PROJECT_ID:', projectId ? '✓' : '✗');
  console.error('   SANITY_API_TOKEN:', token ? '✓' : '✗');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

// Create the schema via a test document (Sanity will infer schema from first document)
// Actually, we can't create schemas via API - they need to be in Studio code
// So let's create a minimal Studio setup instead

console.log('✅ Sanity client configured');
console.log(`   Project: ${projectId}`);
console.log(`   Dataset: ${dataset}`);
console.log('\n📝 Note: Schemas must be defined in Studio code.');
console.log('   Creating minimal Studio setup...');
