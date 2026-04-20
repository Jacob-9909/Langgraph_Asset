export const ASSET_TYPE_LABELS: Record<string, string> = {
  deposit: '예금',
  savings: '적금',
  stock: '주식',
  bond: '채권',
  fund: '펀드',
  insurance: '보험',
  pension: '연금',
  real_estate: '부동산',
  crypto: '암호화폐',
  cash: '현금/CMA',
  other: '기타',
}

export const RISK_LABELS: Record<string, string> = {
  low: '낮음 (안전)',
  mid: '중간',
  high: '높음 (수익 추구)',
}

export const EMPLOYMENT_LABELS: Record<string, string> = {
  employee: '직장인(근로)',
  self_employed: '사업/자영업',
  freelancer: '프리랜서',
  homemaker_student_retiree: '주부/학생/은퇴',
  other: '기타',
}

export const INCOME_LABELS: Record<string, string> = {
  under_35m: '~약 3,500만원',
  '35m_to_70m': '3,500~7,000만원',
  '70m_to_120m': '7,000만~1.2억원',
  over_120m: '1.2억원 초과',
  prefer_not_say: '비공개',
}

export const STRATEGY_LABELS: Record<string, string> = {
  sma_crossover: 'SMA 교차',
  macd: 'MACD',
  rsi: 'RSI',
  bollinger: '볼린저 밴드',
  obv: 'OBV',
  combined: '복합 전략',
}
