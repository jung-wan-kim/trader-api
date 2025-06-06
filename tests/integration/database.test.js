describe('Database Transaction Tests', () => {
  let mockSupabase;
  let testData;

  beforeEach(() => {
    cleanupTestData();
    testData = setupTestData();
    
    // Supabase mock 설정
    mockSupabase = require('../../src/config/database.js');
    
    // Mock transaction support
    mockSupabase.supabase = {
      from: jest.fn(),
      rpc: jest.fn()
    };

    // Mock for transaction simulation
    global.mockTransaction = {
      queries: [],
      isCommitted: false,
      isRolledBack: false,
      
      commit: jest.fn(() => {
        global.mockTransaction.isCommitted = true;
        return Promise.resolve();
      }),
      
      rollback: jest.fn(() => {
        global.mockTransaction.isRolledBack = true;
        return Promise.resolve();
      }),

      addQuery: (query) => {
        global.mockTransaction.queries.push(query);
      }
    };
  });

  afterEach(() => {
    cleanupTestData();
    delete global.mockTransaction;
  });

  describe('Portfolio Position Transactions', () => {
    it('포지션 생성 시 원자적 트랜잭션을 수행해야 합니다', async () => {
      const portfolioData = testData.testPortfolio;
      const positionData = {
        symbol: 'AAPL',
        quantity: 10,
        entry_price: 150.00,
        action: 'BUY'
      };

      // Mock successful transaction
      const mockInsertPosition = jest.fn().mockResolvedValue({
        data: { id: 'new-position-id', ...positionData },
        error: null
      });

      const mockUpdatePortfolio = jest.fn().mockResolvedValue({
        data: { ...portfolioData, cash_balance: portfolioData.cash_balance - (positionData.quantity * positionData.entry_price) },
        error: null
      });

      const mockInsertActivity = jest.fn().mockResolvedValue({
        data: { id: 'activity-id' },
        error: null
      });

      mockSupabase.supabase.from.mockImplementation((table) => {
        if (table === 'positions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: mockInsertPosition
              }))
            }))
          };
        } else if (table === 'portfolios') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: mockUpdatePortfolio
                }))
              }))
            }))
          };
        } else if (table === 'trading_activities') {
          return {
            insert: mockInsertActivity
          };
        }
      });

      // 트랜잭션 시뮬레이션
      const result = await simulatePositionCreationTransaction(positionData, portfolioData);

      expect(mockInsertPosition).toHaveBeenCalled();
      expect(mockUpdatePortfolio).toHaveBeenCalled();
      expect(mockInsertActivity).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('포지션 생성 중 오류 발생 시 롤백해야 합니다', async () => {
      const portfolioData = testData.testPortfolio;
      const positionData = {
        symbol: 'AAPL',
        quantity: 10,
        entry_price: 150.00,
        action: 'BUY'
      };

      // Mock failed position insertion
      const mockInsertPosition = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Position insertion failed' }
      });

      mockSupabase.supabase.from.mockImplementation((table) => {
        if (table === 'positions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: mockInsertPosition
              }))
            }))
          };
        }
      });

      const result = await simulatePositionCreationTransaction(positionData, portfolioData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // 트랜잭션이 롤백되어야 함
      expect(global.mockTransaction.isRolledBack).toBe(true);
    });

    it('포지션 마감 시 원자적 트랜잭션을 수행해야 합니다', async () => {
      const positionData = {
        ...testData.testPosition,
        status: 'open'
      };
      const exitPrice = 160.00;

      // Mock successful position close
      const mockClosePosition = jest.fn().mockResolvedValue({
        data: {
          ...positionData,
          status: 'closed',
          exit_price: exitPrice,
          profit_loss: (exitPrice - positionData.entry_price) * positionData.quantity
        },
        error: null
      });

      const mockUpdatePortfolio = jest.fn().mockResolvedValue({
        data: { cash_balance: 5000 },
        error: null
      });

      const mockInsertActivity = jest.fn().mockResolvedValue({
        data: { id: 'activity-id' },
        error: null
      });

      mockSupabase.supabase.from.mockImplementation((table) => {
        if (table === 'positions') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: mockClosePosition
                }))
              }))
            }))
          };
        } else if (table === 'portfolios') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: mockUpdatePortfolio
                }))
              }))
            }))
          };
        } else if (table === 'trading_activities') {
          return {
            insert: mockInsertActivity
          };
        }
      });

      const result = await simulatePositionCloseTransaction(positionData, exitPrice);

      expect(mockClosePosition).toHaveBeenCalled();
      expect(mockUpdatePortfolio).toHaveBeenCalled();
      expect(mockInsertActivity).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('User Registration Transactions', () => {
    it('사용자 등록 시 원자적 트랜잭션을 수행해야 합니다', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        investment_style: 'moderate'
      };

      // Mock successful user creation
      const mockAuthSignUp = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: userData.email },
          session: { access_token: 'token' }
        },
        error: null
      });

      const mockCreateProfile = jest.fn().mockResolvedValue({
        data: { id: 'new-user-id', ...userData },
        error: null
      });

      const mockCreatePortfolio = jest.fn().mockResolvedValue({
        data: { id: 'new-portfolio-id', user_id: 'new-user-id' },
        error: null
      });

      // Mock Supabase auth
      const mockSupabaseAuth = require('../../src/config/supabase.js');
      mockSupabaseAuth.supabase = {
        auth: {
          signUp: mockAuthSignUp
        }
      };

      mockSupabaseAuth.supabaseAdmin = {
        from: jest.fn((table) => {
          if (table === 'profiles') {
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: mockCreateProfile
                }))
              }))
            };
          } else if (table === 'portfolios') {
            return {
              insert: mockCreatePortfolio
            };
          }
        }),
        auth: {
          admin: {
            deleteUser: jest.fn()
          }
        }
      };

      const result = await simulateUserRegistrationTransaction(userData);

      expect(mockAuthSignUp).toHaveBeenCalled();
      expect(mockCreateProfile).toHaveBeenCalled();
      expect(mockCreatePortfolio).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('프로필 생성 실패 시 사용자 인증 데이터를 정리해야 합니다', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        investment_style: 'moderate'
      };

      // Mock successful auth creation but failed profile creation
      const mockAuthSignUp = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: userData.email },
          session: { access_token: 'token' }
        },
        error: null
      });

      const mockCreateProfile = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile creation failed' }
      });

      const mockDeleteUser = jest.fn().mockResolvedValue({ error: null });

      const mockSupabaseAuth = require('../../src/config/supabase.js');
      mockSupabaseAuth.supabase = {
        auth: {
          signUp: mockAuthSignUp
        }
      };

      mockSupabaseAuth.supabaseAdmin = {
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockCreateProfile
            }))
          }))
        })),
        auth: {
          admin: {
            deleteUser: mockDeleteUser
          }
        }
      };

      const result = await simulateUserRegistrationTransaction(userData);

      expect(mockAuthSignUp).toHaveBeenCalled();
      expect(mockCreateProfile).toHaveBeenCalled();
      expect(mockDeleteUser).toHaveBeenCalledWith('new-user-id'); // 정리 작업
      expect(result.success).toBe(false);
    });
  });

  describe('Account Deletion Transactions', () => {
    it('계정 삭제 시 모든 관련 데이터를 안전하게 삭제해야 합니다', async () => {
      const userId = testData.testUser.id;

      // Mock successful deletion operations
      const mockDeletePositions = jest.fn().mockResolvedValue({ error: null });
      const mockDeletePortfolios = jest.fn().mockResolvedValue({ error: null });
      const mockDeleteProfile = jest.fn().mockResolvedValue({ error: null });
      const mockDeleteAuthUser = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.supabase.from.mockImplementation((table) => {
        return {
          delete: jest.fn(() => ({
            eq: jest.fn(() => {
              if (table === 'positions') return mockDeletePositions();
              if (table === 'portfolios') return mockDeletePortfolios();
              if (table === 'profiles') return mockDeleteProfile();
            })
          }))
        };
      });

      const mockSupabaseAuth = require('../../src/config/supabase.js');
      mockSupabaseAuth.supabaseAdmin = {
        ...mockSupabase.supabase,
        auth: {
          admin: {
            deleteUser: mockDeleteAuthUser
          }
        }
      };

      const result = await simulateAccountDeletionTransaction(userId);

      expect(mockDeletePositions).toHaveBeenCalled();
      expect(mockDeletePortfolios).toHaveBeenCalled();
      expect(mockDeleteProfile).toHaveBeenCalled();
      expect(mockDeleteAuthUser).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('데이터 삭제 중 오류 발생 시 적절히 처리해야 합니다', async () => {
      const userId = testData.testUser.id;

      // Mock failed deletion
      const mockDeletePositions = jest.fn().mockResolvedValue({
        error: { message: 'Failed to delete positions' }
      });

      mockSupabase.supabase.from.mockImplementation(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => mockDeletePositions())
        }))
      }));

      const result = await simulateAccountDeletionTransaction(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Concurrent Transaction Handling', () => {
    it('동시 포지션 생성 요청을 올바르게 처리해야 합니다', async () => {
      const portfolioData = { 
        ...testData.testPortfolio, 
        cash_balance: 5000 
      };

      const position1 = {
        symbol: 'AAPL',
        quantity: 10,
        entry_price: 150.00,
        action: 'BUY'
      };

      const position2 = {
        symbol: 'GOOGL',
        quantity: 5,
        entry_price: 200.00,
        action: 'BUY'
      };

      // 첫 번째 요청은 성공, 두 번째는 잔액 부족으로 실패해야 함
      let currentBalance = portfolioData.cash_balance;

      const mockCreatePosition = jest.fn().mockImplementation((data) => {
        const requiredAmount = data.quantity * data.entry_price;
        
        if (currentBalance >= requiredAmount) {
          currentBalance -= requiredAmount;
          return Promise.resolve({
            data: { id: `position-${data.symbol}`, ...data },
            error: null
          });
        } else {
          return Promise.resolve({
            data: null,
            error: { message: 'Insufficient funds' }
          });
        }
      });

      mockSupabase.supabase.from.mockImplementation(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: mockCreatePosition
          }))
        }))
      }));

      // 동시 요청 시뮬레이션
      const results = await Promise.allSettled([
        simulatePositionCreationTransaction(position1, portfolioData),
        simulatePositionCreationTransaction(position2, portfolioData)
      ]);

      // 하나는 성공, 하나는 실패해야 함
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  describe('Database Consistency Checks', () => {
    it('포트폴리오 잔액과 포지션 총합이 일치해야 합니다', async () => {
      const portfolioId = testData.testPortfolio.id;

      // Mock portfolio and positions data
      const mockPortfolio = {
        id: portfolioId,
        initial_capital: 10000,
        cash_balance: 2000,
        current_value: 12000
      };

      const mockPositions = [
        { symbol: 'AAPL', quantity: 10, entry_price: 150, current_price: 155, status: 'open' },
        { symbol: 'GOOGL', quantity: 5, entry_price: 200, current_price: 210, status: 'open' },
        { symbol: 'TSLA', quantity: 8, entry_price: 100, current_price: 90, status: 'closed', exit_price: 95 }
      ];

      mockSupabase.supabase.from.mockImplementation((table) => {
        if (table === 'portfolios') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: mockPortfolio,
                  error: null
                })
              }))
            }))
          };
        } else if (table === 'positions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockPositions,
                error: null
              }))
            }))
          };
        }
      });

      const consistencyCheck = await validatePortfolioConsistency(portfolioId);
      
      expect(consistencyCheck.isValid).toBe(true);
      expect(consistencyCheck.calculatedValue).toBeCloseTo(
        mockPortfolio.cash_balance + 
        (mockPositions[0].current_price * mockPositions[0].quantity) +
        (mockPositions[1].current_price * mockPositions[1].quantity)
      );
    });
  });

  // Helper functions for transaction simulation
  async function simulatePositionCreationTransaction(positionData, portfolioData) {
    try {
      global.mockTransaction.addQuery('BEGIN');

      // 1. 포지션 생성
      const positionResult = await mockSupabase.supabase
        .from('positions')
        .insert(positionData)
        .select()
        .single();

      if (positionResult.error) {
        throw new Error(positionResult.error.message);
      }

      global.mockTransaction.addQuery(`INSERT INTO positions`);

      // 2. 포트폴리오 잔액 업데이트
      const newBalance = portfolioData.cash_balance - (positionData.quantity * positionData.entry_price);
      const portfolioResult = await mockSupabase.supabase
        .from('portfolios')
        .update({ cash_balance: newBalance })
        .eq('id', portfolioData.id)
        .select()
        .single();

      if (portfolioResult.error) {
        throw new Error(portfolioResult.error.message);
      }

      global.mockTransaction.addQuery(`UPDATE portfolios`);

      // 3. 거래 활동 기록
      const activityResult = await mockSupabase.supabase
        .from('trading_activities')
        .insert({
          action: 'OPEN_POSITION',
          position_id: positionResult.data.id
        });

      if (activityResult.error) {
        throw new Error(activityResult.error.message);
      }

      global.mockTransaction.addQuery(`INSERT INTO trading_activities`);

      await global.mockTransaction.commit();
      global.mockTransaction.addQuery('COMMIT');

      return { success: true, data: positionResult.data };
    } catch (error) {
      await global.mockTransaction.rollback();
      global.mockTransaction.addQuery('ROLLBACK');
      return { success: false, error: error.message };
    }
  }

  async function simulatePositionCloseTransaction(positionData, exitPrice) {
    try {
      global.mockTransaction.addQuery('BEGIN');

      const profitLoss = (exitPrice - positionData.entry_price) * positionData.quantity;

      // 1. 포지션 종료
      const positionResult = await mockSupabase.supabase
        .from('positions')
        .update({
          status: 'closed',
          exit_price: exitPrice,
          profit_loss: profitLoss
        })
        .eq('id', positionData.id)
        .select()
        .single();

      if (positionResult.error) {
        throw new Error(positionResult.error.message);
      }

      // 2. 포트폴리오 업데이트
      const portfolioResult = await mockSupabase.supabase
        .from('portfolios')
        .update({
          cash_balance: 5000, // Mock value
          realized_profit_loss: profitLoss
        })
        .eq('id', positionData.portfolio_id)
        .select()
        .single();

      if (portfolioResult.error) {
        throw new Error(portfolioResult.error.message);
      }

      // 3. 거래 활동 기록
      await mockSupabase.supabase
        .from('trading_activities')
        .insert({
          action: 'CLOSE_POSITION',
          position_id: positionData.id
        });

      await global.mockTransaction.commit();
      return { success: true };
    } catch (error) {
      await global.mockTransaction.rollback();
      return { success: false, error: error.message };
    }
  }

  async function simulateUserRegistrationTransaction(userData) {
    try {
      const mockSupabaseAuth = require('../../src/config/supabase.js');
      
      // 1. 사용자 인증 생성
      const authResult = await mockSupabaseAuth.supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });

      if (authResult.error) {
        throw new Error(authResult.error.message);
      }

      const userId = authResult.data.user.id;

      // 2. 프로필 생성
      const profileResult = await mockSupabaseAuth.supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: userData.email,
          name: userData.name,
          investment_style: userData.investment_style
        })
        .select()
        .single();

      if (profileResult.error) {
        // 프로필 생성 실패 시 인증 사용자 삭제
        await mockSupabaseAuth.supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(profileResult.error.message);
      }

      // 3. 기본 포트폴리오 생성
      const portfolioResult = await mockSupabaseAuth.supabaseAdmin
        .from('portfolios')
        .insert({
          user_id: userId,
          name: 'Main Portfolio',
          initial_capital: 10000,
          current_value: 10000
        });

      if (portfolioResult.error) {
        // 포트폴리오 생성 실패 시 정리
        await mockSupabaseAuth.supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(portfolioResult.error.message);
      }

      return { success: true, user: authResult.data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function simulateAccountDeletionTransaction(userId) {
    try {
      const mockSupabaseAuth = require('../../src/config/supabase.js');

      // 1. 포지션 삭제
      const positionsResult = await mockSupabase.supabase
        .from('positions')
        .delete()
        .eq('user_id', userId);

      if (positionsResult.error) {
        throw new Error(positionsResult.error.message);
      }

      // 2. 포트폴리오 삭제
      const portfoliosResult = await mockSupabase.supabase
        .from('portfolios')
        .delete()
        .eq('user_id', userId);

      if (portfoliosResult.error) {
        throw new Error(portfoliosResult.error.message);
      }

      // 3. 프로필 삭제
      const profileResult = await mockSupabase.supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileResult.error) {
        throw new Error(profileResult.error.message);
      }

      // 4. 인증 사용자 삭제
      const authResult = await mockSupabaseAuth.supabaseAdmin.auth.admin.deleteUser(userId);

      if (authResult.error) {
        throw new Error(authResult.error.message);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function validatePortfolioConsistency(portfolioId) {
    try {
      const portfolioResult = await mockSupabase.supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

      const positionsResult = await mockSupabase.supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId);

      if (portfolioResult.error || positionsResult.error) {
        return { isValid: false, error: 'Failed to fetch data' };
      }

      const portfolio = portfolioResult.data;
      const positions = positionsResult.data;

      // 열린 포지션의 현재 가치 계산
      const openPositionsValue = positions
        .filter(p => p.status === 'open')
        .reduce((total, p) => total + (p.current_price * p.quantity), 0);

      const calculatedValue = portfolio.cash_balance + openPositionsValue;

      return {
        isValid: Math.abs(calculatedValue - portfolio.current_value) < 0.01,
        calculatedValue,
        recordedValue: portfolio.current_value,
        difference: calculatedValue - portfolio.current_value
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
});