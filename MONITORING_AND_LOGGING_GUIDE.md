# 📊 Supabase Edge Functions 모니터링 및 로깅 가이드

## 🔍 모니터링 대시보드

### 1. Edge Functions 로그 확인
👉 **[Functions Logs 바로가기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**

- 각 함수별 실행 로그 확인
- 에러 추적 및 디버깅
- 실행 시간 및 성능 모니터링

### 2. 데이터베이스 모니터링
👉 **[Database Dashboard](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/editor)**

- 쿼리 성능 확인
- 인덱스 사용률
- 테이블 크기 및 row 수

### 3. Auth 사용자 통계
👉 **[Authentication Stats](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/auth/users)**

- 가입 사용자 수
- 활성 세션 수
- 인증 실패 로그

## 📝 로깅 구현

### Edge Functions에 로깅 추가

```typescript
// 로깅 헬퍼 함수
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    functionName: 'market-data', // 함수명
  };
  
  console.log(JSON.stringify(logEntry));
}

// 사용 예시
serve(async (req) => {
  const startTime = Date.now();
  
  try {
    log('INFO', 'Function invoked', { 
      method: req.method,
      url: req.url,
    });
    
    // 비즈니스 로직...
    
    const duration = Date.now() - startTime;
    log('INFO', 'Function completed', { duration });
    
    return new Response(/*...*/);
  } catch (error) {
    log('ERROR', 'Function failed', { 
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(/*...*/);
  }
});
```

### Flutter 앱에서 에러 추적

```dart
// lib/services/error_tracking.dart
class ErrorTracking {
  static void logError(String message, dynamic error, StackTrace? stackTrace) {
    // 콘솔에 로그
    print('ERROR: $message');
    print('Details: $error');
    if (stackTrace != null) {
      print('Stack trace: $stackTrace');
    }
    
    // Supabase 로그 테이블에 저장 (선택사항)
    try {
      supabase.from('app_logs').insert({
        'level': 'ERROR',
        'message': message,
        'error': error.toString(),
        'stack_trace': stackTrace?.toString(),
        'user_id': supabase.auth.currentUser?.id,
        'timestamp': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      // 로깅 실패 시 무시
    }
  }
  
  static void logInfo(String message, [Map<String, dynamic>? data]) {
    print('INFO: $message');
    if (data != null) {
      print('Data: ${jsonEncode(data)}');
    }
  }
}

// 사용 예시
try {
  final response = await supabase.functions.invoke('market-data', /*...*/);
  ErrorTracking.logInfo('Market data fetched', {'symbol': 'AAPL'});
} catch (error, stackTrace) {
  ErrorTracking.logError('Failed to fetch market data', error, stackTrace);
}
```

## 📊 모니터링 메트릭

### 1. 핵심 성능 지표 (KPIs)

| 메트릭 | 목표값 | 측정 방법 |
|--------|---------|-----------|
| Edge Function 응답 시간 | < 500ms | Functions 로그에서 duration 확인 |
| 에러율 | < 1% | 에러 로그 / 전체 요청 수 |
| 캐시 히트율 | > 80% | cached: true 응답 비율 |
| 동시 사용자 수 | - | Auth 대시보드에서 확인 |

### 2. 알림 설정 스크립트

```javascript
// monitoring/check-health.js
const checkHealth = async () => {
  const endpoints = [
    { name: 'Market Data', url: 'market-data', body: { action: 'quote', symbol: 'AAPL' } },
    { name: 'Trading Signals', url: 'trading-signals', body: { symbol: 'AAPL', strategy: 'jesse_livermore', timeframe: 'D' } },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      const response = await fetch(
        `https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/${endpoint.url}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_ANON_KEY',
          },
          body: JSON.stringify(endpoint.body),
        }
      );
      
      const duration = Date.now() - start;
      const status = response.ok ? 'OK' : 'FAIL';
      
      results.push({
        endpoint: endpoint.name,
        status,
        duration,
        statusCode: response.status,
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        status: 'ERROR',
        error: error.message,
      });
    }
  }
  
  console.table(results);
  
  // 에러가 있으면 알림 (이메일, Slack 등)
  const hasErrors = results.some(r => r.status !== 'OK');
  if (hasErrors) {
    console.error('⚠️ 일부 엔드포인트에 문제가 있습니다!');
    // 여기에 알림 로직 추가
  }
};

// 5분마다 실행
setInterval(checkHealth, 5 * 60 * 1000);
checkHealth(); // 즉시 실행
```

## 🔧 디버깅 팁

### 1. Edge Functions 디버깅

```typescript
// 상세 디버깅 정보 포함
if (Deno.env.get('DEBUG') === 'true') {
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  console.log('Request body:', await req.clone().text());
}
```

### 2. Flutter 앱 디버깅

```dart
// main.dart
void main() async {
  // 디버그 모드에서만 상세 로그
  if (kDebugMode) {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      print('Auth state changed: ${data.event}');
    });
  }
  
  runApp(MyApp());
}
```

## 📈 성능 최적화 체크리스트

- [ ] Edge Functions 캐싱 활용 중
- [ ] 데이터베이스 인덱스 최적화
- [ ] Flutter 앱에서 불필요한 API 호출 제거
- [ ] 이미지 및 리소스 최적화
- [ ] 에러 처리 및 재시도 로직 구현

## 🚨 문제 해결 가이드

### 일반적인 문제들

1. **401 Unauthorized**
   - Auth 토큰 만료 확인
   - RLS 정책 확인

2. **500 Internal Server Error**
   - Edge Functions 로그 확인
   - 환경 변수 설정 확인

3. **느린 응답 시간**
   - 캐싱 활용 확인
   - 데이터베이스 쿼리 최적화

## 📞 지원 및 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Discord 커뮤니티](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)