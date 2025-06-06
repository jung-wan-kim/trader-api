# 📱 Flutter 앱 나머지 화면 구현 가이드

## 🎯 완료된 화면
- ✅ 로그인/회원가입 화면
- ✅ 시장 데이터 화면 (기본)
- ✅ 주식 상세 화면
- ✅ 프로필 화면 (기본)

## 📋 구현이 필요한 화면

### 1. 트레이딩 신호 목록 화면 (`TradingSignalsScreen`)

```dart
// lib/screens/trading_signals_screen.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TradingSignalsScreen extends StatefulWidget {
  const TradingSignalsScreen({Key? key}) : super(key: key);
  
  @override
  _TradingSignalsScreenState createState() => _TradingSignalsScreenState();
}

class _TradingSignalsScreenState extends State<TradingSignalsScreen> {
  final List<String> _watchlist = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  final Map<String, Map<String, dynamic>> _signals = {};
  bool _isLoading = false;
  String _selectedStrategy = 'jesse_livermore';
  
  @override
  void initState() {
    super.initState();
    _loadAllSignals();
  }
  
  Future<void> _loadAllSignals() async {
    setState(() => _isLoading = true);
    
    try {
      // 모든 종목에 대해 신호 가져오기
      for (String symbol in _watchlist) {
        final response = await supabase.functions.invoke(
          'trading-signals',
          body: {
            'symbol': symbol,
            'strategy': _selectedStrategy,
            'timeframe': 'D',
          },
        );
        
        if (response.data != null) {
          setState(() {
            _signals[symbol] = response.data['signal'];
          });
        }
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('신호 로드 실패: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  Color _getActionColor(String? action) {
    switch (action) {
      case 'buy':
        return Colors.green;
      case 'sell':
        return Colors.red;
      case 'hold':
      default:
        return Colors.grey;
    }
  }
  
  IconData _getActionIcon(String? action) {
    switch (action) {
      case 'buy':
        return Icons.arrow_upward;
      case 'sell':
        return Icons.arrow_downward;
      case 'hold':
      default:
        return Icons.pause;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('트레이딩 신호'),
        actions: [
          PopupMenuButton<String>(
            initialValue: _selectedStrategy,
            onSelected: (value) {
              setState(() {
                _selectedStrategy = value;
                _signals.clear();
              });
              _loadAllSignals();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'jesse_livermore',
                child: Text('Jesse Livermore'),
              ),
              const PopupMenuItem(
                value: 'larry_williams',
                child: Text('Larry Williams'),
              ),
              const PopupMenuItem(
                value: 'stan_weinstein',
                child: Text('Stan Weinstein'),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAllSignals,
              child: ListView.builder(
                itemCount: _watchlist.length,
                itemBuilder: (context, index) {
                  final symbol = _watchlist[index];
                  final signal = _signals[symbol];
                  
                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: ListTile(
                      leading: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _getActionColor(signal?['action'])
                              .withOpacity(0.2),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Icon(
                          _getActionIcon(signal?['action']),
                          color: _getActionColor(signal?['action']),
                        ),
                      ),
                      title: Text(
                        symbol,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      subtitle: signal != null
                          ? Text(
                              '${signal['action']?.toUpperCase() ?? 'HOLD'} • '
                              '신뢰도: ${((signal['confidence'] ?? 0) * 100).toStringAsFixed(0)}%',
                            )
                          : const Text('신호 로딩 중...'),
                      trailing: signal != null && signal['action'] != 'hold'
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '목표: \$${signal['target_price']?.toStringAsFixed(2) ?? 'N/A'}',
                                  style: const TextStyle(
                                    color: Colors.green,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  '손절: \$${signal['stop_loss']?.toStringAsFixed(2) ?? 'N/A'}',
                                  style: const TextStyle(
                                    color: Colors.red,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            )
                          : null,
                      onTap: () {
                        // 상세 신호 다이얼로그 표시
                        _showSignalDetails(symbol, signal);
                      },
                    ),
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // 종목 추가 다이얼로그
          _showAddSymbolDialog();
        },
        child: const Icon(Icons.add),
      ),
    );
  }
  
  void _showSignalDetails(String symbol, Map<String, dynamic>? signal) {
    if (signal == null) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$symbol 신호 상세'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('신호', signal['action']?.toUpperCase() ?? 'HOLD'),
              _buildDetailRow('신뢰도', '${((signal['confidence'] ?? 0) * 100).toStringAsFixed(0)}%'),
              if (signal['entry_price'] != null)
                _buildDetailRow('진입가', '\$${signal['entry_price'].toStringAsFixed(2)}'),
              if (signal['target_price'] != null)
                _buildDetailRow('목표가', '\$${signal['target_price'].toStringAsFixed(2)}'),
              if (signal['stop_loss'] != null)
                _buildDetailRow('손절가', '\$${signal['stop_loss'].toStringAsFixed(2)}'),
              const SizedBox(height: 16),
              const Text('분석 근거:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(signal['reasoning'] ?? '분석 정보 없음'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('닫기'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
  
  void _showAddSymbolDialog() {
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('종목 추가'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: '종목 코드',
            hintText: 'ex) NVDA',
            border: OutlineInputBorder(),
          ),
          textCapitalization: TextCapitalization.characters,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              final symbol = controller.text.trim().toUpperCase();
              if (symbol.isNotEmpty && !_watchlist.contains(symbol)) {
                setState(() {
                  _watchlist.add(symbol);
                });
                Navigator.pop(context);
                _loadSignalForSymbol(symbol);
              }
            },
            child: const Text('추가'),
          ),
        ],
      ),
    );
  }
  
  Future<void> _loadSignalForSymbol(String symbol) async {
    try {
      final response = await supabase.functions.invoke(
        'trading-signals',
        body: {
          'symbol': symbol,
          'strategy': _selectedStrategy,
          'timeframe': 'D',
        },
      );
      
      if (response.data != null) {
        setState(() {
          _signals[symbol] = response.data['signal'];
        });
      }
    } catch (error) {
      print('Error loading signal for $symbol: $error');
    }
  }
}
```

