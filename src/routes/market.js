const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const { authenticate } = require('../middleware/auth');
const { validateCandleQuery, validateSymbol } = require('../validators/market');

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

// Get technical indicators
router.get('/indicators/:symbol', validateSymbol, marketController.getTechnicalIndicators);

module.exports = router;