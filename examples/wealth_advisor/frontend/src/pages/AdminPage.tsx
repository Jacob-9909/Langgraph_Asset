import { useState, useEffect } from 'react'
import api from '../api/client'
import { formatKRW } from '../utils/format'
import type { AdminUserResponse, AdminStatsResponse, PendingUserResponse } from '../types'

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [pending, setPending] = useState<PendingUserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('pending')

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, pendingRes] = await Promise.all([
        api.get<AdminStatsResponse>('/admin/stats'),
        api.get<AdminUserResponse[]>('/admin/users'),
        api.get<PendingUserResponse[]>('/admin/pending'),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
      setPending(pendingRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleApprove = async (userId: number) => {
    setActionLoading(userId)
    try {
      await api.post(`/admin/approve/${userId}`)
      await loadData()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: number) => {
    if (!confirm('이 사용자를 삭제하시겠습니까?')) return
    setActionLoading(userId)
    try {
      await api.delete(`/admin/reject/${userId}`)
      await loadData()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 animate-pulse">
        로딩 중...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">관리자 대시보드</h1>
      <p className="text-gray-400 text-sm mb-6">사용자 관리 및 시스템 현황</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '전체 사용자', value: `${stats.total_users}명` },
            { label: '승인된 사용자', value: `${stats.approved_users}명`, accent: 'text-emerald-400' },
            { label: '승인 대기', value: `${stats.pending_users}명`, accent: stats.pending_users > 0 ? 'text-amber-400' : undefined },
            { label: '전체 자산 합계', value: `${formatKRW(stats.total_assets_all_krw)}원` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.accent ?? ''}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1 w-fit">
        {([
          { key: 'pending', label: `승인 대기 ${pending.length > 0 ? `(${pending.length})` : ''}` },
          { key: 'all', label: '전체 사용자' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === t.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending Users */}
      {activeTab === 'pending' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {pending.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">승인 대기 사용자가 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-3 px-4">이름</th>
                  <th className="text-left py-3 px-4">이메일</th>
                  <th className="text-left py-3 px-4">가입일</th>
                  <th className="text-right py-3 px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-gray-400">{u.email}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-medium transition"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(u.id)}
                          disabled={actionLoading === u.id}
                          className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-medium transition"
                        >
                          거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* All Users */}
      {activeTab === 'all' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-3 px-4">이름</th>
                  <th className="text-left py-3 px-4">이메일</th>
                  <th className="text-left py-3 px-4">상태</th>
                  <th className="text-right py-3 px-4">자산 수</th>
                  <th className="text-right py-3 px-4">총 자산</th>
                  <th className="text-right py-3 px-4">가입일</th>
                  <th className="text-right py-3 px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-3 px-4 font-medium">
                      {u.name}
                      {u.is_admin && (
                        <span className="ml-2 text-xs bg-violet-900/50 text-violet-300 border border-violet-700 px-1.5 py-0.5 rounded-full">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        u.is_approved
                          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                          : 'bg-amber-900/40 text-amber-300 border-amber-700'
                      }`}>
                        {u.is_approved ? '승인됨' : '대기중'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">{u.asset_count}건</td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {formatKRW(u.total_assets_krw)}원
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!u.is_approved && !u.is_admin && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoading === u.id}
                            className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-2 py-1 rounded text-xs font-medium transition"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            disabled={actionLoading === u.id}
                            className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs font-medium transition"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
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
