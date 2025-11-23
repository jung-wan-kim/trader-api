export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Trader Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            AI 기반 주식 투자 추천 서비스
          </p>

          {/* Portfolio Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">💰 포트폴리오 요약</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-600 mb-1">총 자산</h3>
                <p className="text-3xl font-bold text-blue-900">$125,430</p>
                <p className="text-sm text-blue-600 mt-1">+$12,340 (10.9%)</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <h3 className="text-sm font-medium text-green-600 mb-1">수익률</h3>
                <p className="text-3xl font-bold text-green-900">+15.2%</p>
                <p className="text-sm text-green-600 mt-1">연환산 수익률</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <h3 className="text-sm font-medium text-purple-600 mb-1">오늘 손익</h3>
                <p className="text-3xl font-bold text-purple-900">+$1,234</p>
                <p className="text-sm text-purple-600 mt-1">+0.98%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                <h3 className="text-sm font-medium text-orange-600 mb-1">보유 종목</h3>
                <p className="text-3xl font-bold text-orange-900">12</p>
                <p className="text-sm text-orange-600 mt-1">개 종목 보유 중</p>
              </div>
            </div>
          </div>

          {/* Today's Recommendations */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🎯 오늘의 추천</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">📈</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AAPL</h3>
                    <p className="text-sm text-gray-600">Apple Inc.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
                    BUY
                  </span>
                  <p className="text-sm text-gray-600 mt-1">$150.25 | 신뢰도: 높음</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">⏸️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">NVDA</h3>
                    <p className="text-sm text-gray-600">NVIDIA Corporation</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-yellow-600 text-white text-sm font-medium rounded-full">
                    HOLD
                  </span>
                  <p className="text-sm text-gray-600 mt-1">$480.00 | 신뢰도: 중간</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">📉</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">TSLA</h3>
                    <p className="text-sm text-gray-600">Tesla, Inc.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                    SELL
                  </span>
                  <p className="text-sm text-gray-600 mt-1">$245.80 | 신뢰도: 낮음</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              ⚠️ <strong>개발 중</strong> - 사용자 대시보드 기본 구조가 생성되었습니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
