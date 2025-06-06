import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 완전한 Trader App 예제
/// 
/// 이 예제는 Supabase Serverless 백엔드와 통합된
/// 완전한 Flutter 트레이딩 앱의 구조를 보여줍니다.

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Supabase 초기화
  await Supabase.initialize(
    url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE',
  );
  
  runApp(const TraderApp());
}

// Supabase 클라이언트 접근을 위한 헬퍼
final supabase = Supabase.instance.client;

class TraderApp extends StatelessWidget {
  const TraderApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trader App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const AuthWrapper(),
    );
  }
}

// 인증 상태에 따라 화면 전환
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: supabase.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = snapshot.data?.session;
        if (session != null) {
          return const MainScreen();
        }
        return const LoginScreen();
      },
    );
  }
}

// ============================================
// 로그인 화면
// ============================================
class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);
  
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isLoading = false;
  bool _isSignUp = false;
  
  Future<void> _handleAuth() async {
    setState(() => _isLoading = true);
    
    try {
      if (_isSignUp) {
        // 회원가입
        final response = await supabase.auth.signUp(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          data: {'name': _nameController.text.trim()},
        );
        
        if (response.user != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('회원가입 성공! 이메일을 확인해주세요.')),
          );
        }
      } else {
        // 로그인
        final response = await supabase.auth.signInWithPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
        
        if (response.user != null) {
          // 자동으로 MainScreen으로 이동
        }
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('오류: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isSignUp ? '회원가입' : '로그인'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isSignUp)
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: '이름',
                  border: OutlineInputBorder(),
                ),
              ),
            if (_isSignUp) const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: '이메일',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: '비밀번호',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const CircularProgressIndicator()
            else
              Column(
                children: [
                  ElevatedButton(
                    onPressed: _handleAuth,
                    child: Text(_isSignUp ? '회원가입' : '로그인'),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() => _isSignUp = !_isSignUp);
                    },
                    child: Text(
                      _isSignUp
                          ? '이미 계정이 있으신가요? 로그인'
                          : '계정이 없으신가요? 회원가입',
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// 메인 화면
// ============================================
class MainScreen extends StatefulWidget {
  const MainScreen({Key? key}) : super(key: key);
  
  @override
  _MainScreenState createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  
  final List<Widget> _screens = [
    const MarketDataScreen(),
    const TradingSignalsScreen(),
    const PortfolioScreen(),
    const ProfileScreen(),
  ];
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() => _selectedIndex = index);
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.show_chart),
            label: '시장',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
            label: '신호',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.account_balance_wallet),
            label: '포트폴리오',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: '프로필',
          ),
        ],
      ),
    );
  }
}

// ============================================
// 시장 데이터 화면
// ============================================
class MarketDataScreen extends StatefulWidget {
  const MarketDataScreen({Key? key}) : super(key: key);
  
  @override
  _MarketDataScreenState createState() => _MarketDataScreenState();
}

class _MarketDataScreenState extends State<MarketDataScreen> {
  final List<String> _symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  Map<String, dynamic> _marketData = {};
  bool _isLoading = false;
  
  @override
  void initState() {
    super.initState();
    _loadMarketData();
  }
  
