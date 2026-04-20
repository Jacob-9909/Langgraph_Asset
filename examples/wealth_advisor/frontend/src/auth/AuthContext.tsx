import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import api from '../api/client'
import type { TokenResponse } from '../types'

interface AuthState {
  token: string | null
  userName: string | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<TokenResponse>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('wa_token'))
  const [userName, setUserName] = useState<string | null>(() => sessionStorage.getItem('wa_name'))

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
    sessionStorage.setItem('wa_token', data.access_token)
    sessionStorage.setItem('wa_name', data.name)
    setToken(data.access_token)
    setUserName(data.name)
    return data
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    await api.post('/auth/register', { email, password, name })
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('wa_token')
    sessionStorage.removeItem('wa_name')
    setToken(null)
    setUserName(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, userName, isLoggedIn: !!token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
