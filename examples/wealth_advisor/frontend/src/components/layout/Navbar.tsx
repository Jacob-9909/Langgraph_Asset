import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/assets', label: '자산관리' },
  { to: '/agent', label: 'AI 상담' },
  { to: '/backtest', label: '백테스트' },
  { to: '/cheongyak', label: '청약정보' },
]

export default function Navbar() {
  const { isLoggedIn, userName, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo-48.png" alt="logo" className="h-7 w-7" />
          <span className="text-white font-bold text-lg">Wealth Advisor</span>
        </Link>

        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          {isLoggedIn ? (
            <>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                    pathname.startsWith(l.to)
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <span className="text-gray-700 mx-1">|</span>
              <Link
                to="/profile"
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  pathname === '/profile'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                {userName}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-gray-400 hover:text-red-400 transition whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="text-gray-300 hover:text-white transition">로그인</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
