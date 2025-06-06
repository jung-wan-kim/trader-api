# 🔧 Supabase 테스트 모드 설정

## 🎯 이메일 확인 비활성화 (개발/테스트용)

### 1. Authentication 설정 페이지 접속
👉 **[Auth Settings 바로가기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/auth/settings)**

### 2. Email Auth 섹션에서 설정 변경
- **"Enable email confirmations"** 토글을 **OFF**로 변경
- **Save** 버튼 클릭

### 3. 테스트 계정 직접 생성 (선택사항)
👉 **[Users 페이지](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/auth/users)**
- **"Create a new user"** 버튼 클릭
- 이메일: `test-user@trader.com`
- 비밀번호: `Test1234!`
- **Auto Confirm User** 체크 ✅

## 🧪 간단한 테스트 스크립트

```javascript
// quick-test.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lgebgddeerpxdjvtqvoi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE'
);

async function quickTest() {
  console.log('🚀 빠른 Edge Functions 테스트\n');

  // 1. 로그인 (이미 생성한 사용자)
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'test-user@trader.com',
    password: 'Test1234!'
  });

  if (error) {
    console.error('❌ 로그인 실패:', error.message);
    return;
  }

  console.log('✅ 로그인 성공!\n');

  // 2. Market Data 테스트
  console.log('📊 Market Data 호출...');
  const { data: marketData } = await supabase.functions.invoke('market-data', {
    body: { action: 'quote', symbol: 'AAPL' }
  });
  
  if (marketData?.data) {
    console.log('✅ 현재가:', `$${marketData.data.c}`);
    console.log('   변동률:', `${marketData.data.dp}%`);
  }

  // 3. Trading Signal 테스트
  console.log('\n📈 Trading Signal 호출...');
  const { data: signalData } = await supabase.functions.invoke('trading-signals', {
    body: { 
      symbol: 'AAPL', 
      strategy: 'jesse_livermore',
      timeframe: 'D'
    }
  });
  
  if (signalData?.signal) {
    console.log('✅ 신호:', signalData.signal.action.toUpperCase());
    console.log('   신뢰도:', `${(signalData.signal.confidence * 100).toFixed(0)}%`);
    if (signalData.signal.entry_price) {
      console.log('   진입가:', `$${signalData.signal.entry_price.toFixed(2)}`);
      console.log('   목표가:', `$${signalData.signal.target_price.toFixed(2)}`);
      console.log('   손절가:', `$${signalData.signal.stop_loss.toFixed(2)}`);
    }
  }

  console.log('\n🎉 모든 테스트 완료!');
}

quickTest().catch(console.error);
```

## ✅ 확인 방법

설정 변경 후:
```bash
node quick-test.js
```

성공하면 다음과 같은 출력을 볼 수 있습니다:
```
🚀 빠른 Edge Functions 테스트

✅ 로그인 성공!

📊 Market Data 호출...
✅ 현재가: $150.25
   변동률: 1.25%

📈 Trading Signal 호출...
✅ 신호: BUY
   신뢰도: 75%
   진입가: $150.00
   목표가: $165.00
   손절가: $142.50

🎉 모든 테스트 완료!
```