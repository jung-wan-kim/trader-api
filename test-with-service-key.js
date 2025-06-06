#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Service Role Key를 사용하여 RLS를 우회
const supabase = createClient(
  'https://lgebgddeerpxdjvtqvoi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ'
);

async function testWithServiceKey() {
  console.log('🔑 Service Key로 Edge Functions 테스트\n');

  // 1. Market Data 테스트 (인증 없이도 작동해야 함)
  console.log('📊 Market Data 호출...');
  try {
    const response = await fetch('https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'quote', symbol: 'AAPL' })
    });

    const data = await response.json();
    console.log('상태 코드:', response.status);
    
    if (response.ok && data.data) {
      console.log('✅ 성공!');
      console.log('   현재가:', `$${data.data.c}`);
      console.log('   변동률:', `${data.data.dp}%`);
      console.log('   캐시:', data.cached ? '예' : '아니오');
    } else {
      console.log('❌ 에러:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ 예외:', error.message);
  }

  console.log('\n');

  // 2. Trading Signals 테스트
  console.log('📈 Trading Signals 호출...');
  try {
    const response = await fetch('https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbol: 'AAPL', 
        strategy: 'jesse_livermore',
        timeframe: 'D'
      })
    });

    const data = await response.json();
    console.log('상태 코드:', response.status);
    
    if (response.ok && data.signal) {
      console.log('✅ 성공!');
      console.log('   신호:', data.signal.action.toUpperCase());
      console.log('   신뢰도:', `${(data.signal.confidence * 100).toFixed(0)}%`);
      console.log('   분석:', data.signal.reasoning);
    } else {
      console.log('❌ 에러:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ 예외:', error.message);
  }

  console.log('\n');

  // 3. 사용자 생성 테스트
  console.log('👤 테스트 사용자 생성...');
  try {
    // 먼저 기존 사용자 확인
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'test-service@trader.com')
      .single();

    if (!existingUser) {
      // auth.users에 직접 사용자 생성 (Service Key 필요)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'test-service@trader.com',
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { name: 'Service Test User' }
      });

      if (createError) {
        console.log('❌ 사용자 생성 실패:', createError.message);
      } else {
        console.log('✅ 사용자 생성 성공!');
        console.log('   User ID:', newUser.user.id);
        console.log('   Email:', newUser.user.email);
      }
    } else {
      console.log('ℹ️  사용자가 이미 존재합니다:', existingUser.email);
    }
  } catch (error) {
    console.error('❌ 예외:', error.message);
  }

  console.log('\n🎉 서비스 키 테스트 완료!');
}

testWithServiceKey().catch(console.error);