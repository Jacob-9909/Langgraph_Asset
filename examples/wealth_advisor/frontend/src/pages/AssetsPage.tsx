import { useState, useEffect, type FormEvent } from 'react'
import api from '../api/client'
import type { AssetCreate, AssetResponse } from '../types'
import { ASSET_TYPE_LABELS } from '../constants/labels'
import { formatKRW } from '../utils/format'

const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS)

const STOCK_TYPES = new Set(['stock', 'crypto', 'fund'])
const DEPOSIT_TYPES = new Set(['deposit', 'savings', 'bond', 'insurance', 'pension'])

const emptyForm = (): AssetCreate => ({
  asset_type: 'deposit',
  asset_name: '',
  amount_krw: 0,
  interest_rate: null,
  quantity: null,
  buy_price_krw: null,
  current_price_krw: null,
  start_date: null,
  maturity_date: null,
  notes: null,
})

function AssetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: AssetCreate
  onSave: (data: AssetCreate) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<AssetCreate>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof AssetCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const isStock = STOCK_TYPES.has(form.asset_type)
  const isDeposit = DEPOSIT_TYPES.has(form.asset_type)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">자산 유형</label>
          <select
            value={form.asset_type}
            onChange={(e) => set('asset_type', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">자산명</label>
          <input
            type="text"
            required
            value={form.asset_name}
            onChange={(e) => set('asset_name', e.target.value)}
            placeholder="예) KB국민은행 정기예금"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">금액 (원)</label>
          <input
            type="text"
            required
            value={form.amount_krw ? form.amount_krw.toLocaleString() : ''}
            onChange={(e) => {
              const v = parseInt(e.target.value.replace(/,/g, ''), 10)
              set('amount_krw', isNaN(v) ? 0 : v)
            }}
            placeholder="10,000,000"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {isDeposit && (
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">금리 (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.interest_rate ?? ''}
              onChange={(e) => set('interest_rate', e.target.value ? Number(e.target.value) : null)}
              placeholder="3.5"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {isStock && (
          <>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">수량</label>
              <input
                type="number"
                step="any"
                value={form.quantity ?? ''}
                onChange={(e) => set('quantity', e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">매입 단가 (원)</label>
              <input
                type="text"
                value={form.buy_price_krw != null ? form.buy_price_krw.toLocaleString() : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value.replace(/,/g, ''), 10)
                  set('buy_price_krw', isNaN(v) ? null : v)
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">현재 단가 (원)</label>
              <input
                type="text"
                value={form.current_price_krw != null ? form.current_price_krw.toLocaleString() : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value.replace(/,/g, ''), 10)
                  set('current_price_krw', isNaN(v) ? null : v)
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        )}

        {(isDeposit || form.asset_type === 'real_estate') && (
          <>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">시작일</label>
              <input
                type="date"
                value={form.start_date ?? ''}
                onChange={(e) => set('start_date', e.target.value || null)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">만기일</label>
              <input
                type="date"
                value={form.maturity_date ?? ''}
                onChange={(e) => set('maturity_date', e.target.value || null)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">메모</label>
        <input
          type="text"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || null)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-semibold text-sm transition"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg font-semibold text-sm transition"
        >
          취소
        </button>
      </div>
    </form>
  )
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<AssetResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)

  const loadAssets = async () => {
    const { data } = await api.get<AssetResponse[]>('/assets')
    setAssets(data)
  }

  useEffect(() => {
    loadAssets().finally(() => setLoading(false))
  }, [])

  const handleCreate = async (data: AssetCreate) => {
    await api.post('/assets', data)
    await loadAssets()
    setShowForm(false)
  }

  const handleUpdate = async (data: AssetCreate) => {
    if (!editTarget) return
    await api.put(`/assets/${editTarget.id}`, data)
    await loadAssets()
    setEditTarget(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 자산을 삭제하시겠습니까?')) return
    setDeleteLoading(id)
    try {
      await api.delete(`/assets/${id}`)
      setAssets((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeleteLoading(null)
    }
  }

  const totalKRW = assets.reduce((sum, a) => sum + a.amount_krw, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">자산 관리</h1>
        {!showForm && !editTarget && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + 자산 추가
          </button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">총 자산: <span className="text-emerald-400 font-semibold">{formatKRW(totalKRW)}원</span></p>

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">새 자산 추가</h2>
          <AssetForm
            initial={emptyForm()}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editTarget && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">자산 수정</h2>
          <AssetForm
            initial={editTarget}
            onSave={handleUpdate}
            onCancel={() => setEditTarget(null)}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400 animate-pulse">
          로딩 중...
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-500">
          등록된 자산이 없습니다. 자산을 추가해보세요.
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-800/80">
                <th className="text-left py-3 px-4">유형</th>
                <th className="text-left py-3 px-4">자산명</th>
                <th className="text-right py-3 px-4">금액</th>
                <th className="text-right py-3 px-4">상세</th>
                <th className="text-right py-3 px-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-3 px-4">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{a.asset_name}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-emerald-400">
                    {formatKRW(a.amount_krw)}원
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-gray-500">
                    {a.interest_rate != null && `금리 ${a.interest_rate}%`}
                    {a.quantity != null && `${a.quantity}주`}
                    {a.maturity_date && ` 만기 ${a.maturity_date}`}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditTarget(a); setShowForm(false) }}
                        className="text-xs text-gray-400 hover:text-white transition"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deleteLoading === a.id}
                        className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
