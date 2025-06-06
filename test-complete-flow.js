#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lgebgddeerpxdjvtqvoi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE'
);

async function testCompleteFlow() {
  console.log('🧪 완전한 Edge Functions 테스트 플로우\n');

  // 1. 로그인
  console.log('1️⃣ 사용자 로그인...');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-service@trader.com',
    password: 'Test1234!'
  });

  if (authError) {
    console.error('❌ 로그인 실패:', authError.message);
    return;
  }

  console.log('✅ 로그인 성공!');
  console.log('   User ID:', auth.user.id);
  console.log('   Email:', auth.user.email);
  console.log('');

  // 2. Market Data 테스트
  console.log('2️⃣ Market Data 테스트');
  console.log('====================');
  
  const symbols = ['AAPL', 'GOOGL', 'MSFT'];
  
  for (const symbol of symbols) {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'quote', symbol }
      });

      if (error) {
        console.log(`❌ ${symbol}: ${error.message}`);
      } else if (data?.data) {
        console.log(`✅ ${symbol}:`);
        console.log(`   현재가: $${data.data.c}`);
        console.log(`   변동: ${data.data.d > 0 ? '+' : ''}${data.data.d} (${data.data.dp}%)`);
        console.log(`   캐시: ${data.cached ? '예' : '아니오'}`);
      }
    } catch (e) {
      console.error(`❌ ${symbol} 예외:`, e.message);
    }
  }

  console.log('');

  // 3. Trading Signals 테스트
  console.log('3️⃣ Trading Signals 테스트');
  console.log('========================');
  
  const strategies = [
    { name: 'Jesse Livermore', key: 'jesse_livermore' },
    { name: 'Larry Williams', key: 'larry_williams' },
    { name: 'Stan Weinstein', key: 'stan_weinstein' }
  ];

  for (const strategy of strategies) {
    try {
      const { data, error } = await supabase.functions.invoke('trading-signals', {
        body: { 
          symbol: 'AAPL', 
          strategy: strategy.key,
          timeframe: 'D'
        }
      });

      if (error) {
        console.log(`❌ ${strategy.name}: ${error.message}`);
      } else if (data?.signal) {
        const signal = data.signal;
        console.log(`✅ ${strategy.name}:`);
        console.log(`   신호: ${signal.action.toUpperCase()}`);
        console.log(`   신뢰도: ${(signal.confidence * 100).toFixed(0)}%`);
        
        if (signal.action !== 'hold') {
          console.log(`   진입가: $${signal.entry_price?.toFixed(2)}`);
          console.log(`   목표가: $${signal.target_price?.toFixed(2)}`);
          console.log(`   손절가: $${signal.stop_loss?.toFixed(2)}`);
        }
      }
    } catch (e) {
      console.error(`❌ ${strategy.name} 예외:`, e.message);
    }
  }

  console.log('');

  // 4. Portfolio Management 테스트
  console.log('4️⃣ Portfolio Management 테스트');
  console.log('=============================');

  // 포트폴리오 생성
  try {
    const { data: portfolio, error: createError } = await supabase
      .from('portfolios')
      .insert({
        name: 'Test Portfolio',
        description: 'Edge Functions 테스트용',
        initial_capital: 10000,
        currency: 'USD'
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ 포트폴리오 생성 실패:', createError.message);
    } else {
      console.log('✅ 포트폴리오 생성 성공!');
      console.log('   ID:', portfolio.id);
      console.log('   이름:', portfolio.name);
      console.log('   초기자본: $', portfolio.initial_capital);

      // 성과 계산
      const { data: perfData, error: perfError } = await supabase.functions.invoke(
        'portfolio-management',
        {
          body: {
            action: 'calculate_performance',
            portfolioId: portfolio.id
          }
        }
      );

      if (perfError) {
        console.log('❌ 성과 계산 실패:', perfError.message);
      } else if (perfData?.performance) {
        console.log('✅ 성과 분석:');
        console.log('   총 가치: $', perfData.performance.totalValue);
        console.log('   수익률:', perfData.performance.totalReturn, '%');
      }
    }
  } catch (e) {
    console.error('❌ Portfolio 예외:', e.message);
  }

  console.log('\n🎉 모든 테스트 완료!');
  
  // 로그아웃
  await supabase.auth.signOut();
  console.log('👋 로그아웃 완료');
}

// 실행
testCompleteFlow().catch(console.error);