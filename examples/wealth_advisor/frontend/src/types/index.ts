// ── Auth ──────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: number
  name: string
}

export interface PendingUserResponse {
  id: number
  email: string
  name: string
  created_at: string
}

export interface AdminUserResponse {
  id: number
  email: string
  name: string
  is_approved: boolean
  is_admin: boolean
  asset_count: number
  total_assets_krw: number
  created_at: string
}

export interface AdminStatsResponse {
  total_users: number
  approved_users: number
  pending_users: number
  total_assets_all_krw: number
}

// ── Profile ──────────────────────────────────────────

export interface ProfileUpdate {
  age_band?: string | null
  monthly_surplus_krw?: number | null
  horizon_months?: number | null
  risk_tolerance?: string | null
  goal?: string | null
  employment_type?: string | null
  annual_income_band?: string | null
  tax_wrappers_note?: string | null
}

export interface ProfileResponse extends ProfileUpdate {
  updated_at?: string | null
}

// ── Assets ───────────────────────────────────────────

export interface AssetCreate {
  asset_type: string
  asset_name: string
  amount_krw: number
  interest_rate?: number | null
  quantity?: number | null
  buy_price_krw?: number | null
  current_price_krw?: number | null
  start_date?: string | null
  maturity_date?: string | null
  notes?: string | null
}

export interface AssetResponse extends AssetCreate {
  id: number
  created_at: string
}

// ── Agent ────────────────────────────────────────────

export interface AgentResultResponse {
  id: number
  recommendation?: string | null
  market_notes?: string | null
  macro_market_notes?: string | null
  tax_market_notes?: string | null
  executed_at: string
}

// ── Dashboard ────────────────────────────────────────

export interface DashboardSummary {
  total_assets_krw: number
  asset_count: number
  assets_by_type: Record<string, number>
  assets: AssetResponse[]
  profile: ProfileResponse | null
  recent_recommendation: AgentResultResponse | null
  is_admin: boolean
}

// ── Backtest ─────────────────────────────────────────

export interface BacktestRequest {
  ticker: string
  strategy: string
  start_date: string
  end_date: string
  initial_capital: number
}

export interface BacktestMetrics {
  total_return: number
  buy_hold_return: number
  annual_return: number
  max_drawdown: number
  total_trades: number
  final_value: number
}

export interface BacktestResponse {
  metrics: BacktestMetrics
  chart_data: Record<string, unknown>[]
  strategy: string
  ticker: string
  backtest_id?: number | null
}

export interface GridSearchRequest {
  ticker: string
  strategy: string
  start_date: string
  end_date: string
  initial_capital: number
}

export interface StrategyInfo {
  name: string
  label: string
  description: string
  default_params: Record<string, unknown>
}

export interface BacktestResultResponse {
  id: number
  ticker: string
  strategy: string
  start_date: string
  end_date: string
  initial_capital: number
  total_return?: number | null
  annual_return?: number | null
  max_drawdown?: number | null
  buy_hold_return?: number | null
  total_trades?: number | null
  final_value?: number | null
  ai_analysis?: string | null
  executed_at: string
}