### 2. 포트폴리오 화면 (`PortfolioScreen`)

```dart
// lib/screens/portfolio_screen.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({Key? key}) : super(key: key);
  
  @override
  _PortfolioScreenState createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  List<Map<String, dynamic>> _portfolios = [];
  Map<String, dynamic>? _selectedPortfolio;
  Map<String, dynamic>? _performance;
  bool _isLoading = false;
  
  @override
  void initState() {
    super.initState();
    _loadPortfolios();
  }
  
  Future<void> _loadPortfolios() async {
    setState(() => _isLoading = true);
    
    try {
      final response = await supabase
          .from('portfolios')
          .select()
          .eq('user_id', supabase.auth.currentUser!.id);
      
      setState(() {
        _portfolios = List<Map<String, dynamic>>.from(response);
        if (_portfolios.isNotEmpty && _selectedPortfolio == null) {
          _selectedPortfolio = _portfolios.first;
          _loadPortfolioPerformance(_selectedPortfolio!['id']);
        }
      });
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('포트폴리오 로드 실패: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  Future<void> _loadPortfolioPerformance(String portfolioId) async {
    try {
      final response = await supabase.functions.invoke(
        'portfolio-management',
        body: {
          'action': 'calculate_performance',
          'portfolioId': portfolioId,
        },
      );
      
      if (response.data != null) {
        setState(() {
          _performance = response.data['performance'];
        });
      }
    } catch (error) {
      print('Performance load error: $error');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('포트폴리오'),
        actions: [
          if (_portfolios.isNotEmpty)
            PopupMenuButton<Map<String, dynamic>>(
              initialValue: _selectedPortfolio,
              onSelected: (portfolio) {
                setState(() {
                  _selectedPortfolio = portfolio;
                });
                _loadPortfolioPerformance(portfolio['id']);
              },
              itemBuilder: (context) => _portfolios.map((portfolio) {
                return PopupMenuItem(
                  value: portfolio,
                  child: Text(portfolio['name']),
                );
              }).toList(),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _portfolios.isEmpty
              ? _buildEmptyState()
              : _buildPortfolioView(),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreatePortfolioDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.account_balance_wallet_outlined,
            size: 80,
            color: Colors.grey,
          ),
          const SizedBox(height: 16),
          const Text(
            '포트폴리오가 없습니다',
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: _showCreatePortfolioDialog,
            child: const Text('첫 포트폴리오 만들기'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildPortfolioView() {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadPortfolios();
        if (_selectedPortfolio != null) {
          await _loadPortfolioPerformance(_selectedPortfolio!['id']);
        }
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 포트폴리오 요약 카드
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _selectedPortfolio!['name'],
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    if (_selectedPortfolio!['description'] != null)
                      Text(
                        _selectedPortfolio!['description'],
                        style: const TextStyle(color: Colors.grey),
                      ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildMetricColumn(
                          '초기 자본',
                          '\$${_selectedPortfolio!['initial_capital']?.toStringAsFixed(2) ?? '0.00'}',
                        ),
                        _buildMetricColumn(
                          '현재 가치',
                          '\$${_performance?['totalValue']?.toStringAsFixed(2) ?? _selectedPortfolio!['initial_capital']?.toStringAsFixed(2) ?? '0.00'}',
                        ),
                        _buildMetricColumn(
                          '수익률',
                          '${_performance?['totalReturn']?.toStringAsFixed(2) ?? '0.00'}%',
                          color: (_performance?['totalReturn'] ?? 0) > 0
                              ? Colors.green
                              : Colors.red,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 포지션 섹션
            Text(
              '보유 포지션',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            
            if (_performance?['positions'] != null &&
                (_performance!['positions'] as List).isNotEmpty)
              ...(_performance!['positions'] as List).map((position) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(
                      position['symbol'],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${position['quantity']}주 @ \$${position['entry_price']?.toStringAsFixed(2)}',
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '\$${position['currentValue']?.toStringAsFixed(2) ?? '0.00'}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${position['return'] > 0 ? '+' : ''}${position['return']?.toStringAsFixed(2) ?? '0.00'}%',
                          style: TextStyle(
                            color: position['return'] > 0
                                ? Colors.green
                                : Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList()
            else
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(
                    child: Text(
                      '보유 중인 포지션이 없습니다',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildMetricColumn(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
  
  void _showCreatePortfolioDialog() {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final capitalController = TextEditingController(text: '10000');
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('새 포트폴리오 만들기'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: '포트폴리오 이름',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: '설명 (선택사항)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: capitalController,
                decoration: const InputDecoration(
                  labelText: '초기 자본 (USD)',
                  border: OutlineInputBorder(),
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () async {
              final name = nameController.text.trim();
              final capital = double.tryParse(capitalController.text) ?? 0;
              
              if (name.isNotEmpty && capital > 0) {
                try {
                  await supabase.from('portfolios').insert({
                    'name': name,
                    'description': descriptionController.text.trim(),
                    'initial_capital': capital,
                    'currency': 'USD',
                    'user_id': supabase.auth.currentUser!.id,
                  });
                  
                  Navigator.pop(context);
                  _loadPortfolios();
                  
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('포트폴리오가 생성되었습니다')),
                  );
                } catch (error) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('생성 실패: $error')),
                  );
                }
              }
            },
            child: const Text('생성'),
          ),
        ],
      ),
    );
  }
}
```

