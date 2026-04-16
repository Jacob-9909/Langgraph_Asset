import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

interface CheongyakItem {
  house_manage_no: string
  pblanc_no: string
  house_nm: string
  house_secd_nm: string
  house_dtl_secd_nm: string
  rent_secd_nm: string
  region: string
  address: string
  total_supply: number
  announcement_date: string
  reception_start: string
  reception_end: string
  winner_date: string
  contract_start: string
  contract_end: string
  homepage: string
  constructor: string
  phone: string
  move_in_month: string
  status: string
}

type TabKey = 'apt' | 'officetel' | 'remaining' | 'opt' | 'public-rent'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'apt', label: 'APT' },
  { key: 'officetel', label: '오피스텔/도시형' },
  { key: 'remaining', label: '무순위/잔여' },
  { key: 'opt', label: '임의공급' },
  { key: 'public-rent', label: '공공지원임대' },
]

const STATUS_COLORS: Record<string, string> = {
  '접수중': 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  '접수예정': 'bg-blue-900/50 text-blue-300 border-blue-700',
  '마감': 'bg-gray-700/50 text-gray-400 border-gray-600',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-700/50 text-gray-400 border-gray-600'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status || '–'}</span>
  )
}

function CheongyakRow({ item }: { item: CheongyakItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 pr-3">
          <div className="font-medium text-sm">{item.house_nm}</div>
          <div className="text-xs text-gray-500 mt-0.5">{item.address}</div>
        </td>
        <td className="py-3 pr-3 text-xs text-gray-400 whitespace-nowrap">{item.region}</td>
        <td className="py-3 pr-3 text-xs text-gray-400 whitespace-nowrap">{item.house_dtl_secd_nm || item.house_secd_nm}</td>
        <td className="py-3 pr-3 text-xs text-gray-300 whitespace-nowrap tabular-nums">
          {item.total_supply?.toLocaleString() ?? '–'}세대
        </td>
        <td className="py-3 pr-3 text-xs text-gray-400 whitespace-nowrap">{item.reception_start} ~ {item.reception_end}</td>
        <td className="py-3">
          <StatusBadge status={item.status} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-700/50 bg-gray-800/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
              {[
                ['공고일', item.announcement_date],
                ['당첨자 발표', item.winner_date],
                ['계약일', item.contract_start ? `${item.contract_start} ~ ${item.contract_end}` : '–'],
                ['입주 예정', item.move_in_month],
                ['시공사', item.constructor],
                ['문의', item.phone],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-500 w-20 shrink-0">{label}</span>
                  <span className="text-gray-300">{value || '–'}</span>
                </div>
              ))}
              {item.homepage && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20 shrink-0">홈페이지</span>
                  <a
                    href={item.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.homepage}
                  </a>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function CheongyakPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('apt')
  const [items, setItems] = useState<CheongyakItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (tab: TabKey) => {
    setLoading(true)
    setError(null)
    setItems([])
    try {
      const { data } = await api.get<CheongyakItem[]>(`/cheongyak/${tab}`)
      setItems(data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(activeTab)
  }, [activeTab, loadData])

  const handleTab = (tab: TabKey) => setActiveTab(tab)

  const receiving = items.filter((i) => i.status === '접수중').length
  const upcoming = items.filter((i) => i.status === '접수예정').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">청약 정보</h1>
      <p className="text-gray-400 text-sm mb-6">공공데이터 분양 공고 실시간 조회 (행 클릭 시 상세 정보)</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === t.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary badges */}
      {!loading && items.length > 0 && (
        <div className="flex gap-3 mb-4">
          <span className="text-xs text-gray-400">{items.length}건</span>
          {receiving > 0 && (
            <span className="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700">
              접수중 {receiving}건
            </span>
          )}
          {upcoming > 0 && (
            <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700">
              접수예정 {upcoming}건
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400 animate-pulse">
          공고 데이터 로딩 중...
        </div>
      ) : items.length === 0 && !error ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-500">
          조회된 공고가 없습니다.
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-3 px-4 pr-3">단지명 / 주소</th>
                  <th className="text-left py-3 pr-3">지역</th>
                  <th className="text-left py-3 pr-3">유형</th>
                  <th className="text-left py-3 pr-3">공급</th>
                  <th className="text-left py-3 pr-3">접수기간</th>
                  <th className="text-left py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <CheongyakRow
                    key={`${item.house_manage_no}-${item.pblanc_no}`}
                    item={item}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
