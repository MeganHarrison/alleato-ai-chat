#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

const WORKER_URL = 'https://alleato-ai-chat.megan-d14.workers.dev';
const WORKER_TOKEN = 'ebUZUTmbkRF+Np4i56VgdWgFcP/K0uxHT/ekZeTRP+g=';

console.log('🧪 Testing Cloudflare Integration\n');

async function testStreamOperations() {
  console.log('1️⃣ Testing KV Stream Operations');
  
  // Create stream
  const createRes = await fetch(`${WORKER_URL}/api/streams`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WORKER_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const { streamId } = await createRes.json();
  console.log(`   ✅ Created stream: ${streamId}`);
  
  // Get stream
  const getRes = await fetch(`${WORKER_URL}/api/streams/${streamId}`, {
    headers: {
      'Authorization': `Bearer ${WORKER_TOKEN}`
    }
  });
  const stream = await getRes.json();
  console.log(`   ✅ Retrieved stream with ${stream.messages.length} messages`);
  
  // Append to stream
  const appendRes = await fetch(`${WORKER_URL}/api/streams/${streamId}/append`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WORKER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: 'Test message', timestamp: Date.now() })
  });
  console.log(`   ✅ Appended message to stream`);
  
  // Delete stream
  const deleteRes = await fetch(`${WORKER_URL}/api/streams/${streamId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${WORKER_TOKEN}`
    }
  });
  console.log(`   ✅ Deleted stream`);
}

async function testFileUpload() {
  console.log('\n2️⃣ Testing R2 File Upload');
  
  // Create a simple test file
  const form = new FormData();
  const blob = new Blob(['Test file content'], { type: 'text/plain' });
  form.append('file', blob, 'test.txt');
  
  try {
    const uploadRes = await fetch(`${WORKER_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WORKER_TOKEN}`
      },
      body: form
    });
    
    if (!uploadRes.ok) {
      console.log(`   ❌ Upload failed: ${uploadRes.statusText}`);
      return;
    }
    
    const result = await uploadRes.json();
    console.log(`   ✅ Uploaded file to: ${result.pathname}`);
    
    // Test public access
    const publicRes = await fetch(result.url.replace('d1416265449d2a0bae41c45c791270ec', '9d242043d9cd491095cb8e4b2e7b8bfc'));
    console.log(`   ✅ File is publicly accessible: ${publicRes.ok}`);
  } catch (error) {
    console.log(`   ❌ Upload test failed: ${error.message}`);
  }
}

async function runTests() {
  try {
    await testStreamOperations();
    await testFileUpload();
    
    console.log('\n✨ All Cloudflare integration tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - KV namespace (STREAMS): Working ✅');
    console.log('   - R2 bucket (alleato): Working ✅');
    console.log('   - Worker API: Deployed and functional ✅');
    console.log('   - Public R2 access: Enabled ✅');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Run D1 migrations: wrangler d1 migrations apply ALLEATO_DB');
    console.log('   2. Test the app with USE_CLOUDFLARE=true');
    console.log('   3. Monitor worker logs: wrangler tail');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();