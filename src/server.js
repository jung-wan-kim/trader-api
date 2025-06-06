import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.ts';

// Import routes
import authRoutes from './routes/auth.js';
import recommendationRoutes from './routes/recommendations.js';
import marketRoutes from './routes/market.js';
import portfolioRoutes from './routes/portfolio.js';
import strategyRoutes from './routes/strategies.js';
import subscriptionRoutes from './routes/subscription.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/market', marketRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/strategies', strategyRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;