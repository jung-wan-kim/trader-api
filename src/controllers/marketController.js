const finnhubService = require('../services/finnhubService.js');
const { supabaseAdmin } = require('../config/supabase.js');
const logger = require('../utils/logger.js');

// Get real-time quote
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

// Get candlestick data
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

// Search stocks
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

// Get news
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

// Get company profile
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

// Get technical indicators
const getTechnicalIndicators = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { period = '1Y' } = req.query;
    
    // Get current quote
    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    
    // Calculate time range based on period
    const to = Math.floor(Date.now() / 1000);
    let from;
    switch (period) {
      case '1M': from = to - 30 * 24 * 60 * 60; break;
      case '3M': from = to - 90 * 24 * 60 * 60; break;
      case '6M': from = to - 180 * 24 * 60 * 60; break;
      case '1Y': from = to - 365 * 24 * 60 * 60; break;
      default: from = to - 365 * 24 * 60 * 60;
    }
    
    // Get daily candles
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

    // Calculate indicators
    const prices = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    // Basic indicators
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    // RSI
    const rsi = calculateRSI(prices, 14);
    
    // MACD
    const macd = ema12 - ema26;
    const signal = calculateEMA([macd], 9);
    
    // Bollinger Bands
    const bb = calculateBollingerBands(prices, 20, 2);
    
    // Williams %R (for Larry Williams strategy)
    const williamsR = calculateWilliamsR(highs, lows, prices, 14);
    
    // Volume analysis
    const avgVolume = calculateSMA(volumes, 20);
    const volumeRatio = volumes[volumes.length - 1] / avgVolume;
    
    // Pivot points (for Jesse Livermore strategy)
    const pivotPoints = calculatePivotPoints(
      candles[candles.length - 1].high,
      candles[candles.length - 1].low,
      candles[candles.length - 1].close
    );
    
    // Stage analysis (for Stan Weinstein strategy)
    const stage = determineStage(prices, sma30 = calculateSMA(prices, 30));
    
    // Trend determination
    const currentPrice = quote.c;
    const trend = determineTrend(currentPrice, sma20, sma50, sma200);

    res.json({
      data: {
        symbol: symbol.toUpperCase(),
        currentPrice,
        indicators: {
          sma: { sma20, sma50, sma200 },
          ema: { ema12, ema26 },
          rsi,
          macd: { value: macd, signal, histogram: macd - signal },
          bollingerBands: bb,
          williamsR,
          volumeAnalysis: {
            currentVolume: volumes[volumes.length - 1],
            avgVolume,
            volumeRatio,
            volumeTrend: volumeRatio > 1.5 ? 'HIGH' : volumeRatio < 0.5 ? 'LOW' : 'NORMAL'
          },
          pivotPoints,
          stage,
          trend
        },
        strategySignals: {
          jesseLivermore: analyzeJesseLivermore(currentPrice, prices, volumes, pivotPoints),
          larryWilliams: analyzeLarryWilliams(currentPrice, candles, williamsR),
          stanWeinstein: analyzeStanWeinstein(currentPrice, prices, volumes, stage, sma30)
        }
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

// Get market sentiment
const getMarketSentiment = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    
    // Get recommendation trends from Finnhub
    const recommendations = await finnhubService.getRecommendationTrends(symbol.toUpperCase());
    
    // Get recent news for sentiment
    const news = await finnhubService.getNews(symbol.toUpperCase());
    
    // Calculate aggregate sentiment
    let sentiment = 'NEUTRAL';
    if (recommendations && recommendations.length > 0) {
      const latest = recommendations[0];
      const bullishScore = latest.strongBuy + latest.buy;
      const bearishScore = latest.strongSell + latest.sell;
      
      if (bullishScore > bearishScore * 1.5) sentiment = 'BULLISH';
      else if (bearishScore > bullishScore * 1.5) sentiment = 'BEARISH';
    }
    
    res.json({
      data: {
        symbol: symbol.toUpperCase(),
        sentiment,
        recommendations: recommendations?.[0] || null,
        newsCount: news.length,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error getting sentiment for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch market sentiment'
    });
  }
};

// Get earnings calendar
const getEarningsCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    
    const earnings = await finnhubService.getEarningsCalendar(from, to);
    
    res.json({
      data: earnings.earningsCalendar || []
    });
  } catch (error) {
    logger.error('Error fetching earnings calendar:', error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch earnings calendar'
    });
  }
};

