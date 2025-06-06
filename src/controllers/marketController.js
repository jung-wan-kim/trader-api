const finnhubService = require('../services/finnhubService');
const logger = require('../utils/logger');

const getQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    
    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    
    res.json({
      data: {
        symbol: symbol.toUpperCase(),
        current: quote.c,
        change: quote.d,
        percentChange: quote.dp,
        high: quote.h,
        low: quote.l,
        open: quote.o,
        previousClose: quote.pc,
        timestamp: quote.t
      }
    });
  } catch (error) {
    logger.error(`Error getting quote for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch quote data'
    });
  }
};

const getCandles = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { 
      resolution = 'D', 
      from = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 days ago
      to = Math.floor(Date.now() / 1000)
    } = req.query;

    const candles = await finnhubService.getCandles(
      symbol.toUpperCase(), 
      resolution, 
      from, 
      to
    );

    res.json({
      data: {
        symbol: symbol.toUpperCase(),
        resolution,
        candles
      }
    });
  } catch (error) {
    logger.error(`Error getting candles for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch candle data'
    });
  }
};

const searchStocks = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required'
      });
    }

    const results = await finnhubService.searchStocks(q);

    res.json({
      data: results.map(stock => ({
        symbol: stock.symbol,
        description: stock.description,
        type: stock.type,
        displaySymbol: stock.displaySymbol
      }))
    });
  } catch (error) {
    logger.error('Error searching stocks:', error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to search stocks'
    });
  }
};

const getNews = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { from, to } = req.query;

    const news = await finnhubService.getNews(symbol?.toUpperCase(), from, to);

    res.json({
      data: news.slice(0, 50).map(article => ({
        id: article.id,
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        datetime: article.datetime,
        image: article.image,
        related: article.related
      }))
    });
  } catch (error) {
    logger.error('Error fetching news:', error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch news'
    });
  }
};

const getCompanyProfile = async (req, res, next) => {
  try {
    const { symbol } = req.params;

    const profile = await finnhubService.getCompanyProfile(symbol.toUpperCase());

    if (!profile || Object.keys(profile).length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company profile not found'
      });
    }

    res.json({
      data: {
        symbol: profile.ticker,
        name: profile.name,
        country: profile.country,
        currency: profile.currency,
        exchange: profile.exchange,
        industry: profile.finnhubIndustry,
        logo: profile.logo,
        marketCap: profile.marketCapitalization,
        shareOutstanding: profile.shareOutstanding,
        weburl: profile.weburl,
        phone: profile.phone,
        ipo: profile.ipo
      }
    });
  } catch (error) {
    logger.error(`Error getting profile for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch company profile'
    });
  }
};

const getTechnicalIndicators = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    
    // Get current quote for basic calculations
    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    
    // Get recent candles for moving averages
    const to = Math.floor(Date.now() / 1000);
    const from = to - 200 * 24 * 60 * 60; // 200 days
    
    const candles = await finnhubService.getCandles(
      symbol.toUpperCase(),
      'D',
      from,
      to
    );

    if (!candles || candles.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No data available for technical analysis'
      });
    }

    // Calculate simple moving averages
    const prices = candles.map(c => c.close);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    
    // Calculate RSI
    const rsi = calculateRSI(prices, 14);
    
    // Determine trend
    const currentPrice = quote.c;
    const trend = currentPrice > sma50 && sma50 > sma200 ? 'BULLISH' : 
                  currentPrice < sma50 && sma50 < sma200 ? 'BEARISH' : 'NEUTRAL';

    res.json({
      data: {
        symbol: symbol.toUpperCase(),
        currentPrice,
        sma50,
        sma200,
        rsi,
        trend,
        volume: candles[candles.length - 1]?.volume || 0,
        priceChange24h: quote.d,
        percentChange24h: quote.dp
      }
    });
  } catch (error) {
    logger.error(`Error calculating indicators for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to calculate technical indicators'
    });
  }
};

// Helper functions
function calculateSMA(prices, period) {
  if (prices.length < period) return null;
  
  const relevantPrices = prices.slice(-period);
  const sum = relevantPrices.reduce((a, b) => a + b, 0);
  return Number((sum / period).toFixed(2));
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = prices.length - period; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference > 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Number(rsi.toFixed(2));
}

module.exports = {
  getQuote,
  getCandles,
  searchStocks,
  getNews,
  getCompanyProfile,
  getTechnicalIndicators
};