import { useState, useEffect, type FormEvent } from 'react'
import api from '../api/client'
import type { ProfileResponse, ProfileUpdate } from '../types'
import { RISK_LABELS, EMPLOYMENT_LABELS, INCOME_LABELS } from '../constants/labels'

const HORIZON_OPTIONS = [
  { value: 6, label: '6개월' },
  { value: 12, label: '1년' },
  { value: 24, label: '2년' },
  { value: 36, label: '3년' },
  { value: 60, label: '5년' },
  { value: 120, label: '10년' },
  { value: 240, label: '20년 이상' },
]

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileUpdate>({
    age_band: '',
    employment_type: '',
    annual_income_band: '',
    monthly_surplus_krw: null,
    horizon_months: null,
    risk_tolerance: '',
    goal: '',
    tax_wrappers_note: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ProfileResponse>('/profile').then((r) => {
      setForm({
        age_band: r.data.age_band ?? '',
        employment_type: r.data.employment_type ?? '',
        annual_income_band: r.data.annual_income_band ?? '',
        monthly_surplus_krw: r.data.monthly_surplus_krw ?? null,
        horizon_months: r.data.horizon_months ?? null,
        risk_tolerance: r.data.risk_tolerance ?? '',
        goal: r.data.goal ?? '',
        tax_wrappers_note: r.data.tax_wrappers_note ?? '',
      })
    }).finally(() => setLoading(false))
  }, [])

  const set = (key: keyof ProfileUpdate, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.put('/profile', form)
      setSuccess(true)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400 animate-pulse">로딩 중...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">재무 프로필</h1>
      <p className="text-gray-400 text-sm mb-6">AI 상담 시 사용되는 개인 재무 정보</p>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
        {success && (
          <div className="bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded-lg p-3 text-sm">
            프로필이 저장되었습니다.
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{error}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">연령대</label>
            <input
              type="text"
              value={form.age_band ?? ''}
              onChange={(e) => set('age_band', e.target.value)}
              placeholder="예) 30대 초반"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">소득 형태</label>
            <select
              value={form.employment_type ?? ''}
              onChange={(e) => set('employment_type', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">선택 안 함</option>
              {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">연 소득 구간</label>
            <select
              value={form.annual_income_band ?? ''}
              onChange={(e) => set('annual_income_band', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">선택 안 함</option>
              {Object.entries(INCOME_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">월 여유 자금 (원)</label>
            <input
              type="text"
              value={form.monthly_surplus_krw != null ? form.monthly_surplus_krw.toLocaleString() : ''}
              onChange={(e) => {
                const v = parseInt(e.target.value.replace(/,/g, ''), 10)
                set('monthly_surplus_krw', isNaN(v) ? null : v)
              }}
              placeholder="예) 500,000"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">목표 기간</label>
            <select
              value={form.horizon_months ?? ''}
              onChange={(e) => set('horizon_months', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">선택 안 함</option>
              {HORIZON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">위험 감수 성향</label>
            <select
              value={form.risk_tolerance ?? ''}
              onChange={(e) => set('risk_tolerance', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">선택 안 함</option>
              {Object.entries(RISK_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">재무 목표</label>
          <textarea
            value={form.goal ?? ''}
            onChange={(e) => set('goal', e.target.value)}
            placeholder="예) 5년 내 내 집 마련, 노후 준비..."
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">세제 혜택 계좌</label>
          <input
            type="text"
            value={form.tax_wrappers_note ?? ''}
            onChange={(e) => set('tax_wrappers_note', e.target.value)}
            placeholder="예) IRP, ISA, 연금저축"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  )
}