// Get market status
const getMarketStatus = async (req, res, next) => {
  try {
    const status = await finnhubService.getMarketStatus();
    
    res.json({
      data: status
    });
  } catch (error) {
    logger.error('Error fetching market status:', error);
    res.status(500).json({
      error: 'Market Data Error',
      message: 'Failed to fetch market status'
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

function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return Number(ema.toFixed(2));
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

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const sma = calculateSMA(prices, period);
  if (!sma) return null;
  
  const relevantPrices = prices.slice(-period);
  const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: Number((sma + stdDev * standardDeviation).toFixed(2)),
    middle: sma,
    lower: Number((sma - stdDev * standardDeviation).toFixed(2))
  };
}

function calculateWilliamsR(highs, lows, closes, period = 14) {
  if (highs.length < period) return null;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const currentClose = closes[closes.length - 1];
  
  const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  
  return Number(williamsR.toFixed(2));
}

function calculatePivotPoints(high, low, close) {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  
  return {
    pivot: Number(pivot.toFixed(2)),
    resistance1: Number(r1.toFixed(2)),
    resistance2: Number(r2.toFixed(2)),
    support1: Number(s1.toFixed(2)),
    support2: Number(s2.toFixed(2))
  };
}

function determineStage(prices, sma30) {
  if (!sma30 || prices.length < 30) return 'UNKNOWN';
  
  const currentPrice = prices[prices.length - 1];
  const priceAboveSMA = currentPrice > sma30;
  const smaSlope = sma30 - calculateSMA(prices.slice(0, -5), 30);
  
  if (priceAboveSMA && smaSlope > 0) return 'STAGE_2'; // Advancing
  if (!priceAboveSMA && smaSlope > 0) return 'STAGE_1'; // Basing
  if (!priceAboveSMA && smaSlope < 0) return 'STAGE_4'; // Declining
  if (priceAboveSMA && smaSlope < 0) return 'STAGE_3'; // Top
  
  return 'STAGE_1';
}

function determineTrend(currentPrice, sma20, sma50, sma200) {
  if (!sma20 || !sma50 || !sma200) return 'NEUTRAL';
  
  if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) return 'STRONG_BULLISH';
  if (currentPrice > sma50 && sma50 > sma200) return 'BULLISH';
  if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) return 'STRONG_BEARISH';
  if (currentPrice < sma50 && sma50 < sma200) return 'BEARISH';
  
  return 'NEUTRAL';
}

// Strategy-specific analysis functions
function analyzeJesseLivermore(currentPrice, prices, volumes, pivotPoints) {
  const isNewHigh = currentPrice >= Math.max(...prices.slice(-20));
  const volumeIncrease = volumes[volumes.length - 1] > calculateSMA(volumes, 20) * 1.5;
  const abovePivot = currentPrice > pivotPoints.pivot;
  
  return {
    signal: isNewHigh && volumeIncrease && abovePivot ? 'BUY' : 'HOLD',
    strength: (isNewHigh ? 33 : 0) + (volumeIncrease ? 33 : 0) + (abovePivot ? 34 : 0),
    conditions: {
      newHigh: isNewHigh,
      volumeIncrease,
      abovePivot
    }
  };
}

function analyzeLarryWilliams(currentPrice, candles, williamsR) {
  const todayRange = candles[candles.length - 1].high - candles[candles.length - 1].low;
  const yesterdayRange = candles[candles.length - 2].high - candles[candles.length - 2].low;
  const volatilityBreakout = todayRange > yesterdayRange * 0.5;
  const oversold = williamsR < -80;
  const overbought = williamsR > -20;
  
  return {
    signal: oversold && volatilityBreakout ? 'BUY' : overbought ? 'SELL' : 'HOLD',
    strength: Math.abs(williamsR),
    conditions: {
      volatilityBreakout,
      oversold,
      overbought
    }
  };
}

function analyzeStanWeinstein(currentPrice, prices, volumes, stage, sma30) {
  const enteringStage2 = stage === 'STAGE_2' && currentPrice > sma30;
  const volumeConfirmation = volumes[volumes.length - 1] > calculateSMA(volumes, 20);
  const relativeStrength = currentPrice / prices[prices.length - 30] > 1.1;
  
  return {
    signal: enteringStage2 && volumeConfirmation && relativeStrength ? 'BUY' : 
           stage === 'STAGE_4' ? 'SELL' : 'HOLD',
    stage,
    strength: stage === 'STAGE_2' ? 100 : stage === 'STAGE_1' ? 50 : 
             stage === 'STAGE_3' ? 25 : 0,
    conditions: {
      enteringStage2,
      volumeConfirmation,
      relativeStrength
    }
  };
}

module.exports = {
  getQuote,
  getCandles,
  searchStocks,
  getNews,
  getCompanyProfile,
  getTechnicalIndicators,
  getMarketSentiment,
  getEarningsCalendar,
  getMarketStatus
};

export default {
  getQuote,
  getCandles,
  searchStocks,
  getNews,
  getCompanyProfile,
  getTechnicalIndicators,
  getMarketSentiment,
  getEarningsCalendar,
  getMarketStatus
};