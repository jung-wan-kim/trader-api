#!/bin/bash

# Supabase 프로젝트 설정
SUPABASE_PROJECT_ID="lgebgddeerpxdjvtqvoi"
SUPABASE_URL="https://${SUPABASE_PROJECT_ID}.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ"
FINNHUB_API_KEY="d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg"

echo "🚀 Supabase Edge Functions 배포 시작..."
echo ""

# Supabase CLI 확인
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI가 설치되어 있지 않습니다."
    echo "설치하려면 다음 명령어를 실행하세요:"
    echo "  brew install supabase/tap/supabase"
    echo "또는"
    echo "  npm install -g supabase"
    exit 1
fi

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.." || exit 1

# Supabase 프로젝트 링크
echo "📌 Supabase 프로젝트 연결 중..."
supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_SERVICE_ROLE_KEY"

# Secrets 설정
echo ""
echo "🔐 환경 변수 설정 중..."
supabase secrets set FINNHUB_API_KEY="$FINNHUB_API_KEY"
supabase secrets set SUPABASE_URL="$SUPABASE_URL"
supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# Edge Functions 배포
echo ""
echo "📦 Edge Functions 배포 중..."

# market-data function
echo ""
echo "1️⃣ market-data 함수 배포 중..."
supabase functions deploy market-data --no-verify-jwt

# trading-signals function
echo ""
echo "2️⃣ trading-signals 함수 배포 중..."
supabase functions deploy trading-signals --no-verify-jwt

# portfolio-management function
echo ""
echo "3️⃣ portfolio-management 함수 배포 중..."
supabase functions deploy portfolio-management --no-verify-jwt

echo ""
echo "✅ 모든 Edge Functions 배포 완료!"
echo ""
echo "📌 Edge Functions URLs:"
echo "  - ${SUPABASE_URL}/functions/v1/market-data"
echo "  - ${SUPABASE_URL}/functions/v1/trading-signals"
echo "  - ${SUPABASE_URL}/functions/v1/portfolio-management"
echo ""
echo "🔍 함수 로그 확인:"
echo "  supabase functions logs market-data"
echo "  supabase functions logs trading-signals"
echo "  supabase functions logs portfolio-management"