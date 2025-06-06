# 📱 Flutter 앱 API 연동 가이드

## 🚀 빠른 시작

### 1. 패키지 설치

**pubspec.yaml**:
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.3.0
  http: ^1.1.0
  intl: ^0.18.1
  provider: ^6.0.5
  fl_chart: ^0.63.0  # 차트용 (선택사항)
```

### 2. Supabase 초기화

**lib/main.dart**:
```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Supabase 초기화
  await Supabase.initialize(
    url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE',
  );
  
  runApp(const MyApp());
}

// 전역 Supabase 클라이언트
final supabase = Supabase.instance.client;
```

## 📊 API 서비스 클래스

### 1. Market Data Service

**lib/services/market_service.dart**:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class MarketService {
  final SupabaseClient _client;
  
  MarketService(this._client);
  
  /// 실시간 주식 시세 조회
  Future<StockQuote> getQuote(String symbol) async {
    try {
      final response = await _client.functions.invoke(
        'market-data',
        body: {
          'action': 'quote',
          'symbol': symbol.toUpperCase(),
        },
      );
      
      if (response.data == null) {
        throw Exception('No data received');
      }
      
      final data = response.data['data'];
      return StockQuote.fromJson(data);
    } catch (e) {
      throw Exception('Failed to fetch quote: $e');
    }
  }
  
  /// 회사 정보 조회
  Future<CompanyProfile> getCompanyProfile(String symbol) async {
    try {
      final response = await _client.functions.invoke(
        'market-data',
        body: {
          'action': 'profile',
          'symbol': symbol.toUpperCase(),
        },
      );
      
      if (response.data == null) {
        throw Exception('No data received');
      }
      
      final data = response.data['data'];
      return CompanyProfile.fromJson(data);
    } catch (e) {
      throw Exception('Failed to fetch profile: $e');
    }
  }
  
  /// 여러 종목 시세 한번에 조회
  Future<List<StockQuote>> getMultipleQuotes(List<String> symbols) async {
    final quotes = <StockQuote>[];
    
    // 병렬 처리로 성능 향상
    await Future.wait(
      symbols.map((symbol) async {
        try {
          final quote = await getQuote(symbol);
          quotes.add(quote);
        } catch (e) {
          print('Error fetching $symbol: $e');
        }
      }),
    );
    
    return quotes;
  }
}

// 데이터 모델
class StockQuote {
  final String symbol;
  final double currentPrice;
  final double change;
  final double changePercent;
  final double high;
  final double low;
  final double open;
  final double previousClose;
  final int timestamp;
  
  StockQuote({
    required this.symbol,
    required this.currentPrice,
    required this.change,
    required this.changePercent,
    required this.high,
    required this.low,
    required this.open,
    required this.previousClose,
    required this.timestamp,
  });
  
  factory StockQuote.fromJson(Map<String, dynamic> json, [String? symbol]) {
    return StockQuote(
      symbol: symbol ?? '',
      currentPrice: (json['c'] ?? 0).toDouble(),
      change: (json['d'] ?? 0).toDouble(),
      changePercent: (json['dp'] ?? 0).toDouble(),
      high: (json['h'] ?? 0).toDouble(),
      low: (json['l'] ?? 0).toDouble(),
      open: (json['o'] ?? 0).toDouble(),
      previousClose: (json['pc'] ?? 0).toDouble(),
      timestamp: json['t'] ?? 0,
    );
  }
  
  bool get isPositive => change >= 0;
  
  String get formattedPrice => '\$${currentPrice.toStringAsFixed(2)}';
  String get formattedChange => '${isPositive ? '+' : ''}${change.toStringAsFixed(2)}';
  String get formattedChangePercent => '${isPositive ? '+' : ''}${changePercent.toStringAsFixed(2)}%';
}

class CompanyProfile {
  final String ticker;
  final String name;
  final String country;
  final String currency;
  final String exchange;
  final String industry;
  final String logo;
  final String weburl;
  final double marketCap;
  
  CompanyProfile({
    required this.ticker,
    required this.name,
    required this.country,
    required this.currency,
    required this.exchange,
    required this.industry,
    required this.logo,
    required this.weburl,
    required this.marketCap,
  });
  
  factory CompanyProfile.fromJson(Map<String, dynamic> json) {
    return CompanyProfile(
      ticker: json['ticker'] ?? '',
      name: json['name'] ?? '',
      country: json['country'] ?? '',
      currency: json['currency'] ?? 'USD',
      exchange: json['exchange'] ?? '',
      industry: json['finnhubIndustry'] ?? '',
      logo: json['logo'] ?? '',
      weburl: json['weburl'] ?? '',
      marketCap: (json['marketCapitalization'] ?? 0).toDouble(),
    );
  }
  
  String get formattedMarketCap {
    if (marketCap >= 1000000) {
      return '\$${(marketCap / 1000000).toStringAsFixed(2)}T';
    } else if (marketCap >= 1000) {
      return '\$${(marketCap / 1000).toStringAsFixed(2)}B';
    }
    return '\$${marketCap.toStringAsFixed(2)}M';
  }
}
```

