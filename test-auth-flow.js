#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://lgebgddeerpxdjvtqvoi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthAndFunctions() {
  console.log('🧪 Supabase Auth & Edge Functions 테스트\n');

  // 1. 테스트 사용자 생성 또는 로그인
  const testEmail = 'test@example.com';
  const testPassword = 'Test1234!@#$';

  console.log('1️⃣ 사용자 로그인 시도...');
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (authError) {
    console.log('로그인 실패, 새 사용자 생성 시도...');
    
    // 회원가입 시도
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.error('❌ 회원가입 실패:', signUpError.message);
      return;
    }

    console.log('✅ 회원가입 성공!');
    authData = signUpData;
  } else {
    console.log('✅ 로그인 성공!');
  }

  const accessToken = authData.session?.access_token;
  if (!accessToken) {
    console.error('❌ 액세스 토큰을 가져올 수 없습니다.');
    return;
  }

  console.log(`📌 Access Token: ${accessToken.substring(0, 20)}...`);
  console.log('');

  // 2. Market Data 테스트
  console.log('2️⃣ Market Data Function 테스트');
  console.log('--------------------------------');
  
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: {
        action: 'quote',
        symbol: 'AAPL'
      }
    });

    if (error) {
      console.error('❌ 에러:', error.message);
    } else {
      console.log('✅ 성공!');
      console.log('응답:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }

  console.log('');

  // 3. Trading Signals 테스트
  console.log('3️⃣ Trading Signals Function 테스트');
  console.log('-----------------------------------');
  
  try {
    const { data, error } = await supabase.functions.invoke('trading-signals', {
      body: {
        symbol: 'AAPL',
        strategy: 'jesse_livermore',
        timeframe: 'D'
      }
    });

    if (error) {
      console.error('❌ 에러:', error.message);
    } else {
      console.log('✅ 성공!');
      console.log('신호:', JSON.stringify(data.signal, null, 2));
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }

  console.log('');

  // 4. Portfolio 생성 테스트
  console.log('4️⃣ Portfolio 생성 테스트');
  console.log('------------------------');
  
  try {
    // 먼저 포트폴리오 생성
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert({
        name: 'Test Portfolio',
        description: 'Edge Functions 테스트용 포트폴리오',
        initial_capital: 10000,
        currency: 'USD'
      })
      .select()
      .single();

    if (portfolioError) {
      console.error('❌ 포트폴리오 생성 실패:', portfolioError.message);
    } else {
      console.log('✅ 포트폴리오 생성 성공!');
      console.log('Portfolio ID:', portfolio.id);

      // Portfolio Management 테스트
      console.log('\n5️⃣ Portfolio Management Function 테스트');
      console.log('---------------------------------------');
      
      const { data, error } = await supabase.functions.invoke('portfolio-management', {
        body: {
          action: 'calculate_performance',
          portfolioId: portfolio.id
        }
      });

      if (error) {
        console.error('❌ 에러:', error.message);
      } else {
        console.log('✅ 성공!');
        console.log('성과:', JSON.stringify(data.performance, null, 2));
      }
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }

  console.log('\n🎉 테스트 완료!');
}

// 패키지 설치 확인
const { exec } = require('child_process');

exec('npm list @supabase/supabase-js', (error, stdout, stderr) => {
  if (error) {
    console.log('📦 Supabase JS 클라이언트 설치 중...');
    exec('npm install @supabase/supabase-js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ 설치 실패:', error);
        return;
      }
      console.log('✅ 설치 완료!');
      testAuthAndFunctions();
    });
  } else {
    testAuthAndFunctions();
  }
});