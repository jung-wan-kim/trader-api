import 'package:http/http.dart' as http;
import 'dart:convert';

/// Edge Functions 테스트를 위한 간단한 Dart 스크립트
/// 
/// 실행 방법:
/// dart test_edge_functions.dart

const String supabaseUrl = 'https://lgebgddeerpxdjvtqvoi.supabase.co';
const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';

void main() async {
  print('🧪 Supabase Edge Functions 테스트 시작...\n');
  
  // 1. Market Data 테스트
  await testMarketData();
  
  // 2. Trading Signals 테스트
  // await testTradingSignals();
  
  // 3. Portfolio Management 테스트
  // await testPortfolioManagement();
}

Future<void> testMarketData() async {
  print('📊 Market Data Function 테스트');
  print('================================');
  
  final url = Uri.parse('$supabaseUrl/functions/v1/market-data');
  
  // 1. Quote 테스트
  print('\n1️⃣ Quote 데이터 요청 (AAPL)');
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $supabaseAnonKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'quote',
        'symbol': 'AAPL',
      }),
    );
    
    print('상태 코드: ${response.statusCode}');
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ 성공!');
      print('현재가: \$${data['data']['c']}');
      print('변동: ${data['data']['dp']}%');
    } else {
      print('❌ 실패: ${response.body}');
    }
  } catch (e) {
    print('❌ 에러: $e');
  }
  
  // 2. Candles 테스트
  print('\n2️⃣ Candle 데이터 요청 (AAPL, 일봉)');
  try {
    final now = DateTime.now();
    final from = now.subtract(Duration(days: 30));
    
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $supabaseAnonKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'candles',
        'symbol': 'AAPL',
        'params': {
          'resolution': 'D',
          'from': from.millisecondsSinceEpoch ~/ 1000,
          'to': now.millisecondsSinceEpoch ~/ 1000,
        },
      }),
    );
    
    print('상태 코드: ${response.statusCode}');
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ 성공!');
      if (data['data']['s'] == 'ok') {
        print('데이터 포인트 수: ${data['data']['c'].length}');
        print('최근 종가: \$${data['data']['c'].last}');
      }
    } else {
      print('❌ 실패: ${response.body}');
    }
  } catch (e) {
    print('❌ 에러: $e');
  }
  
  // 3. 기술적 지표 테스트
  print('\n3️⃣ 기술적 지표 요청 (AAPL, SMA 20)');
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $supabaseAnonKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'indicators',
        'symbol': 'AAPL',
        'params': {
          'indicator': 'sma',
          'period': 20,
        },
      }),
    );
    
    print('상태 코드: ${response.statusCode}');
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ 성공!');
      print('캐시 여부: ${data['cached']}');
    } else {
      print('❌ 실패: ${response.body}');
    }
  } catch (e) {
    print('❌ 에러: $e');
  }
}

Future<void> testTradingSignals() async {
  print('\n\n🎯 Trading Signals Function 테스트');
  print('================================');
  
  final url = Uri.parse('$supabaseUrl/functions/v1/trading-signals');
  
  // Jesse Livermore 전략 테스트
  print('\n📈 Jesse Livermore 전략 신호 (AAPL)');
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $supabaseAnonKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'symbol': 'AAPL',
        'strategy': 'jesse_livermore',
        'timeframe': 'D',
      }),
    );
    
    print('상태 코드: ${response.statusCode}');
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final signal = data['signal'];
      print('✅ 성공!');
      print('액션: ${signal['action']}');
      print('신뢰도: ${(signal['confidence'] * 100).toStringAsFixed(0)}%');
      print('진입가: \$${signal['entry_price']}');
      print('목표가: \$${signal['target_price']}');
      print('손절가: \$${signal['stop_loss']}');
    } else {
      print('❌ 실패: ${response.body}');
    }
  } catch (e) {
    print('❌ 에러: $e');
  }
}

Future<void> testPortfolioManagement() async {
  print('\n\n💼 Portfolio Management Function 테스트');
  print('================================');
  
  final url = Uri.parse('$supabaseUrl/functions/v1/portfolio-management');
  
  // 포트폴리오 성과 계산 테스트
  print('\n📊 포트폴리오 성과 계산');
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $supabaseAnonKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'calculate_performance',
        'portfolioId': 'test-portfolio-id', // 실제 포트폴리오 ID로 변경 필요
      }),
    );
    
    print('상태 코드: ${response.statusCode}');
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ 성공!');
      if (data['success']) {
        final perf = data['performance'];
        print('총 거래: ${perf['total_trades']}');
        print('승률: ${perf['win_rate'].toStringAsFixed(1)}%');
        print('총 수익: \$${perf['total_pnl'].toStringAsFixed(2)}');
      }
    } else {
      print('❌ 실패: ${response.body}');
    }
  } catch (e) {
    print('❌ 에러: $e');
  }
}

// 사용법을 보여주는 예제 함수들

/// 실제 Flutter 앱에서 사용하는 예제
class EdgeFunctionsExample {
  static const String baseUrl = 'https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1';
  
  /// 시장 데이터 가져오기
  static Future<Map<String, dynamic>> getMarketQuote(
    String symbol,
    String authToken,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/market-data'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'quote',
        'symbol': symbol,
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get market quote: ${response.body}');
    }
  }
  
  /// 트레이딩 신호 가져오기
  static Future<Map<String, dynamic>> getTradingSignal(
    String symbol,
    String strategy,
    String authToken,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/trading-signals'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'symbol': symbol,
        'strategy': strategy,
        'timeframe': 'D',
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get trading signal: ${response.body}');
    }
  }
  
  /// 포지션 생성
  static Future<Map<String, dynamic>> createPosition(
    String portfolioId,
    Map<String, dynamic> positionData,
    String authToken,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/portfolio-management'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'action': 'create_position',
        'portfolioId': portfolioId,
        'data': positionData,
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create position: ${response.body}');
    }
  }
}