### 2. Trading Signals Service

**lib/services/trading_service.dart**:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class TradingService {
  final SupabaseClient _client;
  
  TradingService(this._client);
  
  /// 트레이딩 신호 조회
  Future<TradingSignal> getSignal({
    required String symbol,
    required TradingStrategy strategy,
    String timeframe = 'D',
  }) async {
    try {
      final response = await _client.functions.invoke(
        'trading-signals',
        body: {
          'symbol': symbol.toUpperCase(),
          'strategy': strategy.value,
          'timeframe': timeframe,
        },
      );
      
      if (response.data == null) {
        throw Exception('No signal received');
      }
      
      final signalData = response.data['signal'];
      return TradingSignal.fromJson(signalData);
    } catch (e) {
      throw Exception('Failed to fetch signal: $e');
    }
  }
  
  /// 여러 종목의 신호 조회
  Future<List<TradingSignal>> getMultipleSignals({
    required List<String> symbols,
    required TradingStrategy strategy,
  }) async {
    final signals = <TradingSignal>[];
    
    await Future.wait(
      symbols.map((symbol) async {
        try {
          final signal = await getSignal(
            symbol: symbol,
            strategy: strategy,
          );
          signals.add(signal..symbol = symbol);
        } catch (e) {
          print('Error fetching signal for $symbol: $e');
        }
      }),
    );
    
    return signals;
  }
}

// 트레이딩 전략 enum
enum TradingStrategy {
  jesseLivermore('jesse_livermore', 'Jesse Livermore - 추세 추종'),
  larryWilliams('larry_williams', 'Larry Williams - 단기 모멘텀'),
  stanWeinstein('stan_weinstein', 'Stan Weinstein - 스테이지 분석');
  
  final String value;
  final String displayName;
  
  const TradingStrategy(this.value, this.displayName);
}

// 트레이딩 신호 모델
class TradingSignal {
  String? symbol;
  final SignalAction action;
  final double confidence;
  final double? entryPrice;
  final double? targetPrice;
  final double? stopLoss;
  final String reasoning;
  final Map<String, dynamic> indicators;
  
  TradingSignal({
    this.symbol,
    required this.action,
    required this.confidence,
    this.entryPrice,
    this.targetPrice,
    this.stopLoss,
    required this.reasoning,
    required this.indicators,
  });
  
  factory TradingSignal.fromJson(Map<String, dynamic> json) {
    return TradingSignal(
      action: SignalAction.fromString(json['action']),
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      entryPrice: json['entry_price']?.toDouble(),
      targetPrice: json['target_price']?.toDouble(),
      stopLoss: json['stop_loss']?.toDouble(),
      reasoning: json['reasoning'] ?? '',
      indicators: json['indicators'] ?? {},
    );
  }
  
