import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';

/// Supabase Trader API Client for Flutter
/// 
/// This client provides a complete interface to interact with the Trader API
/// using Supabase's serverless architecture.
class SupabaseTraderClient {
  late final SupabaseClient _supabase;
  StreamSubscription? _authSubscription;
  
  /// Initialize the Trader API client
  static Future<SupabaseTraderClient> initialize({
    required String supabaseUrl,
    required String supabaseAnonKey,
  }) async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
    
    return SupabaseTraderClient._();
  }
  
  SupabaseTraderClient._() {
    _supabase = Supabase.instance.client;
    _setupAuthListener();
  }
  
  /// Get the current Supabase client instance
  SupabaseClient get client => _supabase;
  
  /// Get the current user
  User? get currentUser => _supabase.auth.currentUser;
  
  /// Check if user is authenticated
  bool get isAuthenticated => currentUser != null;
  
  /// Setup auth state listener
  void _setupAuthListener() {
    _authSubscription = _supabase.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;
      
      print('Auth event: $event');
      if (session != null) {
        print('User logged in: ${session.user.email}');
      }
    });
  }
  
  /// Dispose resources
  void dispose() {
    _authSubscription?.cancel();
  }
  
  // ============================================
  // Authentication Methods
  // ============================================
  
  /// Sign up a new user
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? name,
  }) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {
        if (name != null) 'name': name,
      },
    );
    
    if (response.user != null) {
      // Profile is automatically created via database trigger
      await _refreshProfile();
    }
    
    return response;
  }
  
  /// Sign in an existing user
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    
    if (response.user != null) {
      await _refreshProfile();
    }
    
    return response;
  }
  
  /// Sign out the current user
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
  
  /// Reset password
  Future<void> resetPassword(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }
  
  /// Update user password
  Future<UserResponse> updatePassword(String newPassword) async {
    return await _supabase.auth.updateUser(
      UserAttributes(password: newPassword),
    );
  }
  
  // ============================================
  // Profile Methods
  // ============================================
  
  /// Get user profile
  Future<Map<String, dynamic>?> getProfile() async {
    if (!isAuthenticated) return null;
    
    final response = await _supabase
        .from('profiles')
        .select()
        .eq('id', currentUser!.id)
        .single();
    
    return response;
  }
  
  /// Update user profile
  Future<void> updateProfile({
    String? name,
    String? subscriptionTier,
  }) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    final updates = <String, dynamic>{
      if (name != null) 'name': name,
      if (subscriptionTier != null) 'subscription_tier': subscriptionTier,
      'updated_at': DateTime.now().toIso8601String(),
    };
    
    await _supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser!.id);
  }
  
  /// Refresh profile data
  Future<void> _refreshProfile() async {
    // This can be used to cache profile data locally if needed
    await getProfile();
  }
  
  // ============================================
  // Market Data Methods
  // ============================================
  
  /// Get real-time quote for a symbol
  Future<Map<String, dynamic>> getQuote(String symbol) async {
    final response = await _supabase.functions.invoke(
      'market-data',
      body: {
        'action': 'quote',
        'symbol': symbol,
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  /// Get candle data for a symbol
  Future<Map<String, dynamic>> getCandles(
    String symbol, {
    String resolution = 'D',
    DateTime? from,
    DateTime? to,
  }) async {
    from ??= DateTime.now().subtract(const Duration(days: 30));
    to ??= DateTime.now();
    
    final response = await _supabase.functions.invoke(
      'market-data',
      body: {
        'action': 'candles',
        'symbol': symbol,
        'params': {
          'resolution': resolution,
          'from': from.millisecondsSinceEpoch ~/ 1000,
          'to': to.millisecondsSinceEpoch ~/ 1000,
        },
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  /// Get company news
  Future<Map<String, dynamic>> getNews(String symbol) async {
    final response = await _supabase.functions.invoke(
      'market-data',
      body: {
        'action': 'news',
        'symbol': symbol,
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  /// Get technical indicators
  Future<Map<String, dynamic>> getIndicators(
    String symbol, {
    String indicator = 'sma',
    int period = 20,
  }) async {
    final response = await _supabase.functions.invoke(
      'market-data',
      body: {
        'action': 'indicators',
        'symbol': symbol,
        'params': {
          'indicator': indicator,
          'period': period,
        },
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  // ============================================
  // Trading Strategy Methods
  // ============================================
  
  /// Get all available strategies
  Future<List<Map<String, dynamic>>> getStrategies() async {
    final response = await _supabase
        .from('trading_strategies')
        .select()
        .eq('is_active', true)
        .order('name');
    
    return List<Map<String, dynamic>>.from(response);
  }
  
  /// Subscribe to a strategy
  Future<void> subscribeToStrategy(String strategyId) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    await _supabase.from('user_strategy_subscriptions').upsert({
      'user_id': currentUser!.id,
      'strategy_id': strategyId,
      'is_active': true,
      'subscribed_at': DateTime.now().toIso8601String(),
    });
  }
  
  /// Unsubscribe from a strategy
  Future<void> unsubscribeFromStrategy(String strategyId) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    await _supabase
        .from('user_strategy_subscriptions')
        .update({'is_active': false})
        .eq('user_id', currentUser!.id)
        .eq('strategy_id', strategyId);
  }
  
  /// Get trading signals for a strategy
  Future<Map<String, dynamic>> getTradingSignals(
    String symbol,
    String strategy, {
    String timeframe = 'D',
  }) async {
    final response = await _supabase.functions.invoke(
      'trading-signals',
      body: {
        'symbol': symbol,
        'strategy': strategy,
        'timeframe': timeframe,
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  // ============================================
  // Portfolio Methods
  // ============================================
  
  /// Get all portfolios for current user
  Future<List<Map<String, dynamic>>> getPortfolios() async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    final response = await _supabase
        .from('portfolios')
        .select()
        .eq('user_id', currentUser!.id)
        .eq('is_active', true)
        .order('created_at');
    
    return List<Map<String, dynamic>>.from(response);
  }
  
  /// Create a new portfolio
  Future<Map<String, dynamic>> createPortfolio({
    required String name,
    String? description,
    double initialCapital = 10000,
    String currency = 'USD',
  }) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    final response = await _supabase
        .from('portfolios')
        .insert({
          'user_id': currentUser!.id,
          'name': name,
          'description': description,
          'initial_capital': initialCapital,
          'currency': currency,
        })
        .select()
        .single();
    
    return response;
  }
  
  /// Get portfolio positions
  Future<List<Map<String, dynamic>>> getPositions(String portfolioId) async {
    final response = await _supabase
        .from('positions')
        .select()
        .eq('portfolio_id', portfolioId)
        .order('opened_at', ascending: false);
    
    return List<Map<String, dynamic>>.from(response);
  }
  
  /// Create a new position
  Future<Map<String, dynamic>> createPosition({
    required String portfolioId,
    required String symbol,
    required String side,
    required int quantity,
    required double entryPrice,
    double? stopLoss,
    double? takeProfit,
    String? recommendationId,
  }) async {
    final response = await _supabase.functions.invoke(
      'portfolio-management',
      body: {
        'action': 'create_position',
        'portfolioId': portfolioId,
        'data': {
          'symbol': symbol,
          'side': side,
          'quantity': quantity,
          'entry_price': entryPrice,
          'stop_loss': stopLoss,
          'take_profit': takeProfit,
          'recommendation_id': recommendationId,
        },
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  /// Close a position
  Future<Map<String, dynamic>> closePosition(String positionId) async {
    final response = await _supabase.functions.invoke(
      'portfolio-management',
      body: {
        'action': 'close_position',
        'positionId': positionId,
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  /// Get portfolio performance
  Future<Map<String, dynamic>> getPortfolioPerformance(String portfolioId) async {
    final response = await _supabase.functions.invoke(
      'portfolio-management',
      body: {
        'action': 'calculate_performance',
        'portfolioId': portfolioId,
      },
    );
    
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    
    return response.data as Map<String, dynamic>;
  }
  
  // ============================================
  // Recommendation Methods
  // ============================================
  
  /// Get recommendations for subscribed strategies
  Future<List<Map<String, dynamic>>> getRecommendations({
    bool activeOnly = true,
  }) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    var query = _supabase
        .from('recommendations')
        .select('*, trading_strategies(name, type)')
        .order('created_at', ascending: false);
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    final response = await query;
    
    return List<Map<String, dynamic>>.from(response);
  }
  
  /// Follow a recommendation (create position)
  Future<Map<String, dynamic>> followRecommendation(
    String recommendationId,
    String portfolioId,
  ) async {
    // Get recommendation details
    final recommendation = await _supabase
        .from('recommendations')
        .select()
        .eq('id', recommendationId)
        .single();
    
    // Create position based on recommendation
    return await createPosition(
      portfolioId: portfolioId,
      symbol: recommendation['symbol'],
      side: recommendation['action'] == 'buy' ? 'long' : 'short',
      quantity: 100, // Default quantity, should be calculated based on risk
      entryPrice: recommendation['entry_price'],
      stopLoss: recommendation['stop_loss'],
      takeProfit: recommendation['target_price'],
      recommendationId: recommendationId,
    );
  }
  
  // ============================================
  // Real-time Subscriptions
  // ============================================
  
  /// Subscribe to real-time recommendations
  RealtimeChannel subscribeToRecommendations({
    required void Function(Map<String, dynamic>) onNewRecommendation,
  }) {
    return _supabase
        .channel('recommendations')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'recommendations',
          callback: (payload) {
            onNewRecommendation(payload.newRecord);
          },
        )
        .subscribe();
  }
  
  /// Subscribe to portfolio updates
  RealtimeChannel subscribeToPortfolio(
    String portfolioId, {
    required void Function(Map<String, dynamic>) onPositionUpdate,
  }) {
    return _supabase
        .channel('portfolio_$portfolioId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'positions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'portfolio_id',
            value: portfolioId,
          ),
          callback: (payload) {
            onPositionUpdate(payload.newRecord ?? payload.oldRecord);
          },
        )
        .subscribe();
  }
  
  // ============================================
  // Activity Logging
  // ============================================
  
  /// Get user activity logs
  Future<List<Map<String, dynamic>>> getActivityLogs({
    int limit = 50,
  }) async {
    if (!isAuthenticated) throw Exception('Not authenticated');
    
    final response = await _supabase
        .from('activity_logs')
        .select()
        .eq('user_id', currentUser!.id)
        .order('created_at', ascending: false)
        .limit(limit);
    
    return List<Map<String, dynamic>>.from(response);
  }
}