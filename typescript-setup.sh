#!/bin/bash

echo "TypeScript 마이그레이션을 위한 패키지 설치를 시작합니다..."

# TypeScript 및 관련 패키지 설치
npm install --save-dev typescript @types/node ts-node ts-node-dev

# Express 및 관련 타입 정의 설치
npm install --save-dev @types/express @types/cors @types/compression @types/morgan

# 기타 패키지 타입 정의 설치
npm install --save-dev @types/bcryptjs @types/jsonwebtoken @types/uuid @types/ws @types/node-cron

# Jest TypeScript 지원
npm install --save-dev ts-jest @types/jest @types/supertest

# ESLint TypeScript 지원
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

echo "TypeScript 패키지 설치가 완료되었습니다!"