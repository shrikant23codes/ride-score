import type { ProcessedSecond } from '../ride/types'

interface RideTimelineProps {
  seconds: ProcessedSecond[]
}

export function RideTimeline({ seconds }: RideTimelineProps) {
  const points = seconds.filter((second) => second.intensity !== null)
  if (points.length === 0) return <p className="empty-chart">No gravity-free motion samples were captured.</p>
  const maximum = Math.max(...points.map((point) => point.intensity as number), 0.1)
  const width = 720
  const height = 180
  const path = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
    const y = height - ((point.intensity as number) / maximum) * (height - 20) - 10
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  const area = `${path} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Disturbance intensity over time">
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} className="chart-axis" />
      <path d={area} className="timeline-area" />
      <path d={path} className="timeline-line" />
    </svg>
  )
}
