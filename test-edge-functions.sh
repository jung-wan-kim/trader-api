#!/bin/bash

# Edge Functions 테스트 스크립트

SUPABASE_URL="https://lgebgddeerpxdjvtqvoi.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE"

echo "🧪 Supabase Edge Functions 테스트"
echo "=================================="
echo ""

# 1. Market Data 테스트
echo "1️⃣ Market Data Function 테스트 (AAPL Quote)"
echo "--------------------------------------------"
curl -X POST "${SUPABASE_URL}/functions/v1/market-data" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "quote",
    "symbol": "AAPL"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || echo "❌ 함수가 아직 배포되지 않았습니다."

echo ""
echo ""

# 2. Trading Signals 테스트
echo "2️⃣ Trading Signals Function 테스트 (Jesse Livermore)"
echo "-----------------------------------------------------"
curl -X POST "${SUPABASE_URL}/functions/v1/trading-signals" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "strategy": "jesse_livermore",
    "timeframe": "D"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || echo "❌ 함수가 아직 배포되지 않았습니다."

echo ""
echo ""

# 3. Portfolio Management 테스트
echo "3️⃣ Portfolio Management Function 테스트"
echo "----------------------------------------"
curl -X POST "${SUPABASE_URL}/functions/v1/portfolio-management" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "calculate_performance",
    "portfolioId": "test-portfolio-id"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || echo "❌ 함수가 아직 배포되지 않았습니다."

echo ""
echo ""
echo "📌 Edge Functions 배포 상태:"
echo "- 404 에러: 함수가 배포되지 않음"
echo "- 401 에러: 인증 문제 (로그인 필요)"
echo "- 200 성공: 함수가 정상 작동 중"
echo ""
echo "🚀 배포하려면:"
echo "1. https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions 접속"
echo "2. 각 함수 생성 및 코드 복사"
echo "3. Deploy 클릭"