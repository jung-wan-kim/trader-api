#!/usr/bin/env node

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';
const BASE_URL = 'https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1';

async function testFunction(name, body) {
  console.log(`\n📊 Testing ${name}...`);
  console.log('Request:', JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 Edge Functions 전체 테스트\n');
  console.log('================================');
  
  const results = [];
  
  // 1. Market Data 테스트
  const marketTests = [
    { action: 'quote', symbol: 'AAPL' },
    { action: 'quote', symbol: 'GOOGL' },
    { action: 'profile', symbol: 'MSFT' },
  ];
  
  for (const test of marketTests) {
    const result = await testFunction('market-data', test);
    results.push({ function: 'market-data', ...test, ...result });
  }
  
  // 2. Trading Signals 테스트
  const signalTests = [
    { symbol: 'AAPL', strategy: 'jesse_livermore' },
    { symbol: 'GOOGL', strategy: 'larry_williams' },
    { symbol: 'MSFT', strategy: 'stan_weinstein' },
  ];
  
  for (const test of signalTests) {
    const result = await testFunction('trading-signals', test);
    results.push({ function: 'trading-signals', ...test, ...result });
  }
  
  // 3. Portfolio Management 테스트 (인증 필요)
  console.log('\n📊 Testing portfolio-management...');
  console.log('Note: This requires authenticated user');
  const portfolioResult = await testFunction('portfolio-management', {
    action: 'calculate_performance',
    portfolioId: 'test-portfolio-id',
  });
  results.push({ function: 'portfolio-management', ...portfolioResult });
  
  // 결과 요약
  console.log('\n\n📊 테스트 결과 요약');
  console.log('==================');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ 성공: ${successCount}/${totalCount}`);
  console.log(`❌ 실패: ${totalCount - successCount}/${totalCount}`);
  
  // 상세 결과
  console.log('\n상세 결과:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.function} - ${result.symbol || result.action || 'test'}`);
  });
  
  // 성능 통계
  console.log('\n📈 시장 데이터 샘플:');
  const marketDataResults = results.filter(r => r.function === 'market-data' && r.success);
  marketDataResults.forEach(result => {
    if (result.data?.data?.c) {
      console.log(`${result.symbol}: $${result.data.data.c} (${result.data.data.dp > 0 ? '+' : ''}${result.data.data.dp}%)`);
    }
  });
  
  console.log('\n🎯 트레이딩 신호 샘플:');
  const signalResults = results.filter(r => r.function === 'trading-signals' && r.success);
  signalResults.forEach(result => {
    if (result.data?.signal) {
      const signal = result.data.signal;
      console.log(`${result.symbol} (${result.strategy}): ${signal.action.toUpperCase()} - 신뢰도 ${(signal.confidence * 100).toFixed(0)}%`);
    }
  });
  
  console.log('\n✨ 모든 테스트 완료!');
}

// 실행
runAllTests().catch(console.error);