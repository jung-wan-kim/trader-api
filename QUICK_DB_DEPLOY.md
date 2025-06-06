# 🔥 긴급! 데이터베이스 스키마 즉시 배포

## ⚡ 1분 안에 완료하는 방법

### 1️⃣ 이 링크 클릭
👉 **[SQL Editor 바로가기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/sql/new)**

### 2️⃣ 아래 SQL 전체 복사

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_tier TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```

### 3️⃣ RUN 버튼 클릭

### 4️⃣ 터미널에서 테스트
```bash
cd /Users/jung-wankim/Project/trader-api
node test-auth-flow.js
```

## ✅ 성공하면 보이는 것:
- ✅ 회원가입 성공!
- ✅ Market Data 조회 성공
- ✅ Trading Signal 분석 성공

## 🎯 이후 자동으로 진행됩니다!