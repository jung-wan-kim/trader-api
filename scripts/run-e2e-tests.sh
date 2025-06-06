#!/bin/bash

echo "🚀 Trader API E2E 테스트 실행"
echo "================================"

# Newman이 설치되어 있는지 확인
if ! command -v newman &> /dev/null; then
    echo "❌ Newman이 설치되어 있지 않습니다."
    echo "설치하려면: npm install -g newman"
    exit 1
fi

# 서버가 실행 중인지 확인
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "⚠️  서버가 실행되고 있지 않습니다."
    echo "서버를 시작하려면: npm start"
    exit 1
fi

# Postman Collection 실행
echo "✅ E2E 테스트 시작..."
newman run postman/trader-api-tests.json \
    --environment postman/local-env.json \
    --reporters cli,json \
    --reporter-json-export postman/test-results.json

# 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 모든 E2E 테스트가 통과했습니다!"
    echo "결과가 postman/test-results.json에 저장되었습니다."
else
    echo ""
    echo "❌ 일부 테스트가 실패했습니다."
    echo "자세한 내용은 postman/test-results.json을 확인하세요."
    exit 1
fi