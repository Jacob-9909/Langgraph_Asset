import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import type { AgentResultResponse } from '../types'

function ResultCard({ result }: { result: AgentResultResponse }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-700/30 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-sm font-semibold">상담 결과</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {new Date(result.executed_at).toLocaleString('ko-KR')}
          </div>
        </div>
        <span className="text-gray-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-700 px-5 py-4 space-y-5">
          {result.recommendation && (
            <div>
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                종합 추천
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                <ReactMarkdown>{result.recommendation}</ReactMarkdown>
              </div>
            </div>
          )}
          {result.market_notes && (
            <div>
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                시장 분석
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                <ReactMarkdown>{result.market_notes}</ReactMarkdown>
              </div>
            </div>
          )}
          {result.macro_market_notes && (
            <div>
              <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
                거시경제 분석
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                <ReactMarkdown>{result.macro_market_notes}</ReactMarkdown>
              </div>
            </div>
          )}
          {result.tax_market_notes && (
            <div>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                세법 분석
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                <ReactMarkdown>{result.tax_market_notes}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentPage() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<AgentResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResults = async () => {
    const { data } = await api.get<AgentResultResponse[]>('/agent/results')
    setResults(data.slice().reverse())
  }

  useEffect(() => {
    loadResults().finally(() => setLoading(false))
  }, [])

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      const { data } = await api.post<AgentResultResponse>('/agent/run')
      setResults((prev) => [data, ...prev])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'AI 상담 실행 실패')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">AI 자산 상담</h1>
      <p className="text-gray-400 text-sm mb-6">
        등록된 자산과 프로필을 기반으로 LangGraph 멀티 에이전트가 시장·거시경제·세법을 분석합니다.
      </p>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 text-center">
        <p className="text-gray-400 text-sm mb-4">
          상담 실행 전에 <span className="text-emerald-400">자산 관리</span>와 <span className="text-emerald-400">재무 프로필</span>을 먼저 입력하면 더 정확한 분석을 받을 수 있습니다.
        </p>
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              분석 중... (수 분 소요)
            </span>
          ) : (
            'AI 상담 실행'
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">상담 히스토리</h2>

      {loading ? (
        <div className="text-center text-gray-400 animate-pulse py-8">로딩 중...</div>
      ) : results.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center text-gray-500 text-sm">
          상담 기록이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  )
}
