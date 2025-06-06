#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://lgebgddeerpxdjvtqvoi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 성능 측정 함수
function measureTime(start) {
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // 나노초를 밀리초로 변환
}

async function performanceTest() {
  console.log('🚀 Edge Functions 성능 테스트\n');

  // 1. 로그인
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'Test1234!@#$'
  });

  if (authError) {
    console.error('❌ 로그인 실패. 먼저 데이터베이스 스키마를 배포하고 test-auth-flow.js를 실행하세요.');
    return;
  }

  console.log('✅ 로그인 성공\n');

  // 테스트할 심볼 목록
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  const results = {
    marketData: [],
    tradingSignals: [],
  };

  // 2. Market Data 성능 테스트
  console.log('📊 Market Data 성능 테스트');
  console.log('---------------------------');

  for (const symbol of symbols) {
    const start = process.hrtime.bigint();
    
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: {
          action: 'quote',
          symbol: symbol
        }
      });

      const time = measureTime(start);
      
      if (error) {
        console.log(`❌ ${symbol}: 에러 - ${error.message}`);
      } else {
        console.log(`✅ ${symbol}: ${time.toFixed(2)}ms (캐시: ${data.cached ? '예' : '아니오'})`);
        results.marketData.push(time);
      }
    } catch (e) {
      console.log(`❌ ${symbol}: 예외 - ${e.message}`);
    }
  }

  console.log('\n');

  // 3. Trading Signals 성능 테스트
  console.log('📈 Trading Signals 성능 테스트');
  console.log('-------------------------------');

  const strategies = ['jesse_livermore', 'larry_williams', 'stan_weinstein'];

  for (const strategy of strategies) {
    const start = process.hrtime.bigint();
    
    try {
      const { data, error } = await supabase.functions.invoke('trading-signals', {
        body: {
          symbol: 'AAPL',
          strategy: strategy,
          timeframe: 'D'
        }
      });

      const time = measureTime(start);
      
      if (error) {
        console.log(`❌ ${strategy}: 에러 - ${error.message}`);
      } else {
        console.log(`✅ ${strategy}: ${time.toFixed(2)}ms`);
        results.tradingSignals.push(time);
      }
    } catch (e) {
      console.log(`❌ ${strategy}: 예외 - ${e.message}`);
    }
  }

  console.log('\n');

  // 4. 동시 요청 테스트
  console.log('⚡ 동시 요청 성능 테스트');
  console.log('------------------------');

  const start = process.hrtime.bigint();
  
  try {
    const promises = symbols.map(symbol => 
      supabase.functions.invoke('market-data', {
        body: { action: 'quote', symbol }
      })
    );

    const responses = await Promise.all(promises);
    const time = measureTime(start);
    
    const successCount = responses.filter(r => !r.error).length;
    console.log(`✅ ${successCount}/${symbols.length} 성공, 총 시간: ${time.toFixed(2)}ms`);
    console.log(`   평균: ${(time / symbols.length).toFixed(2)}ms/요청`);
  } catch (e) {
    console.log(`❌ 동시 요청 실패: ${e.message}`);
  }

  // 5. 결과 요약
  console.log('\n📊 성능 테스트 요약');
  console.log('==================');

  if (results.marketData.length > 0) {
    const avgMarket = results.marketData.reduce((a, b) => a + b, 0) / results.marketData.length;
    console.log(`Market Data 평균: ${avgMarket.toFixed(2)}ms`);
  }

  if (results.tradingSignals.length > 0) {
    const avgSignals = results.tradingSignals.reduce((a, b) => a + b, 0) / results.tradingSignals.length;
    console.log(`Trading Signals 평균: ${avgSignals.toFixed(2)}ms`);
  }

  console.log('\n💡 성능 팁:');
  console.log('- 첫 요청은 콜드 스타트로 느릴 수 있음');
  console.log('- 캐시된 데이터는 훨씬 빠름');
  console.log('- 동시 요청으로 처리량 향상 가능');
}

// 메인 실행
performanceTest().catch(console.error);