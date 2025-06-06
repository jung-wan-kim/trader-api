const express = require('express');
const marketController = require('../controllers/marketController.js');
const { authenticate } = require('../middleware/auth.js');
const { validateCandleQuery, validateSymbol, validateIndicatorQuery, validateStrategySignalQuery } = require('../validators/market.js');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get stock quote
router.get('/quote/:symbol', validateSymbol, marketController.getQuote);

// Get stock candles (OHLC data)
router.get('/candles/:symbol', validateSymbol, validateCandleQuery, marketController.getCandles);

// Search stocks
router.get('/search', marketController.searchStocks);

// Get market news
router.get('/news/:symbol?', marketController.getNews);

// Get company profile
router.get('/profile/:symbol', validateSymbol, marketController.getCompanyProfile);

// Get technical indicators with strategy signals
router.get('/indicators/:symbol', validateSymbol, validateIndicatorQuery, marketController.getTechnicalIndicators);

// Get market sentiment
router.get('/sentiment/:symbol', validateSymbol, marketController.getMarketSentiment);

// Get earnings calendar
router.get('/earnings', marketController.getEarningsCalendar);

// Get market status
router.get('/status', marketController.getMarketStatus);

// Get strategy-specific signals
router.get('/signals/:symbol/:strategy', validateStrategySignalQuery, marketController.getStrategySignals);

module.exports = router;