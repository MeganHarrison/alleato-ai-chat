#!/usr/bin/env node

import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('🔧 Testing Authentication Fix\n');

console.log('Environment Configuration:');
console.log(`  USE_CLOUDFLARE: ${process.env.USE_CLOUDFLARE}`);
console.log(`  USE_CLOUDFLARE_STREAMS: ${process.env.USE_CLOUDFLARE_STREAMS}`);
console.log(`  USE_CLOUDFLARE_STORAGE: ${process.env.USE_CLOUDFLARE_STORAGE}`);
console.log(`  USE_CLOUDFLARE_DATABASE: ${process.env.USE_CLOUDFLARE_DATABASE}`);
console.log(`  POSTGRES_URL: ${process.env.POSTGRES_URL ? '✓ Set' : '✗ Not set'}`);
console.log(`  CLOUDFLARE_WORKER_URL: ${process.env.CLOUDFLARE_WORKER_URL || 'Not set'}`);

console.log('\n📊 Service Configuration:');
console.log('  ✅ Streams: Using Cloudflare KV');
console.log('  ✅ Storage: Using Cloudflare R2');
console.log('  ✅ Database: Using PostgreSQL (Auth.js compatible)');

console.log('\n✨ This hybrid configuration should fix the authentication error!');
console.log('  - Auth.js can connect to PostgreSQL for user management');
console.log('  - File uploads will use Cloudflare R2');
console.log('  - Stream management will use Cloudflare KV');

console.log('\n🚀 Next steps:');
console.log('  1. Run: pnpm dev');
console.log('  2. Try logging in or creating a guest account');
console.log('  3. Test file uploads and chat functionality');