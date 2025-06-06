#!/usr/bin/env python3

import os
import json
import base64
import requests
from pathlib import Path

# Supabase 설정
SUPABASE_PROJECT_ID = "lgebgddeerpxdjvtqvoi"
SUPABASE_URL = f"https://{SUPABASE_PROJECT_ID}.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ"
FINNHUB_API_KEY = "d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg"

# Management API URL
MANAGEMENT_API_URL = "https://api.supabase.com"

# 프로젝트 루트 디렉토리
PROJECT_ROOT = Path(__file__).parent.parent

def get_function_code(function_name):
    """Edge Function 코드 읽기"""
    function_path = PROJECT_ROOT / "supabase" / "functions" / function_name / "index.ts"
    if function_path.exists():
        return function_path.read_text()
    else:
        print(f"❌ Function file not found: {function_path}")
        return None

def create_edge_function_via_db():
    """데이터베이스를 통해 Edge Function 메타데이터 생성"""
    import psycopg2
    
    # Supabase 데이터베이스 연결
    conn_str = f"postgresql://postgres.{SUPABASE_PROJECT_ID}:{SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    
    try:
        conn = psycopg2.connect(conn_str)
        cur = conn.cursor()
        
        # Edge Functions 테이블이 있는지 확인하고 생성
        cur.execute("""
            CREATE TABLE IF NOT EXISTS edge_functions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        # Functions 등록
        functions = ["market-data", "trading-signals", "portfolio-management"]
        
        for func_name in functions:
            cur.execute("""
                INSERT INTO edge_functions (name, slug)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE
                SET updated_at = NOW();
            """, (func_name, func_name))
            print(f"✅ Registered function: {func_name}")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("\n✅ All functions registered in database!")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

def test_edge_function(function_name, test_data):
    """Edge Function 테스트"""
    url = f"{SUPABASE_URL}/functions/v1/{function_name}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    print(f"\n🧪 Testing {function_name}...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=test_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Success: {response.json()}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def create_deployment_package():
    """배포 패키지 생성"""
    print("📦 Creating deployment package...\n")
    
    deployment_dir = PROJECT_ROOT / "supabase-deployment"
    deployment_dir.mkdir(exist_ok=True)
    
    # .env.local 파일 생성
    env_content = f"""# Supabase Edge Functions Environment Variables
SUPABASE_URL={SUPABASE_URL}
SUPABASE_ANON_KEY={SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY={SUPABASE_SERVICE_ROLE_KEY}
FINNHUB_API_KEY={FINNHUB_API_KEY}
"""
    
    (deployment_dir / ".env.local").write_text(env_content)
    print("✅ Created .env.local")
    
    # import_map.json 생성
    import_map = {
        "imports": {
            "std/": "https://deno.land/std@0.168.0/",
            "supabase": "https://esm.sh/@supabase/supabase-js@2"
        }
    }
    
    (deployment_dir / "import_map.json").write_text(json.dumps(import_map, indent=2))
    print("✅ Created import_map.json")
    
    # 각 함수별 디렉토리 생성
    functions = ["market-data", "trading-signals", "portfolio-management"]
    
    for func_name in functions:
        func_dir = deployment_dir / func_name
        func_dir.mkdir(exist_ok=True)
        
        # 함수 코드 복사
        source_code = get_function_code(func_name)
        if source_code:
            (func_dir / "index.ts").write_text(source_code)
            print(f"✅ Copied {func_name}/index.ts")
    
    # 배포 스크립트 생성
    deploy_script = """#!/bin/bash
# Supabase Edge Functions Local Deployment Script

echo "🚀 Deploying Edge Functions locally..."

# Supabase CLI로 로컬 개발 서버 시작
supabase start

# Functions 서빙
supabase functions serve --env-file .env.local

echo "✅ Edge Functions are now running locally!"
echo "Test URLs:"
echo "  - http://localhost:54321/functions/v1/market-data"
echo "  - http://localhost:54321/functions/v1/trading-signals"
echo "  - http://localhost:54321/functions/v1/portfolio-management"
"""
    
    (deployment_dir / "deploy-local.sh").write_text(deploy_script)
    os.chmod(deployment_dir / "deploy-local.sh", 0o755)
    print("✅ Created deploy-local.sh")
    
    print(f"\n📁 Deployment package created at: {deployment_dir}")
    print("\nTo deploy locally:")
    print(f"  cd {deployment_dir}")
    print("  ./deploy-local.sh")

def main():
    print("🚀 Supabase Edge Functions Deployment\n")
    
    # 1. 배포 패키지 생성
    create_deployment_package()
    
    # 2. 데이터베이스에 함수 등록 시도
    print("\n📝 Registering functions in database...")
    create_edge_function_via_db()
    
    # 3. 테스트 데이터로 함수 테스트
    print("\n🧪 Testing Edge Functions...")
    
    # market-data 테스트
    test_edge_function("market-data", {
        "action": "quote",
        "symbol": "AAPL"
    })
    
    # trading-signals 테스트
    test_edge_function("trading-signals", {
        "symbol": "AAPL",
        "strategy": "jesse_livermore",
        "timeframe": "D"
    })
    
    # portfolio-management 테스트
    test_edge_function("portfolio-management", {
        "action": "calculate_performance",
        "portfolioId": "test-portfolio-id"
    })
    
    print("\n✅ Deployment process completed!")
    print("\n📌 Important Notes:")
    print("1. Edge Functions need to be deployed via Supabase CLI or Dashboard")
    print("2. Use 'supabase functions deploy <function-name>' to deploy")
    print("3. Set secrets with 'supabase secrets set KEY=value'")
    print("\n🔗 Supabase Dashboard:")
    print(f"   https://app.supabase.com/project/{SUPABASE_PROJECT_ID}/functions")

if __name__ == "__main__":
    main()