  String get confidencePercent => '${(confidence * 100).toStringAsFixed(0)}%';
  
  double? get expectedReturn {
    if (entryPrice != null && targetPrice != null) {
      return ((targetPrice! - entryPrice!) / entryPrice!) * 100;
    }
    return null;
  }
  
  double? get riskPercent {
    if (entryPrice != null && stopLoss != null) {
      return ((entryPrice! - stopLoss!) / entryPrice!) * 100;
    }
    return null;
  }
}

enum SignalAction {
  buy('buy', '매수', Colors.green),
  sell('sell', '매도', Colors.red),
  hold('hold', '보유', Colors.grey);
  
  final String value;
  final String korean;
  final Color color;
  
  const SignalAction(this.value, this.korean, this.color);
  
  static SignalAction fromString(String value) {
    return SignalAction.values.firstWhere(
      (action) => action.value == value,
      orElse: () => SignalAction.hold,
    );
  }
}
```

### 3. Portfolio Service

**lib/services/portfolio_service.dart**:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class PortfolioService {
  final SupabaseClient _client;
  
  PortfolioService(this._client);
  
  /// 포트폴리오 성과 계산
  Future<PortfolioPerformance> calculatePerformance(String portfolioId) async {
    try {
      final response = await _client.functions.invoke(
        'portfolio-management',
        body: {
          'action': 'calculate_performance',
          'portfolioId': portfolioId,
        },
      );
      
      if (response.data == null) {
        throw Exception('No performance data received');
      }
      
      return PortfolioPerformance.fromJson(response.data['performance']);
    } catch (e) {
      throw Exception('Failed to calculate performance: $e');
    }
  }
  
  /// 포트폴리오 목록 조회
  Future<List<Portfolio>> getPortfolios() async {
    try {
      final response = await _client
          .from('portfolios')
          .select()
          .eq('user_id', _client.auth.currentUser!.id)
          .order('created_at', ascending: false);
      
      return (response as List)
          .map((json) => Portfolio.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to fetch portfolios: $e');
    }
  }
  
  /// 새 포트폴리오 생성
  Future<Portfolio> createPortfolio({
    required String name,
    String? description,
    required double initialCapital,
  }) async {
    try {
      final response = await _client
          .from('portfolios')
          .insert({
            'name': name,
            'description': description,
            'initial_capital': initialCapital,
            'currency': 'USD',
            'user_id': _client.auth.currentUser!.id,
          })
          .select()
          .single();
      
      return Portfolio.fromJson(response);
    } catch (e) {
      throw Exception('Failed to create portfolio: $e');
    }
  }
}

// 포트폴리오 모델
class Portfolio {
  final String id;
  final String name;
  final String? description;
  final double initialCapital;
  final String currency;
  final bool isActive;
  final DateTime createdAt;
  
  Portfolio({
    required this.id,
    required this.name,
    this.description,
    required this.initialCapital,
    required this.currency,
    required this.isActive,
    required this.createdAt,
  });
  
  factory Portfolio.fromJson(Map<String, dynamic> json) {
    return Portfolio(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      initialCapital: (json['initial_capital'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'USD',
      isActive: json['is_active'] ?? true,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

// 포트폴리오 성과 모델
class PortfolioPerformance {
  final String portfolioId;
  final double totalValue;
  final double totalReturn;
  final List<Position> positions;
  
  PortfolioPerformance({
    required this.portfolioId,
    required this.totalValue,
    required this.totalReturn,
    required this.positions,
  });
  
  factory PortfolioPerformance.fromJson(Map<String, dynamic> json) {
    return PortfolioPerformance(
      portfolioId: json['portfolioId'],
      totalValue: (json['totalValue'] ?? 0).toDouble(),
      totalReturn: (json['totalReturn'] ?? 0).toDouble(),
      positions: (json['positions'] as List? ?? [])
          .map((p) => Position.fromJson(p))
          .toList(),
    );
  }
  
  String get formattedTotalValue => '\$${totalValue.toStringAsFixed(2)}';
  String get formattedReturn => '${totalReturn >= 0 ? '+' : ''}${totalReturn.toStringAsFixed(2)}%';
}

class Position {
  final String id;
  final String symbol;
  final int quantity;
  final double entryPrice;
  final double? currentPrice;
  final double? exitPrice;
  final String status;
  
  Position({
    required this.id,
    required this.symbol,
    required this.quantity,
    required this.entryPrice,
    this.currentPrice,
    this.exitPrice,
    required this.status,
  });
  
  factory Position.fromJson(Map<String, dynamic> json) {
    return Position(
      id: json['id'],
      symbol: json['symbol'],
      quantity: json['quantity'],
      entryPrice: (json['entry_price'] ?? 0).toDouble(),
      currentPrice: json['currentPrice']?.toDouble(),
      exitPrice: json['exit_price']?.toDouble(),
      status: json['status'] ?? 'open',
    );
  }
  
  double get currentValue => quantity * (currentPrice ?? exitPrice ?? entryPrice);
  double get costBasis => quantity * entryPrice;
  double get profitLoss => currentValue - costBasis;
  double get profitLossPercent => (profitLoss / costBasis) * 100;
}
```

