import 'package:flutter/material.dart';
import 'package:supabase_trader_client/supabase_trader_client.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase Trader Client
  final traderClient = await SupabaseTraderClient.initialize(
    supabaseUrl: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
    supabaseAnonKey: 'your-anon-key-here',
  );
  
  runApp(MyApp(traderClient: traderClient));
}

class MyApp extends StatelessWidget {
  final SupabaseTraderClient traderClient;
  
  const MyApp({Key? key, required this.traderClient}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trader App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: LoginScreen(traderClient: traderClient),
    );
  }
}

// ============================================
// Login Screen Example
// ============================================

class LoginScreen extends StatefulWidget {
  final SupabaseTraderClient traderClient;
  
  const LoginScreen({Key? key, required this.traderClient}) : super(key: key);
  
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  
  Future<void> _signIn() async {
    setState(() => _isLoading = true);
    
    try {
      final response = await widget.traderClient.signIn(
        email: _emailController.text,
        password: _passwordController.text,
      );
      
      if (response.user != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => DashboardScreen(traderClient: widget.traderClient),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Login failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  Future<void> _signUp() async {
    setState(() => _isLoading = true);
    
    try {
      final response = await widget.traderClient.signUp(
        email: _emailController.text,
        password: _passwordController.text,
        name: 'New Trader',
      );
      
      if (response.user != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sign up successful! Please check your email.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sign up failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trader Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const CircularProgressIndicator()
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton(
                    onPressed: _signIn,
                    child: const Text('Sign In'),
                  ),
                  OutlinedButton(
                    onPressed: _signUp,
                    child: const Text('Sign Up'),
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
// Dashboard Screen Example
// ============================================

class DashboardScreen extends StatefulWidget {
  final SupabaseTraderClient traderClient;
  
  const DashboardScreen({Key? key, required this.traderClient}) : super(key: key);
  
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _portfolios = [];
  List<Map<String, dynamic>> _recommendations = [];
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _loadData();
    _subscribeToRecommendations();
  }
  
  Future<void> _loadData() async {
    try {
      final profile = await widget.traderClient.getProfile();
      final portfolios = await widget.traderClient.getPortfolios();
      final recommendations = await widget.traderClient.getRecommendations();
      
      setState(() {
        _profile = profile;
        _portfolios = portfolios;
        _recommendations = recommendations;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading data: $e');
      setState(() => _isLoading = false);
    }
  }
  
  void _subscribeToRecommendations() {
    widget.traderClient.subscribeToRecommendations(
      onNewRecommendation: (recommendation) {
        setState(() {
          _recommendations.insert(0, recommendation);
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('New recommendation: ${recommendation['symbol']} - ${recommendation['action']}'),
            action: SnackBarAction(
              label: 'View',
              onPressed: () => _showRecommendationDetails(recommendation),
            ),
          ),
        );
      },
    );
  }
  
  void _showRecommendationDetails(Map<String, dynamic> recommendation) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${recommendation['symbol']} - ${recommendation['action'].toUpperCase()}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Entry Price: \$${recommendation['entry_price']}'),
            Text('Target Price: \$${recommendation['target_price']}'),
            Text('Stop Loss: \$${recommendation['stop_loss']}'),
            Text('Confidence: ${(recommendation['confidence'] * 100).toStringAsFixed(0)}%'),
            const SizedBox(height: 8),
            Text('Reasoning: ${recommendation['reasoning']}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () => _followRecommendation(recommendation),
            child: const Text('Follow'),
          ),
        ],
      ),
    );
  }
  
  Future<void> _followRecommendation(Map<String, dynamic> recommendation) async {
    if (_portfolios.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please create a portfolio first')),
      );
      return;
    }
    
    try {
      final result = await widget.traderClient.followRecommendation(
        recommendation['id'],
        _portfolios.first['id'],
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Position created successfully!')),
      );
      
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to follow recommendation: $e')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${_profile?['name'] ?? 'Trader'}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await widget.traderClient.signOut();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => LoginScreen(traderClient: widget.traderClient),
                ),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Subscription Status Card
            Card(
              child: ListTile(
                leading: const Icon(Icons.star),
                title: Text('Subscription: ${_profile?['subscription_tier']?.toUpperCase() ?? 'BASIC'}'),
                subtitle: Text('Status: ${_profile?['subscription_status'] ?? 'Active'}'),
                trailing: TextButton(
                  onPressed: () {
                    // Navigate to subscription management
                  },
                  child: const Text('Upgrade'),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Portfolios Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Portfolios (${_portfolios.length})',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: () => _createPortfolio(),
                ),
              ],
            ),
            
            if (_portfolios.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No portfolios yet'),
                  subtitle: Text('Create your first portfolio to start trading'),
                ),
              )
            else
              ..._portfolios.map((portfolio) => Card(
                child: ListTile(
                  title: Text(portfolio['name']),
                  subtitle: Text('Capital: \$${portfolio['initial_capital']}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.arrow_forward),
                    onPressed: () => _navigateToPortfolio(portfolio),
                  ),
                ),
              )),
            
            const SizedBox(height: 16),
            
            // Recommendations Section
            Text(
              'Latest Recommendations',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            
            if (_recommendations.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No recommendations available'),
                  subtitle: Text('Subscribe to strategies to receive recommendations'),
                ),
              )
            else
              ..._recommendations.take(5).map((rec) => Card(
                child: ListTile(
                  leading: Icon(
                    rec['action'] == 'buy' ? Icons.trending_up : Icons.trending_down,
                    color: rec['action'] == 'buy' ? Colors.green : Colors.red,
                  ),
                  title: Text('${rec['symbol']} - ${rec['action'].toUpperCase()}'),
                  subtitle: Text('Confidence: ${(rec['confidence'] * 100).toStringAsFixed(0)}%'),
                  trailing: Text('\$${rec['entry_price']}'),
                  onTap: () => _showRecommendationDetails(rec),
                ),
              )),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.show_chart), label: 'Markets'),
          BottomNavigationBarItem(icon: Icon(Icons.psychology), label: 'Strategies'),
        ],
        onTap: (index) {
          switch (index) {
            case 1:
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => MarketScreen(traderClient: widget.traderClient),
                ),
              );
              break;
            case 2:
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => StrategiesScreen(traderClient: widget.traderClient),
                ),
              );
              break;
          }
        },
      ),
    );
  }
  
  Future<void> _createPortfolio() async {
    final nameController = TextEditingController();
    final capitalController = TextEditingController(text: '10000');
    
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Portfolio'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Portfolio Name',
                hintText: 'e.g., Growth Portfolio',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: capitalController,
              decoration: const InputDecoration(
                labelText: 'Initial Capital',
                prefixText: '\$',
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    
    if (result == true) {
      try {
        await widget.traderClient.createPortfolio(
          name: nameController.text,
          initialCapital: double.parse(capitalController.text),
        );
        
        await _loadData();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Portfolio created successfully!')),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create portfolio: $e')),
        );
      }
    }
  }
  
  void _navigateToPortfolio(Map<String, dynamic> portfolio) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PortfolioScreen(
          traderClient: widget.traderClient,
          portfolio: portfolio,
        ),
      ),
    );
  }
}

// ============================================
// Market Screen Example (Simplified)
// ============================================

class MarketScreen extends StatelessWidget {
  final SupabaseTraderClient traderClient;
  
  const MarketScreen({Key? key, required this.traderClient}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Markets')),
      body: Center(
        child: Text('Market data implementation here'),
      ),
    );
  }
}

// ============================================
// Strategies Screen Example (Simplified)
// ============================================

class StrategiesScreen extends StatelessWidget {
  final SupabaseTraderClient traderClient;
  
  const StrategiesScreen({Key? key, required this.traderClient}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trading Strategies')),
      body: Center(
        child: Text('Strategies implementation here'),
      ),
    );
  }
}

// ============================================
// Portfolio Screen Example (Simplified)
// ============================================

class PortfolioScreen extends StatelessWidget {
  final SupabaseTraderClient traderClient;
  final Map<String, dynamic> portfolio;
  
  const PortfolioScreen({
    Key? key,
    required this.traderClient,
    required this.portfolio,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(portfolio['name'])),
      body: Center(
        child: Text('Portfolio details implementation here'),
      ),
    );
  }
}