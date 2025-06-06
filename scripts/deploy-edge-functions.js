#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase 프로젝트 정보
const SUPABASE_PROJECT_ID = 'lgebgddeerpxdjvtqvoi';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ';

// Edge Functions 코드 읽기
const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');

const functions = [
  {
    name: 'market-data',
    path: path.join(functionsDir, 'market-data', 'index.ts')
  },
  {
    name: 'trading-signals',
    path: path.join(functionsDir, 'trading-signals', 'index.ts')
  },
  {
    name: 'portfolio-management',
    path: path.join(functionsDir, 'portfolio-management', 'index.ts')
  }
];

// Supabase Management API를 통한 Edge Function 배포
async function deployFunction(functionName, functionCode) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: functionName,
      slug: functionName,
      body: functionCode,
      verify_jwt: true,
      import_map: true
    });

    const options = {
      hostname: `${SUPABASE_PROJECT_ID}.supabase.co`,
      port: 443,
      path: '/functions/v1/deploy',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Successfully deployed ${functionName}`);
          resolve(JSON.parse(responseData));
        } else {
          console.error(`❌ Failed to deploy ${functionName}: ${res.statusCode}`);
          console.error(responseData);
          reject(new Error(`Deployment failed: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error deploying ${functionName}:`, error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Secrets 설정
async function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: name,
      value: value
    });

    const options = {
      hostname: `${SUPABASE_PROJECT_ID}.supabase.co`,
      port: 443,
      path: '/functions/v1/secrets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Successfully set secret ${name}`);
          resolve();
        } else {
          console.error(`❌ Failed to set secret ${name}: ${res.statusCode}`);
          reject(new Error(`Secret setting failed: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error setting secret ${name}:`, error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// 메인 배포 함수
async function main() {
  console.log('🚀 Starting Edge Functions deployment...\n');

  try {
    // 1. Secrets 설정
    console.log('📝 Setting up secrets...');
    await setSecret('FINNHUB_API_KEY', 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg');
    console.log('✅ Secrets configured\n');

    // 2. Edge Functions 배포
    console.log('📦 Deploying Edge Functions...');
    
    for (const func of functions) {
      console.log(`\n📌 Deploying ${func.name}...`);
      
      // 함수 코드 읽기
      const functionCode = fs.readFileSync(func.path, 'utf8');
      
      // 배포
      await deployFunction(func.name, functionCode);
    }

    console.log('\n✅ All Edge Functions deployed successfully!');
    console.log('\n📌 Edge Functions URLs:');
    console.log(`- https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/market-data`);
    console.log(`- https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trading-signals`);
    console.log(`- https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/portfolio-management`);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// 직접 API 호출을 통한 배포 대신 curl 명령어 생성
async function generateDeploymentCommands() {
  console.log('📝 Generating deployment commands...\n');

  // Secrets 설정 명령어
  console.log('# Set secrets:');
  console.log(`curl -X POST https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/secrets \\
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "FINNHUB_API_KEY", "value": "d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg"}'`);

  console.log('\n# Deploy functions:');
  
  for (const func of functions) {
    const functionCode = fs.readFileSync(func.path, 'utf8');
    const escapedCode = functionCode.replace(/'/g, "'\"'\"'");
    
    console.log(`\n# Deploy ${func.name}:`);
    console.log(`curl -X POST https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${func.name} \\
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d @- <<'EOF'
{
  "verify_jwt": true,
  "import_map": true,
  "body": ${JSON.stringify(functionCode)}
}
EOF`);
  }
}

// Supabase CLI를 사용한 배포 (권장)
async function deployWithSupabaseCLI() {
  console.log('🚀 Deploying Edge Functions with Supabase CLI...\n');

  const { execSync } = require('child_process');

  try {
    // 프로젝트 링크
    console.log('📌 Linking to Supabase project...');
    execSync(`supabase link --project-ref ${SUPABASE_PROJECT_ID}`, { stdio: 'inherit' });

    // Secrets 설정
    console.log('\n📝 Setting secrets...');
    execSync(`supabase secrets set FINNHUB_API_KEY=d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg`, { stdio: 'inherit' });

    // Functions 배포
    console.log('\n📦 Deploying functions...');
    for (const func of functions) {
      console.log(`\nDeploying ${func.name}...`);
      execSync(`supabase functions deploy ${func.name}`, { stdio: 'inherit' });
    }

    console.log('\n✅ All functions deployed successfully!');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// 실행 옵션 선택
if (process.argv.includes('--cli')) {
  deployWithSupabaseCLI();
} else if (process.argv.includes('--commands')) {
  generateDeploymentCommands();
} else {
  console.log('Usage:');
  console.log('  node deploy-edge-functions.js --cli      # Deploy using Supabase CLI (recommended)');
  console.log('  node deploy-edge-functions.js --commands # Generate curl commands');
  console.log('\nNote: Make sure you have Supabase CLI installed for --cli option');
}