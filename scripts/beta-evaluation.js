#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Trader API 베타 버전 평가 시작...\n');

// 평가 결과 저장
const results = {
  timestamp: new Date().toISOString(),
  coverageGoal: 60,
  attempts: [],
  passed: false
};

// 3회 연속 시도
for (let i = 1; i <= 3; i++) {
  console.log(`\n📊 시도 ${i}/3:`);
  
  try {
    // 테스트 실행 및 커버리지 측정
    const output = execSync('npm test -- --coverage --json --outputFile=coverage-report.json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // 커버리지 리포트 읽기
    const reportPath = path.join(__dirname, '..', 'coverage-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // 전체 커버리지 계산
      const coverage = report.coverageMap ? 
        Math.floor((
          report.coverageMap.total.statements.pct +
          report.coverageMap.total.branches.pct +
          report.coverageMap.total.lines.pct +
          report.coverageMap.total.functions.pct
        ) / 4) : 0;
      
      results.attempts.push({
        attempt: i,
        coverage: coverage,
        passed: coverage >= results.coverageGoal,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ 커버리지: ${coverage}%`);
      
      // 정리
      fs.unlinkSync(reportPath);
    } else {
      // JSON 리포트가 없으면 일반 테스트 실행
      try {
        execSync('npm test -- --coverage', { stdio: 'inherit' });
        console.log('⚠️  커버리지 측정 불가 - 테스트만 실행됨');
        results.attempts.push({
          attempt: i,
          coverage: 0,
          passed: false,
          error: 'Coverage measurement failed'
        });
      } catch (error) {
        console.log('❌ 테스트 실패');
        results.attempts.push({
          attempt: i,
          coverage: 0,
          passed: false,
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error(`❌ 오류 발생: ${error.message}`);
    results.attempts.push({
      attempt: i,
      coverage: 0,
      passed: false,
      error: error.message
    });
  }
  
  // 잠시 대기
  if (i < 3) {
    console.log('\n⏳ 다음 시도까지 2초 대기...');
    execSync('sleep 2');
  }
}

// 최종 평가
const successfulAttempts = results.attempts.filter(a => a.passed).length;
results.passed = successfulAttempts === 3;

console.log('\n' + '='.repeat(50));
console.log('📋 베타 버전 평가 결과:');
console.log('='.repeat(50));
console.log(`목표 커버리지: ${results.coverageGoal}%`);
console.log(`성공한 시도: ${successfulAttempts}/3`);
console.log(`최종 결과: ${results.passed ? '✅ 통과' : '❌ 실패'}`);

// 각 시도 결과 출력
console.log('\n상세 결과:');
results.attempts.forEach(attempt => {
  console.log(`  시도 ${attempt.attempt}: ${attempt.coverage}% ${attempt.passed ? '✅' : '❌'}`);
});

// 결과 파일 저장
const resultPath = path.join(__dirname, '..', 'beta-evaluation-result.json');
fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
console.log(`\n💾 결과가 ${resultPath}에 저장되었습니다.`);

// 현실적인 제안
if (!results.passed) {
  console.log('\n💡 제안사항:');
  console.log('1. 현재 테스트 커버리지가 목표에 미달합니다.');
  console.log('2. 다음 방법들을 고려해보세요:');
  console.log('   - 더 간단한 유닛 테스트 추가');
  console.log('   - 복잡한 컨트롤러 대신 유틸리티/미들웨어 테스트 강화');
  console.log('   - 목표 커버리지를 30-40%로 조정');
  console.log('   - E2E 테스트보다는 단위 테스트에 집중');
}

process.exit(results.passed ? 0 : 1);