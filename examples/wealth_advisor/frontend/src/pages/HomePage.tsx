import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function HomePage() {
  const { isLoggedIn } = useAuth()

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-4">
        <img src="/images/bullz.png" alt="Wealth Advisor" className="w-40 h-40 object-contain mb-8 animate-float" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI 자산 상담 시스템
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mb-8">
          LangGraph 멀티 에이전트가 시장 조사, 거시경제 분석, 세법 해석을 병렬 수행한 뒤
          맞춤 상담 리포트를 생성합니다.
        </p>
        <div className="flex gap-4">
          {isLoggedIn ? (
            <Link to="/dashboard" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition">
              대시보드 가기
            </Link>
          ) : (
            <>
              <Link to="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition">
                시작하기
              </Link>
              <Link to="/login" className="border border-gray-600 text-gray-300 hover:text-white px-6 py-3 rounded-lg font-semibold transition">
                로그인
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { title: 'AI 자산 상담', desc: '프로필 기반 맞춤 상담 리포트 — 시장/거시경제/세법 분석', icon: '🤖' },
          { title: '백테스트 랩', desc: '전략별 수익률 시뮬레이션, 그리드 서치, AI 전략 추천', icon: '📊' },
          { title: '청약 정보', desc: '서울 구별 지도 + 유형별 청약 공고 실시간 조회', icon: '🏠' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