## 🎨 UI 위젯 예시

### 1. 실시간 주가 위젯

**lib/widgets/stock_price_widget.dart**:
```dart
import 'package:flutter/material.dart';
import 'package:trader_app/services/market_service.dart';

class StockPriceWidget extends StatefulWidget {
  final String symbol;
  final MarketService marketService;
  
  const StockPriceWidget({
    Key? key,
    required this.symbol,
    required this.marketService,
  }) : super(key: key);
  
  @override
  _StockPriceWidgetState createState() => _StockPriceWidgetState();
}

class _StockPriceWidgetState extends State<StockPriceWidget> {
  StockQuote? _quote;
  bool _isLoading = true;
  Timer? _refreshTimer;
  
  @override
  void initState() {
    super.initState();
    _loadQuote();
    // 30초마다 자동 새로고침
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _loadQuote(),
    );
  }
  
  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
  
  Future<void> _loadQuote() async {
    try {
      final quote = await widget.marketService.getQuote(widget.symbol);
      if (mounted) {
        setState(() {
          _quote = quote;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error loading quote: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_quote == null) {
      return const Center(child: Text('데이터를 불러올 수 없습니다'));
    }
    
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.symbol,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadQuote,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _quote!.formattedPrice,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _quote!.isPositive ? Colors.green : Colors.red,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _quote!.isPositive
                            ? Icons.arrow_upward
                            : Icons.arrow_downward,
                        color: Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${_quote!.formattedChange} (${_quote!.formattedChangePercent})',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildPriceInfo('고가', '\$${_quote!.high.toStringAsFixed(2)}'),
                _buildPriceInfo('저가', '\$${_quote!.low.toStringAsFixed(2)}'),
                _buildPriceInfo('시가', '\$${_quote!.open.toStringAsFixed(2)}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildPriceInfo(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey,
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ],
    );
  }
}
```

### 2. 트레이딩 신호 카드

**lib/widgets/trading_signal_card.dart**:
```dart
import 'package:flutter/material.dart';
import 'package:trader_app/services/trading_service.dart';

class TradingSignalCard extends StatelessWidget {
  final TradingSignal signal;
  final VoidCallback? onTap;
  
  const TradingSignalCard({
    Key? key,
    required this.signal,
    this.onTap,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    signal.symbol ?? 'Unknown',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  _buildActionChip(context),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                signal.reasoning,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildConfidence(context),
                  if (signal.action != SignalAction.hold)
                    _buildPriceTargets(context),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildActionChip(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: signal.action.color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: signal.action.color),
      ),
      child: Text(
        signal.action.korean,
        style: TextStyle(
          color: signal.action.color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
  
  Widget _buildConfidence(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '신뢰도',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        Text(
          signal.confidencePercent,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
  
  Widget _buildPriceTargets(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (signal.targetPrice != null)
          Text(
            '목표가: \$${signal.targetPrice!.toStringAsFixed(2)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.green,
            ),
          ),
        if (signal.stopLoss != null)
          Text(
            '손절가: \$${signal.stopLoss!.toStringAsFixed(2)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.red,
            ),
          ),
      ],
    );
  }
}
```

