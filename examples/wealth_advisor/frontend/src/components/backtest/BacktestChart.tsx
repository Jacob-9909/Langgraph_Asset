import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface ChartPoint {
  date: string
  portfolio_value?: number | null
  cumulative_returns?: number | null
}

interface Props {
  data: ChartPoint[]
  initialCapital: number
  ticker: string
}

export default function BacktestChart({ data, initialCapital, ticker }: Props) {
  const labels = data.map((d) => d.date)
  const strategyValues = data.map((d) => d.portfolio_value ?? null)
  const buyHoldValues = data.map((d) =>
    d.cumulative_returns != null ? Math.round(initialCapital * d.cumulative_returns) : null,
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: '전략',
        data: strategyValues,
        borderColor: 'rgb(52, 211, 153)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: `매수보유 (${ticker})`,
        data: buyHoldValues,
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 24 } },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => ` ${ctx.dataset.label}: $${ctx.parsed.y?.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', maxTicksLimit: 10 },
        grid: { color: 'rgba(75,85,99,0.3)' },
      },
      y: {
        ticks: {
          color: '#6b7280',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (value: any) => `$${Number(value).toLocaleString()}`,
        },
        grid: { color: 'rgba(75,85,99,0.3)' },
      },
    },
  }

  return <Line data={chartData} options={options} />
}
