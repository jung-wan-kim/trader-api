const authValidators = require('../../src/validators/auth');
const marketValidators = require('../../src/validators/market');
const portfolioValidators = require('../../src/validators/portfolio');
const recommendationValidators = require('../../src/validators/recommendation');

describe('Validators', () => {
  describe('Auth Validators', () => {
    describe('registerSchema', () => {
      it('should validate correct registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'StrongP@ss123',
          name: 'Test User'
        };

        const result = authValidators.registerSchema.validate(validData);
        expect(result.error).toBeUndefined();
        expect(result.value).toEqual(validData);
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'StrongP@ss123',
          name: 'Test User'
        };

        const result = authValidators.registerSchema.validate(invalidData);
        expect(result.error).toBeDefined();
        expect(result.error.details[0].path).toContain('email');
      });

      it('should reject weak password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        };

        const result = authValidators.registerSchema.validate(invalidData);
        expect(result.error).toBeDefined();
        expect(result.error.details[0].path).toContain('password');
      });
    });

    describe('loginSchema', () => {
      it('should validate correct login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const result = authValidators.loginSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should require email and password', () => {
        const result = authValidators.loginSchema.validate({});
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Market Validators', () => {
    describe('quoteSchema', () => {
      it('should validate correct symbol', () => {
        const result = marketValidators.quoteSchema.validate({ symbol: 'AAPL' });
        expect(result.error).toBeUndefined();
      });

      it('should reject empty symbol', () => {
        const result = marketValidators.quoteSchema.validate({ symbol: '' });
        expect(result.error).toBeDefined();
      });

      it('should convert symbol to uppercase', () => {
        const result = marketValidators.quoteSchema.validate({ symbol: 'aapl' });
        expect(result.error).toBeUndefined();
        expect(result.value.symbol).toBe('AAPL');
      });
    });

    describe('candlesSchema', () => {
      it('should validate correct candles parameters', () => {
        const validData = {
          symbol: 'AAPL',
          resolution: 'D',
          from: 1640995200,
          to: 1641081600
        };

        const result = marketValidators.candlesSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should validate resolution enum', () => {
        const invalidData = {
          symbol: 'AAPL',
          resolution: 'X',
          from: 1640995200,
          to: 1641081600
        };

        const result = marketValidators.candlesSchema.validate(invalidData);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Portfolio Validators', () => {
    describe('createPortfolioSchema', () => {
      it('should validate correct portfolio data', () => {
        const validData = {
          name: 'My Portfolio',
          description: 'Test portfolio',
          initial_balance: 10000
        };

        const result = portfolioValidators.createPortfolioSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should reject negative initial balance', () => {
        const invalidData = {
          name: 'My Portfolio',
          initial_balance: -1000
        };

        const result = portfolioValidators.createPortfolioSchema.validate(invalidData);
        expect(result.error).toBeDefined();
      });

      it('should allow optional description', () => {
        const validData = {
          name: 'My Portfolio',
          initial_balance: 10000
        };

        const result = portfolioValidators.createPortfolioSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });
    });

    describe('transactionSchema', () => {
      it('should validate buy transaction', () => {
        const validData = {
          portfolio_id: '123e4567-e89b-12d3-a456-426614174000',
          symbol: 'AAPL',
          type: 'buy',
          quantity: 10,
          price: 150
        };

        const result = portfolioValidators.transactionSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should validate sell transaction', () => {
        const validData = {
          portfolio_id: '123e4567-e89b-12d3-a456-426614174000',
          symbol: 'AAPL',
          type: 'sell',
          quantity: 5,
          price: 155
        };

        const result = portfolioValidators.transactionSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should reject invalid transaction type', () => {
        const invalidData = {
          portfolio_id: '123e4567-e89b-12d3-a456-426614174000',
          symbol: 'AAPL',
          type: 'hold',
          quantity: 10,
          price: 150
        };

        const result = portfolioValidators.transactionSchema.validate(invalidData);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Recommendation Validators', () => {
    describe('getRecommendationsSchema', () => {
      it('should validate with default values', () => {
        const result = recommendationValidators.getRecommendationsSchema.validate({});
        expect(result.error).toBeUndefined();
        expect(result.value.limit).toBe(10);
      });

      it('should validate custom limit and offset', () => {
        const validData = {
          limit: 20,
          offset: 5
        };

        const result = recommendationValidators.getRecommendationsSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should reject limit over 100', () => {
        const invalidData = {
          limit: 150
        };

        const result = recommendationValidators.getRecommendationsSchema.validate(invalidData);
        expect(result.error).toBeDefined();
      });
    });

    describe('applyRecommendationSchema', () => {
      it('should validate apply recommendation data', () => {
        const validData = {
          recommendation_id: '123e4567-e89b-12d3-a456-426614174000',
          portfolio_id: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 10
        };

        const result = recommendationValidators.applyRecommendationSchema.validate(validData);
        expect(result.error).toBeUndefined();
      });

      it('should reject zero quantity', () => {
        const invalidData = {
          recommendation_id: '123e4567-e89b-12d3-a456-426614174000',
          portfolio_id: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 0
        };

        const result = recommendationValidators.applyRecommendationSchema.validate(invalidData);
        expect(result.error).toBeDefined();
      });
    });
  });
});