## 🚀 사용 예시

### 메인 앱에서 서비스 초기화

**lib/main.dart**:
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/market_service.dart';
import 'services/trading_service.dart';
import 'services/portfolio_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
  );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    
    return MultiProvider(
      providers: [
        Provider(create: (_) => MarketService(supabase)),
        Provider(create: (_) => TradingService(supabase)),
        Provider(create: (_) => PortfolioService(supabase)),
      ],
      child: MaterialApp(
        title: 'Trader App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
```

### 홈 화면에서 사용

**lib/screens/home_screen.dart**:
```dart
class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);
  
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final List<String> _watchlist = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  
  @override
  Widget build(BuildContext context) {
    final marketService = Provider.of<MarketService>(context);
    final tradingService = Provider.of<TradingService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trader App'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 시장 데이터 섹션
          Text(
            '시장 현황',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          ...(_watchlist.map((symbol) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: StockPriceWidget(
              symbol: symbol,
              marketService: marketService,
            ),
          ))),
          
          const SizedBox(height: 24),
          
          // 트레이딩 신호 섹션
          Text(
            '트레이딩 신호',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          FutureBuilder<List<TradingSignal>>(
            future: tradingService.getMultipleSignals(
              symbols: _watchlist,
              strategy: TradingStrategy.jesseLivermore,
            ),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Center(child: Text('신호가 없습니다'));
              }
              
              return Column(
                children: snapshot.data!.map((signal) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: TradingSignalCard(
                    signal: signal,
                    onTap: () {
                      // 상세 화면으로 이동
                    },
                  ),
                )).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
```

## 🧪 테스트 코드

**test/services_test.dart**:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:trader_app/services/market_service.dart';

void main() {
  group('MarketService Tests', () {
    late MarketService marketService;
    
    setUpAll(() async {
      await Supabase.initialize(
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_ANON_KEY',
      );
      marketService = MarketService(Supabase.instance.client);
    });
    
    test('Should fetch stock quote', () async {
      final quote = await marketService.getQuote('AAPL');
      
      expect(quote.symbol, 'AAPL');
      expect(quote.currentPrice, greaterThan(0));
    });
    
    test('Should fetch company profile', () async {
      final profile = await marketService.getCompanyProfile('MSFT');
      
      expect(profile.ticker, 'MSFT');
      expect(profile.name, contains('Microsoft'));
    });
  });
}
```

## 📱 완성된 기능

1. **실시간 주가 조회** ✅
2. **트레이딩 신호 분석** ✅
3. **포트폴리오 관리** ✅
4. **회사 정보 조회** ✅
5. **자동 새로고침** ✅
6. **에러 처리** ✅

## 🔗 API 레퍼런스

### Market Data
- `getQuote(symbol)` - 실시간 시세
- `getCompanyProfile(symbol)` - 회사 정보
- `getMultipleQuotes(symbols)` - 여러 종목 시세

### Trading Signals
- `getSignal(symbol, strategy)` - 개별 신호
- `getMultipleSignals(symbols, strategy)` - 여러 종목 신호

### Portfolio
- `calculatePerformance(portfolioId)` - 성과 계산
- `getPortfolios()` - 포트폴리오 목록
- `createPortfolio(name, capital)` - 새 포트폴리오

## 🎯 다음 단계

1. 차트 구현 (fl_chart 패키지)
2. 실시간 WebSocket 연결
3. 푸시 알림 설정
4. 다크 모드 지원

---
이 가이드를 따라 Flutter 앱에 Trader API를 완벽하게 통합할 수 있습니다! 🚀