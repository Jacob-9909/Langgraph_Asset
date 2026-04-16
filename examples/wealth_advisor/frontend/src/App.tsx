import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import PageLayout from './components/layout/PageLayout'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import ProfilePage from './pages/ProfilePage'
import AgentPage from './pages/AgentPage'
import BacktestPage from './pages/BacktestPage'
import CheongyakPage from './pages/CheongyakPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute><AgentPage /></ProtectedRoute>} />
            <Route path="/backtest" element={<ProtectedRoute><BacktestPage /></ProtectedRoute>} />
            <Route path="/cheongyak" element={<ProtectedRoute><CheongyakPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          </Routes>
        </PageLayout>
      </AuthProvider>
    </BrowserRouter>
  )
}
