import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { BacktestResponse, BacktestResultResponse, StrategyInfo } from '../types'
import { STRATEGY_LABELS } from '../constants/labels'
import { formatPercent } from '../utils/format'
import TickerSearch from '../components/backtest/TickerSearch'
import BacktestChart from '../components/backtest/BacktestChart'

interface GridItem {
  index: number
  total: number
  params: Record<string, unknown>
  total_return: number
  is_best: boolean
  current_best_params: Record<string, unknown>
  current_best_return: number
}

const today = new Date().toISOString().slice(0, 10)
const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function MetricCard({
  label,
  value,
  positive,
  forceRed,
}: {
  label: string
  value: string
  positive: boolean
  forceRed?: boolean
}) {
  const color = forceRed ? 'text-red-400' : positive ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

export default function BacktestPage() {
  const { token } = useAuth()

  const [ticker, setTicker] = useState('SPY')
  const [strategy, setStrategy] = useState('sma_crossover')
  const [startDate, setStartDate] = useState(threeYearsAgo)
  const [endDate, setEndDate] = useState(today)
  const [initialCapital, setInitialCapital] = useState(10_000_000)

  const [strategies, setStrategies] = useState<StrategyInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [gridRunning, setGridRunning] = useState(false)
  const [gridItems, setGridItems] = useState<GridItem[]>([])
  const [gridDone, setGridDone] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'run' | 'history'>('run')
  const [history, setHistory] = useState<BacktestResultResponse[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    api.get<StrategyInfo[]>('/backtest/strategies').then((r) => setStrategies(r.data))
  }, [])

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setGridItems([])
    setGridDone(false)
    setAiAnalysis(null)
    try {
      const { data } = await api.post<BacktestResponse>('/backtest/run', {
        ticker,
        strategy,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      })
      setResult(data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? '백테스트 실행 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleGridSearch = async () => {
    if (strategy === 'combined') return
    setGridRunning(true)
    setGridItems([])
    setGridDone(false)

    try {
      const response = await fetch('/api/backtest/grid-search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticker,
          strategy,
          start_date: startDate,
          end_date: endDate,
          initial_capital: initialCapital,
        }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: done')) {
            setGridDone(true)
          } else if (line.startsWith('data: ')) {
            try {
              const item = JSON.parse(line.slice(6)) as GridItem
              if (item.index) {
                setGridItems((prev) => {
                  const idx = prev.findIndex((x) => x.index === item.index)
                  if (idx >= 0) {
                    const next = [...prev]
                    next[idx] = item
                    return next
                  }
                  return [...prev, item]
                })
              }
            } catch {
              /* ignore malformed */
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGridRunning(false)
      setGridDone(true)
    }
  }

  const handleAiAnalysis = async () => {
    if (!result?.backtest_id) return
    setAiLoading(true)
    try {
      const { data } = await api.post<{ analysis: string }>('/backtest/ai-analysis', {
        backtest_id: result.backtest_id,
      })
      setAiAnalysis(data.analysis)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAiAnalysis(`오류: ${err.response?.data?.detail ?? 'AI 분석 실패'}`)
    } finally {
      setAiLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await api.get<BacktestResultResponse[]>('/backtest/history')
      setHistory(data)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleTabChange = (tab: 'run' | 'history') => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
  }

  const selectedStrategy = strategies.find((s) => s.name === strategy)
  const gridLatest = gridItems.length > 0 ? gridItems[gridItems.length - 1] : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">백테스트 랩</h1>
      <p className="text-gray-400 text-sm mb-6">전략별 수익률 시뮬레이션 및 파라미터 최적화</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {(['run', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'run' ? '실행' : '히스토리'}
          </button>
        ))}
      </div>

      {activeTab === 'run' && (
        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">설정</h2>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">티커</label>
                <TickerSearch value={ticker} onChange={setTicker} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">전략</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {strategies.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {selectedStrategy && (
                  <p className="text-xs text-gray-500 mt-1.5">{selectedStrategy.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">초기 자본 ($)</label>
                <input
                  type="text"
                  value={initialCapital.toLocaleString()}
                  onChange={(e) => {
                    const v = parseInt(e.target.value.replace(/,/g, ''), 10)
                    if (!isNaN(v)) setInitialCapital(v)
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleRun}
                disabled={loading || !ticker}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition"
              >
                {loading ? '실행 중...' : '백테스트 실행'}
              </button>

              {strategy !== 'combined' && (
                <button
                  onClick={handleGridSearch}
                  disabled={gridRunning || !ticker}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  {gridRunning ? '최적화 중...' : '파라미터 최적화'}
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400 animate-pulse">
                백테스트 실행 중...
              </div>
            )}

            {/* Grid Search Progress */}
            {(gridRunning || gridItems.length > 0) && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3 text-gray-300">파라미터 최적화</h3>
                {gridLatest && (
                  <>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>{gridLatest.index} / {gridLatest.total} 조합</span>
                      <span>최고: {formatPercent(gridLatest.current_best_return)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(gridLatest.index / gridLatest.total) * 100}%` }}
                      />
                    </div>

                    {!gridDone && (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {[...gridItems].reverse().slice(0, 8).map((item) => (
                          <div
                            key={item.index}
                            className={`flex justify-between text-xs px-2 py-1 rounded font-mono ${
                              item.is_best ? 'bg-indigo-900/50 text-indigo-300' : 'text-gray-600'
                            }`}
                          >
                            <span>
                              #{item.index}{' '}
                              {Object.entries(item.params)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(' ')}
                            </span>
                            <span>
                              {formatPercent(item.total_return)}
                              {item.is_best ? ' ★' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {gridDone && (
                      <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
                        <div className="text-xs font-semibold text-indigo-300 mb-2">최적 파라미터</div>
                        <div className="space-y-1">
                          {Object.entries(gridLatest.current_best_params).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-gray-400">{k}</span>
                              <span className="font-mono text-gray-200">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-indigo-400">
                          최고 수익률:{' '}
                          <span className="font-bold text-base text-indigo-300">
                            {formatPercent(gridLatest.current_best_return)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {result && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetricCard label="전략 수익률" value={formatPercent(result.metrics.total_return)} positive={result.metrics.total_return >= 0} />
                  <MetricCard label="매수보유 수익률" value={formatPercent(result.metrics.buy_hold_return)} positive={result.metrics.buy_hold_return >= 0} />
                  <MetricCard label="연간 수익률" value={formatPercent(result.metrics.annual_return)} positive={result.metrics.annual_return >= 0} />
                  <MetricCard label="최대 낙폭" value={formatPercent(result.metrics.max_drawdown)} positive={false} forceRed />
                  <MetricCard label="총 거래 횟수" value={`${result.metrics.total_trades}회`} positive />
                  <MetricCard label="최종 자산" value={`$${result.metrics.final_value.toLocaleString()}`} positive={result.metrics.total_return >= 0} />
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4 text-gray-300">수익률 차트</h3>
                  <BacktestChart
                    data={result.chart_data as unknown as Parameters<typeof BacktestChart>[0]['data']}
                    initialCapital={initialCapital}
                    ticker={result.ticker}
                  />
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300">AI 분석</h3>
                    {!aiAnalysis && (
                      <button
                        onClick={handleAiAnalysis}
                        disabled={aiLoading || !result.backtest_id}
                        className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        {aiLoading ? '분석 중...' : 'AI 분석 요청'}
                      </button>
                    )}
                  </div>
                  {aiLoading && (
                    <div className="text-gray-400 text-sm animate-pulse">AI가 분석 중입니다...</div>
                  )}
                  {aiAnalysis && (
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                      <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                  )}
                  {!aiAnalysis && !aiLoading && (
                    <p className="text-gray-500 text-xs">AI 분석 버튼을 눌러 전략 분석을 받으세요.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">백테스트 히스토리</h2>
          {historyLoading ? (
            <div className="text-gray-400 text-sm animate-pulse">로딩 중...</div>
          ) : history.length === 0 ? (
            <div className="text-gray-500 text-sm">백테스트 기록이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-700">
                    <th className="text-left py-2 pr-4">티커</th>
                    <th className="text-left py-2 pr-4">전략</th>
                    <th className="text-left py-2 pr-4">기간</th>
                    <th className="text-right py-2 pr-4">수익률</th>
                    <th className="text-right py-2 pr-4">매수보유</th>
                    <th className="text-right py-2 pr-4">MDD</th>
                    <th className="text-right py-2">날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2 pr-4 font-mono text-emerald-400">{h.ticker}</td>
                      <td className="py-2 pr-4 text-gray-300">
                        {STRATEGY_LABELS[h.strategy] ?? h.strategy}
                      </td>
                      <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                        {h.start_date} ~ {h.end_date}
                      </td>
                      <td className={`py-2 pr-4 text-right ${(h.total_return ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {h.total_return != null ? formatPercent(h.total_return) : '-'}
                      </td>
                      <td className={`py-2 pr-4 text-right ${(h.buy_hold_return ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {h.buy_hold_return != null ? formatPercent(h.buy_hold_return) : '-'}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-400">
                        {h.max_drawdown != null ? formatPercent(h.max_drawdown) : '-'}
                      </td>
                      <td className="py-2 text-right text-gray-500 text-xs whitespace-nowrap">
                        {new Date(h.executed_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
