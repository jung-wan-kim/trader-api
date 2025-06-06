import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateSymbol, validateCandleQuery, validateSearchQuery } from '../validators/market.js';
import * as marketController from '../controllers/marketController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Real-time quote data
router.get('/quote/:symbol', validateSymbol, marketController.getQuote);

// Candlestick/OHLC data
router.get('/candles/:symbol', validateSymbol, validateCandleQuery, marketController.getCandles);

// Stock search
router.get('/search', validateSearchQuery, marketController.searchStocks);

// Market news (general or symbol-specific)
router.get('/news/:symbol?', marketController.getNews);

// Company profile/information
router.get('/profile/:symbol', validateSymbol, marketController.getCompanyProfile);

// Technical indicators and analysis
router.get('/indicators/:symbol', validateSymbol, marketController.getTechnicalIndicators);

// Market sentiment analysis
router.get('/sentiment/:symbol', validateSymbol, marketController.getMarketSentiment);

// Earnings calendar
router.get('/earnings', marketController.getEarningsCalendar);

// Market status (open/closed)
router.get('/status', marketController.getMarketStatus);

// Strategy-specific signals
router.get('/signals/:symbol', validateSymbol, marketController.getStrategySignals);

export default router;