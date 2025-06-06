#!/usr/bin/env node

/**
 * Documentation Generation Script
 * 
 * This script generates API documentation from OpenAPI spec and JSDoc comments
 */

const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

// Configuration
const CONFIG = {
  docsDir: path.join(__dirname, '../docs'),
  buildDir: path.join(__dirname, '../docs-build'),
  swaggerOptions: {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Trader API',
        version: '1.0.0',
        description: 'AI-powered stock recommendation service backend API',
      },
      servers: [
        {
          url: 'http://localhost:3000/api/v1',
          description: 'Development server',
        },
        {
          url: 'https://api.trader-app.com/api/v1',
          description: 'Production server',
        },
      ],
    },
    apis: [
      path.join(__dirname, '../src/routes/*.js'),
      path.join(__dirname, '../src/controllers/*.js'),
    ],
  }
};

/**
 * Generate OpenAPI specification from JSDoc comments
 */
function generateOpenAPISpec() {
  console.log('🔄 Generating OpenAPI specification from JSDoc comments...');
  
  try {
    const spec = swaggerJsdoc(CONFIG.swaggerOptions);
    
    // Write to JSON file
    const jsonPath = path.join(CONFIG.docsDir, 'api-spec.json');
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    
    // Write to YAML file (optional)
    const yaml = require('js-yaml');
    const yamlPath = path.join(CONFIG.docsDir, 'api-spec-generated.yaml');
    fs.writeFileSync(yamlPath, yaml.dump(spec));
    
    console.log('✅ OpenAPI specification generated successfully');
    console.log(`   - JSON: ${jsonPath}`);
    console.log(`   - YAML: ${yamlPath}`);
    
    return spec;
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error.message);
    throw error;
  }
}

/**
 * Copy documentation files to build directory
 */
function copyDocumentationFiles() {
  console.log('🔄 Copying documentation files...');
  
  try {
    // Create build directory if it doesn't exist
    if (!fs.existsSync(CONFIG.buildDir)) {
      fs.mkdirSync(CONFIG.buildDir, { recursive: true });
    }
    
    // Copy docs directory to build directory
    const { execSync } = require('child_process');
    execSync(`cp -r ${CONFIG.docsDir}/* ${CONFIG.buildDir}/`);
    
    console.log('✅ Documentation files copied successfully');
  } catch (error) {
    console.error('❌ Error copying documentation files:', error.message);
    throw error;
  }
}

/**
 * Generate table of contents for documentation
 */
function generateTableOfContents() {
  console.log('🔄 Generating table of contents...');
  
  const tocData = {
    title: 'Trader API Documentation',
    sections: [
      {
        title: '시작하기',
        items: [
          { title: '사용자 매뉴얼', path: 'USER_MANUAL.md', description: 'API 사용법과 예제 코드' },
          { title: '개발자 가이드', path: 'DEVELOPER_GUIDE.md', description: '로컬 개발 환경 설정' },
        ]
      },
      {
        title: '기술 문서',
        items: [
          { title: '아키텍처', path: 'ARCHITECTURE.md', description: '시스템 구조 및 설계 원리' },
          { title: 'API 명세', path: 'openapi.yaml', description: 'OpenAPI 3.0 스펙' },
        ]
      },
      {
        title: '다국어 지원',
        items: [
          { title: 'English Documentation', path: 'en/USER_MANUAL_EN.md', description: 'Documentation in English' },
        ]
      }
    ],
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  };
  
  try {
    const tocPath = path.join(CONFIG.buildDir, 'toc.json');
    fs.writeFileSync(tocPath, JSON.stringify(tocData, null, 2));
    
    console.log('✅ Table of contents generated successfully');
    console.log(`   - TOC: ${tocPath}`);
  } catch (error) {
    console.error('❌ Error generating table of contents:', error.message);
    throw error;
  }
}

/**
 * Generate documentation index page
 */
function generateIndexPage() {
  console.log('🔄 Generating documentation index page...');
  
  const indexContent = `---
layout: default
title: Trader API Documentation
description: AI-powered stock recommendation service backend API
---

# Trader API Documentation

Welcome to the Trader API documentation. This API provides AI-powered stock investment recommendations, real-time market data, and portfolio management features.

## Quick Start

### For Developers
- [Developer Guide](DEVELOPER_GUIDE.html) - Set up your development environment
- [Architecture Overview](ARCHITECTURE.html) - Understand the system design

### For API Users
- [User Manual](USER_MANUAL.html) - Learn how to use the API
- [API Reference](https://api.trader-app.com/docs) - Interactive API documentation

## API Endpoints

### Authentication
- \`POST /api/v1/auth/register\` - User registration
- \`POST /api/v1/auth/login\` - User login
- \`GET /api/v1/auth/profile\` - Get user profile

### Market Data
- \`GET /api/v1/market/quote/{symbol}\` - Real-time stock quotes
- \`GET /api/v1/market/candles/{symbol}\` - Historical chart data

### Recommendations
- \`GET /api/v1/recommendations\` - Get investment recommendations
- \`GET /api/v1/recommendations/{id}\` - Get recommendation details

### Portfolio
- \`GET /api/v1/portfolio\` - Get user portfolios
- \`POST /api/v1/portfolio/{id}/positions\` - Add new position

## Subscription Plans

| Plan | Price | Daily Recommendations | Features |
|------|-------|----------------------|----------|
| Basic | Free | 3 | Jesse Livermore strategy only |
| Premium | $29/month | 50 | All strategies, 5 portfolios |
| Professional | $99/month | Unlimited | All features, priority support |

## Support

- **Email**: [support@trader-api.com](mailto:support@trader-api.com)
- **Developer Support**: [dev-support@trader-api.com](mailto:dev-support@trader-api.com)
- **GitHub**: [Issues](https://github.com/your-org/trader-api/issues)

## Links

- [Live API Documentation](https://api.trader-app.com/docs)
- [GitHub Repository](https://github.com/your-org/trader-api)
- [Status Page](https://status.trader-app.com)

---

Last updated: ${new Date().toLocaleDateString()}
`;

  try {
    const indexPath = path.join(CONFIG.buildDir, 'index.md');
    fs.writeFileSync(indexPath, indexContent);
    
    console.log('✅ Documentation index page generated successfully');
    console.log(`   - Index: ${indexPath}`);
  } catch (error) {
    console.error('❌ Error generating index page:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting documentation generation...\n');
  
  try {
    // Generate OpenAPI specification
    generateOpenAPISpec();
    console.log('');
    
    // Copy documentation files
    copyDocumentationFiles();
    console.log('');
    
    // Generate table of contents
    generateTableOfContents();
    console.log('');
    
    // Generate index page
    generateIndexPage();
    console.log('');
    
    console.log('🎉 Documentation generation completed successfully!');
    console.log(`📂 Output directory: ${CONFIG.buildDir}`);
    console.log('📋 Generated files:');
    console.log('   - API specification (JSON/YAML)');
    console.log('   - Table of contents');
    console.log('   - Index page');
    console.log('   - All documentation files');
    
  } catch (error) {
    console.error('\n💥 Documentation generation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateOpenAPISpec,
  copyDocumentationFiles,
  generateTableOfContents,
  generateIndexPage
};