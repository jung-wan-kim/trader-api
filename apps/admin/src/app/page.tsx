export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔧 Trader API - Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            AI 기반 주식 투자 추천 서비스 관리자 대시보드
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-600 mb-1">전체 사용자</h3>
              <p className="text-3xl font-bold text-blue-900">10,234</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-sm font-medium text-green-600 mb-1">활성 사용자</h3>
              <p className="text-3xl font-bold text-green-900">2,431</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-sm font-medium text-purple-600 mb-1">오늘 수익</h3>
              <p className="text-3xl font-bold text-purple-900">$5,234</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h3 className="text-sm font-medium text-orange-600 mb-1">API 호출</h3>
              <p className="text-3xl font-bold text-orange-900">45.2k</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              ⚠️ <strong>개발 중</strong> - 어드민 대시보드 기본 구조가 생성되었습니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
