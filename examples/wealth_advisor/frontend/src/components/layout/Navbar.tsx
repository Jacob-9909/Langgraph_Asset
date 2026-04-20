import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileOpen(false)
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo-48.png" alt="logo" className="h-7 w-7" />
          <span className="text-gray-900 dark:text-white font-bold text-lg">Wealth Advisor</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          {isLoggedIn ? (
            <>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                    pathname.startsWith(l.to)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <span className="text-gray-300 dark:text-gray-700 mx-1">|</span>
              <Link
                to="/profile"
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  pathname === '/profile'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                {userName}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">로그인</Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-600 dark:text-gray-300 p-2 focus:outline-none">
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isLoggedIn ? (
              <>
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith(l.to)
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-800 my-1 pt-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    프로필 ({userName})
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
