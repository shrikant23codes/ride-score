import { RoutePlot } from '../components/RoutePlot'
import { RideTimeline } from '../components/RideTimeline'
import type { Ride } from '../ride/types'

interface ResultsScreenProps {
  ride: Ride
  onNewRide: () => void
}

function duration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function number(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? 'Not available' : `${value.toFixed(2)}${suffix}`
}

export function ResultsScreen({ ride, onNewRide }: ResultsScreenProps) {
  const summary = ride.summary
  const seconds = ride.processedSeconds ?? []
  if (!summary) return null
  return (
    <section className="results">
      <header className="result-heading">
        <p className="eyebrow">Ride result</p>
        <h1 className={`label-${summary.label.toLowerCase().replace(' ', '-')}`}>{summary.label}</h1>
        <p className="lead">A relative result for this phone, mount, and vehicle setup.</p>
      </header>
      {ride.interruptionReason && <p className="warning">{ride.interruptionReason}</p>}
      <div className="metric-grid">
        <div><span>Average moving intensity</span><strong>{number(summary.averageMovingIntensity, ' m/s²')}</strong></div>
        <div><span>Maximum intensity</span><strong>{number(summary.maximumIntensity, ' m/s²')}</strong></div>
        <div><span>Moving duration</span><strong>{duration(summary.movingDurationMs)}</strong></div>
        <div><span>Disturbed moving time</span><strong>{number(summary.disturbedMovingPercentage, '%')}</strong></div>
      </div>
      {summary.usableSpeedSamples === 0 && <p className="warning">GPS did not provide usable speed readings, so no moving-time score could be calculated.</p>}
      <article className="chart-panel"><h2>Disturbance timeline</h2><RideTimeline seconds={seconds} /></article>
      <article className="chart-panel"><h2>Route by disturbance</h2><RoutePlot locations={ride.locationSamples} seconds={seconds} /></article>
      <button className="primary" onClick={onNewRide}>Record another ride</button>
    </section>
  )
}
