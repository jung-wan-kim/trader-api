#!/usr/bin/env node

async function testEdgeFunctions() {
  console.log('🧪 Edge Functions 간단 테스트\n');

  const baseUrl = 'https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';

  // 1. Market Data 테스트 (인증 없이)
  console.log('1️⃣ Market Data 테스트 (공개 데이터)');
  console.log('-----------------------------------');
  
  try {
    const response = await fetch(`${baseUrl}/market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,  // Supabase는 apikey 헤더도 체크합니다
      },
      body: JSON.stringify({
        action: 'quote',
        symbol: 'AAPL'
      })
    });

    const data = await response.json();
    console.log('상태 코드:', response.status);
    console.log('응답:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  console.log('\n');

  // 2. 서비스 키로 테스트
  console.log('2️⃣ Service Role Key로 Market Data 테스트');
  console.log('----------------------------------------');
  
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ';
  
  try {
    const response = await fetch(`${baseUrl}/market-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'quote',
        symbol: 'AAPL'
      })
    });

    const data = await response.json();
    console.log('상태 코드:', response.status);
    console.log('응답:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  console.log('\n🎯 테스트 결과 분석:');
  console.log('- 401 에러: 인증이 필요함 (정상 동작)');
  console.log('- 500 에러: 함수 내부 오류');
  console.log('- 200 성공: 데이터 반환');
  console.log('\n💡 해결 방법:');
  console.log('1. SQL Editor에서 데이터베이스 스키마 실행');
  console.log('2. 사용자 생성 후 로그인하여 테스트');
}

testEdgeFunctions();