  Future<void> _loadMarketData() async {
    setState(() => _isLoading = true);
    
    try {
      for (String symbol in _symbols) {
        final response = await supabase.functions.invoke(
          'market-data',
          body: {
            'action': 'quote',
            'symbol': symbol,
          },
        );
        
        if (response.data != null) {
          setState(() {
            _marketData[symbol] = response.data['data'];
          });
        }
      }
    } catch (error) {
      print('Market data error: $error');
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('시장 데이터'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMarketData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadMarketData,
              child: ListView.builder(
                itemCount: _symbols.length,
                itemBuilder: (context, index) {
                  final symbol = _symbols[index];
                  final data = _marketData[symbol];
                  
                  return Card(
                    margin: const EdgeInsets.all(8),
                    child: ListTile(
                      title: Text(
                        symbol,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      subtitle: data != null
                          ? Text(
                              '현재가: \$${data['c']?.toStringAsFixed(2) ?? 'N/A'}',
                            )
                          : const Text('데이터 로딩 중...'),
                      trailing: data != null
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${data['dp'] > 0 ? '+' : ''}${data['dp']?.toStringAsFixed(2) ?? '0.00'}%',
                                  style: TextStyle(
                                    color: (data['dp'] ?? 0) > 0
                                        ? Colors.green
                                        : Colors.red,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  '\$${((data['d'] ?? 0).abs()).toStringAsFixed(2)}',
                                  style: TextStyle(
                                    color: (data['d'] ?? 0) > 0
                                        ? Colors.green
                                        : Colors.red,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            )
                          : null,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => StockDetailScreen(
                              symbol: symbol,
                              currentPrice: data?['c'],
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
    );
  }
}

// ============================================
// 주식 상세 화면
// ============================================
class StockDetailScreen extends StatefulWidget {
  final String symbol;
  final double? currentPrice;
  
  const StockDetailScreen({
    Key? key,
    required this.symbol,
    this.currentPrice,
  }) : super(key: key);
  
  @override
  _StockDetailScreenState createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  Map<String, dynamic>? _signal;
  bool _isLoading = false;
  String _selectedStrategy = 'jesse_livermore';
  
  Future<void> _getSignal() async {
    setState(() => _isLoading = true);
    
    try {
      final response = await supabase.functions.invoke(
        'trading-signals',
        body: {
          'symbol': widget.symbol,
          'strategy': _selectedStrategy,
          'timeframe': 'D',
        },
      );
      
      if (response.data != null) {
        setState(() {
          _signal = response.data['signal'];
        });
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('신호 조회 실패: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.symbol),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 가격 정보
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '현재가',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '\$${widget.currentPrice?.toStringAsFixed(2) ?? 'N/A'}',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 전략 선택
            DropdownButtonFormField<String>(
              value: _selectedStrategy,
              decoration: const InputDecoration(
                labelText: '트레이딩 전략',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'jesse_livermore',
                  child: Text('Jesse Livermore - 추세 추종'),
                ),
                DropdownMenuItem(
                  value: 'larry_williams',
                  child: Text('Larry Williams - 단기 모멘텀'),
                ),
                DropdownMenuItem(
                  value: 'stan_weinstein',
                  child: Text('Stan Weinstein - 스테이지 분석'),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedStrategy = value!;
                  _signal = null;
                });
              },
            ),
            
            const SizedBox(height: 16),
            
            // 신호 분석 버튼
            ElevatedButton(
              onPressed: _isLoading ? null : _getSignal,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('신호 분석'),
            ),
            
            const SizedBox(height: 24),
            
            // 신호 결과
            if (_signal != null)
              Expanded(
                child: SignalResultCard(signal: _signal!),
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// 신호 결과 카드
// ============================================
class SignalResultCard extends StatelessWidget {
  final Map<String, dynamic> signal;
  
  const SignalResultCard({Key? key, required this.signal}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final action = signal['action'];
    final confidence = (signal['confidence'] * 100).toStringAsFixed(0);
    final Color actionColor = action == 'buy' 
        ? Colors.green 
        : action == 'sell' 
            ? Colors.red 
            : Colors.grey;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '신호: ${action.toUpperCase()}',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: actionColor,
                  ),
                ),
                Chip(
                  label: Text('신뢰도: $confidence%'),
                  backgroundColor: actionColor.withOpacity(0.2),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            if (action != 'hold') ...[
              _buildPriceRow('진입가', signal['entry_price']),
              _buildPriceRow('목표가', signal['target_price']),
              _buildPriceRow('손절가', signal['stop_loss']),
              
              const SizedBox(height: 16),
            ],
            
            Text(
              '분석 근거',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(signal['reasoning'] ?? '분석 중...'),
            
            if (signal['indicators'] != null) ...[
              const SizedBox(height: 16),
              Text(
                '기술적 지표',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...signal['indicators'].entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text('${entry.key}: ${entry.value}'),
                );
              }).toList(),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildPriceRow(String label, double? price) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            '\$${price?.toStringAsFixed(2) ?? 'N/A'}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

// ============================================
// 트레이딩 신호 화면
// ============================================
class TradingSignalsScreen extends StatelessWidget {
  const TradingSignalsScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('트레이딩 신호'),
      ),
      body: const Center(
        child: Text('트레이딩 신호 화면 구현 예정'),
      ),
    );
  }
}

// ============================================
// 포트폴리오 화면
// ============================================
class PortfolioScreen extends StatelessWidget {
  const PortfolioScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('포트폴리오'),
      ),
      body: const Center(
        child: Text('포트폴리오 화면 구현 예정'),
      ),
    );
  }
}

// ============================================
// 프로필 화면
// ============================================
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('프로필'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await supabase.auth.signOut();
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '사용자 정보',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    Text('이메일: ${user?.email ?? 'N/A'}'),
                    const SizedBox(height: 8),
                    Text('가입일: ${user?.createdAt ?? 'N/A'}'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}