### 3. 추가 기능 위젯

```dart
// lib/widgets/real_time_price_widget.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class RealTimePriceWidget extends StatefulWidget {
  final String symbol;
  
  const RealTimePriceWidget({
    Key? key,
    required this.symbol,
  }) : super(key: key);
  
  @override
  _RealTimePriceWidgetState createState() => _RealTimePriceWidgetState();
}

class _RealTimePriceWidgetState extends State<RealTimePriceWidget> {
  Map<String, dynamic>? _priceData;
  Timer? _timer;
  
  @override
  void initState() {
    super.initState();
    _loadPrice();
    // 30초마다 가격 업데이트
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      _loadPrice();
    });
  }
  
  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
  
  Future<void> _loadPrice() async {
    try {
      final response = await supabase.functions.invoke(
        'market-data',
        body: {
          'action': 'quote',
          'symbol': widget.symbol,
        },
      );
      
      if (response.data != null && mounted) {
        setState(() {
          _priceData = response.data['data'];
        });
      }
    } catch (error) {
      print('Price load error: $error');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_priceData == null) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    
    final change = _priceData!['d'] ?? 0;
    final changePercent = _priceData!['dp'] ?? 0;
    final isPositive = change >= 0;
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '\$${_priceData!['c']?.toStringAsFixed(2) ?? 'N/A'}',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: isPositive ? Colors.green : Colors.red,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                size: 12,
                color: Colors.white,
              ),
              Text(
                '${changePercent.toStringAsFixed(2)}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
```

## 🎯 구현 우선순위

1. **필수 기능** (먼저 구현)
   - 트레이딩 신호 목록 화면
   - 포트폴리오 기본 기능
   - 실시간 가격 표시

2. **추가 기능** (나중에 구현)
   - 차트 표시 (fl_chart 패키지 사용)
   - 알림 설정
   - 거래 내역
   - 수익률 그래프

## 📦 필요한 패키지

```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.3.0
  fl_chart: ^0.63.0  # 차트용
  intl: ^0.18.1  # 날짜/숫자 포맷팅
  provider: ^6.0.5  # 상태 관리
```

## 🚀 다음 단계

1. 위 코드를 Flutter 프로젝트에 추가
2. 필요한 패키지 설치: `flutter pub get`
3. 각 화면 테스트 및 디버깅
4. UI/UX 개선 및 애니메이션 추가