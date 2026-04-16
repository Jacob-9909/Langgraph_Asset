import { useState, useRef, useEffect } from 'react'
import api from '../../api/client'

interface Suggestion {
  symbol: string
  name: string
  exchange: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TickerSearch({ value, onChange, placeholder = 'AAPL' }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [show, setShow] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setShow(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = (q: string) => {
    clearTimeout(timerRef.current)
    if (q.trim().length < 1) {
      setSuggestions([])
      setShow(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get<Suggestion[]>('/backtest/ticker-search', { params: { q } })
        setSuggestions(data)
        setShow(data.length > 0)
        setHighlighted(-1)
      } catch {
        /* ignore */
      }
    }, 300)
  }

  const pick = (s: Suggestion) => {
    onChange(s.symbol)
    setSuggestions([])
    setShow(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!show) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      pick(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setShow(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase())
          fetchSuggestions(e.target.value)
        }}
        onFocus={() => suggestions.length > 0 && setShow(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 uppercase"
      />
      {show && (
        <ul className="absolute z-20 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-52 overflow-y-auto shadow-xl">
          {suggestions.map((s, i) => (
            <li
              key={s.symbol}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${
                i === highlighted ? 'bg-gray-700' : 'hover:bg-gray-700/60'
              }`}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className="font-semibold text-emerald-400 w-16 shrink-0">{s.symbol}</span>
              <span className="text-gray-300 truncate flex-1">{s.name}</span>
              <span className="text-gray-500 text-xs shrink-0">{s.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
