import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the OpenAPI YAML file
const openApiSpec = readFileSync(
  join(__dirname, '../../docs/openapi.yaml'),
  'utf8'
);

// Swagger JSDoc configuration for auto-generating docs from code comments
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Trader API',
      version: '1.0.0',
      description: `
        AI-powered stock recommendation service backend API
        
        This API provides comprehensive trading recommendation services, market data, 
        portfolio management, and user authentication features.
      `,
      contact: {
        name: 'Trader API Team',
        email: 'support@trader-api.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    join(__dirname, '../routes/*.js'),
    join(__dirname, '../controllers/*.js'),
    join(__dirname, '../middleware/*.js'),
  ],
};

// Generate swagger specification from JSDoc comments
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add any request interceptors here
      return req;
    },
    responseInterceptor: (res) => {
      // Add any response interceptors here
      return res;
    },
  },
  customCss: `
    .swagger-ui .topbar { 
      background-color: #2c3e50; 
    }
    .swagger-ui .topbar .download-url-wrapper { 
      display: none; 
    }
    .swagger-ui .info .title {
      color: #2c3e50;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
  `,
  customSiteTitle: 'Trader API Documentation',
  customfavIcon: '/assets/favicon.ico',
};

export {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
  openApiSpec
};