import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import api from '../api/client'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
        const dashboard = await api.get('/dashboard')
        if (dashboard.data.is_admin) {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
      } else {
        await api.post('/auth/register', { email, password, name })
        setSuccess('회원가입 완료! 관리자 승인 후 로그인할 수 있습니다.')
        setMode('login')
        setPassword('')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '요청 실패'
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr.response?.data?.detail || msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <img src="/images/logo-128.png" alt="logo" className="w-16 h-16 mx-auto mb-3" />
          <h2 className="text-xl font-bold">{mode === 'login' ? '로그인' : '회원가입'}</h2>
        </div>

        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded p-3 mb-4 text-sm">{error}</div>}
        {success && <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded p-3 mb-4 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="wa-input-auth"
            />
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="wa-input-auth"
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="wa-input-auth"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}
