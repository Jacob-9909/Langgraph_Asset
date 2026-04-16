import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { DashboardSummary } from '../types'
import { ASSET_TYPE_LABELS } from '../constants/labels'
import { formatKRW } from '../utils/format'

export default function DashboardPage() {
  const { userName } = useAuth()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardSummary>('/dashboard').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>
  if (!data) return <div className="p-8 text-center text-red-400">데이터를 불러올 수 없습니다.</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{userName}님의 대시보드</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div className="text-gray-400 text-sm mb-1">총 자산</div>
          <div className="text-2xl font-bold text-emerald-400">{formatKRW(data.total_assets_krw)}원</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div className="text-gray-400 text-sm mb-1">보유 자산 수</div>
          <div className="text-2xl font-bold">{data.asset_count}건</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div className="text-gray-400 text-sm mb-1">최근 상담</div>
          <div className="text-lg font-bold">
            {data.recent_recommendation ? new Date(data.recent_recommendation.executed_at).toLocaleDateString('ko-KR') : '없음'}
          </div>
        </div>
      </div>

      {/* Assets by Type */}
      {data.asset_count > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">자산 유형별 분포</h2>
          <div className="space-y-2">
            {Object.entries(data.assets_by_type).map(([type, amount]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-gray-300">{ASSET_TYPE_LABELS[type] || type}</span>
                <span className="text-gray-400 tabular-nums">{formatKRW(amount)}원</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset List */}
      {data.assets.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">보유 자산 목록</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">유형</th>
                  <th className="text-left py-2">자산명</th>
                  <th className="text-right py-2">금액</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((a) => (
                  <tr key={a.id} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-400">{ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}</td>
                    <td className="py-2">{a.asset_name}</td>
                    <td className="py-2 text-right tabular-nums">{formatKRW(a.amount_krw)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
