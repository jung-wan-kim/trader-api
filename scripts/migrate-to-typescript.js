#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('TypeScript 마이그레이션 헬퍼 스크립트');
console.log('=====================================\n');

// 마이그레이션할 디렉토리 목록
const directories = [
  'controllers',
  'routes',
  'services',
  'middleware',
  'config',
  'utils',
  'validators'
];

// TypeScript 파일 템플릿 생성 함수
function createTypeScriptTemplate(jsFilePath) {
  const fileName = path.basename(jsFilePath, '.js');
  const dirName = path.basename(path.dirname(jsFilePath));
  
  return `// TODO: 이 파일은 ${jsFilePath}에서 마이그레이션됩니다.
// 점진적 마이그레이션을 위해 기존 .js 파일을 import하고 있습니다.

export * from './${fileName}.js';
export { default } from './${fileName}.js';

// TypeScript 마이그레이션 진행 시:
// 1. 이 파일의 내용을 ${fileName}.js의 내용으로 교체
// 2. 타입 주석 추가
// 3. any 타입을 구체적인 타입으로 변경
// 4. .js import를 .ts로 변경
`;
}

// 마이그레이션 상태 확인
function checkMigrationStatus() {
  console.log('현재 마이그레이션 상태:');
  console.log('---------------------');
  
  let totalJs = 0;
  let totalTs = 0;
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', 'src', dir);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    
    totalJs += jsFiles.length;
    totalTs += tsFiles.length;
    
    console.log(`${dir}/:`);
    console.log(`  JavaScript 파일: ${jsFiles.length}개`);
    console.log(`  TypeScript 파일: ${tsFiles.length}개`);
    console.log(`  진행률: ${tsFiles.length > 0 ? Math.round((tsFiles.length / (jsFiles.length + tsFiles.length)) * 100) : 0}%`);
    console.log('');
  });
  
  console.log('전체 통계:');
  console.log(`  총 JavaScript 파일: ${totalJs}개`);
  console.log(`  총 TypeScript 파일: ${totalTs}개`);
  console.log(`  전체 진행률: ${totalTs > 0 ? Math.round((totalTs / (totalJs + totalTs)) * 100) : 0}%`);
}

// TypeScript 래퍼 파일 생성
function createTypeScriptWrappers() {
  console.log('\n\nTypeScript 래퍼 파일 생성 옵션:');
  console.log('================================');
  console.log('이 옵션은 기존 .js 파일을 유지하면서 .ts 래퍼를 생성합니다.');
  console.log('점진적 마이그레이션에 도움이 됩니다.\n');
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', 'src', dir);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    jsFiles.forEach(jsFile => {
      const tsFile = jsFile.replace('.js', '.ts');
      const tsFilePath = path.join(dirPath, tsFile);
      
      if (!fs.existsSync(tsFilePath)) {
        console.log(`래퍼 생성 가능: ${dir}/${tsFile}`);
      }
    });
  });
  
  console.log('\n래퍼 파일을 생성하려면 다음 명령어를 실행하세요:');
  console.log('npm run migrate -- --create-wrappers');
}

// 메인 실행
console.log('TypeScript 마이그레이션 준비 완료!\n');
console.log('다음 단계:');
console.log('1. TypeScript 패키지 설치: ./typescript-setup.sh');
console.log('2. TypeScript 빌드 테스트: npm run build');
console.log('3. TypeScript 개발 서버: npm run dev');
console.log('4. 기존 JavaScript 서버: npm run dev:js\n');

checkMigrationStatus();
createTypeScriptWrappers();

// 명령줄 인자 처리
if (process.argv.includes('--create-wrappers')) {
  console.log('\n\n래퍼 파일 생성 중...');
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', 'src', dir);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    jsFiles.forEach(jsFile => {
      const tsFile = jsFile.replace('.js', '.ts');
      const tsFilePath = path.join(dirPath, tsFile);
      const jsFilePath = path.join(dir, jsFile);
      
      if (!fs.existsSync(tsFilePath)) {
        const content = createTypeScriptTemplate(jsFilePath);
        fs.writeFileSync(tsFilePath, content);
        console.log(`✓ 생성됨: ${dir}/${tsFile}`);
      }
    });
  });
  
  console.log('\n래퍼 파일 생성 완료!');
}