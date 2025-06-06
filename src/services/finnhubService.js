import axios from 'axios';
import NodeCache from 'node-cache';
import logger from '../utils/logger.ts';

class FinnhubService {
  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY;
    this.baseURL = 'https://finnhub.io/api/v1';
    this.cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 }); // 5 minutes default
    
    this.client = axios.create({
      baseURL: this.baseURL,
      params: {
        token: this.apiKey
      }
    });
  }

  async quote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/quote', {
        params: { symbol }
      });
      
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      logger.error('Error fetching quote:', error);
      throw error;
    }
  }

  async getQuote(symbol) {
    return this.quote(symbol);
  }

  async getCandles(symbol, resolution, from, to) {
    const cacheKey = `candles_${symbol}_${resolution}_${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/stock/candle', {
        params: { symbol, resolution, from, to }
      });
      
      if (response.data.s === 'ok') {
        const candles = this.formatCandles(response.data);
        this.cache.set(cacheKey, candles);
        return candles;
      }
      
      return [];
    } catch (error) {
      logger.error('Error fetching candles:', error);
      throw error;
    }
  }

  async searchStocks(query) {
    try {
      const response = await this.client.get('/search', {
        params: { q: query }
      });
      
      return response.data.result || [];
    } catch (error) {
      logger.error('Error searching stocks:', error);
      throw error;
    }
  }

  async getCompanyProfile(symbol) {
    const cacheKey = `profile_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/stock/profile2', {
        params: { symbol }
      });
      
      this.cache.set(cacheKey, response.data, 86400); // Cache for 24 hours
      return response.data;
    } catch (error) {
      logger.error('Error fetching company profile:', error);
      throw error;
    }
  }

  async getNews(symbol = null, from = null, to = null) {
    try {
      const endpoint = symbol ? '/company-news' : '/news';
      const params = symbol 
        ? { symbol, from: from || this.getDateString(-7), to: to || this.getDateString() }
        : { category: 'general' };
      
      const response = await this.client.get(endpoint, { params });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching news:', error);
      throw error;
    }
  }

  async getTechnicalIndicator(symbol, indicator, resolution, from, to, params = {}) {
    const cacheKey = `indicator_${symbol}_${indicator}_${resolution}_${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(`/indicator`, {
        params: {
          symbol,
          indicator,
          resolution,
          from,
          to,
          ...params
        }
      });
      
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching ${indicator} indicator:`, error);
      throw error;
    }
  }

  async getMarketStatus() {
    try {
      const response = await this.client.get('/stock/market-status', {
        params: { exchange: 'US' }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching market status:', error);
      throw error;
    }
  }

  async getEarningsCalendar(from = null, to = null) {
    try {
      const response = await this.client.get('/calendar/earnings', {
        params: {
          from: from || this.getDateString(),
          to: to || this.getDateString(7)
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching earnings calendar:', error);
      throw error;
    }
  }

  async getRecommendationTrends(symbol) {
    const cacheKey = `recommendations_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/stock/recommendation', {
        params: { symbol }
      });
      
      this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
      return response.data;
    } catch (error) {
      logger.error('Error fetching recommendation trends:', error);
      throw error;
    }
  }

  formatCandles(data) {
    const candles = [];
    
    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        timestamp: data.t[i],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      });
    }
    
    return candles;
  }

  getDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }
}

const finnhubService = new FinnhubService();

export const getFinnhubClient = () => finnhubService;
export default finnhubService;