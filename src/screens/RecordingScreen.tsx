import type { RecordingStatus } from '../ride/types'

interface RecordingScreenProps {
  status: RecordingStatus
  onStop: () => void
}

function elapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function RecordingScreen({ status, onStop }: RecordingScreenProps) {
  return (
    <section className="panel recording-panel">
      <p className="recording-badge"><span /> Recording</p>
      <h1>{elapsed(status.elapsedMs)}</h1>
      <p className="lead">Keep Ride Score open and your phone securely mounted.</p>
      {status.interrupted && <p className="warning">The app left the foreground or location updates paused. This ride may contain a gap.</p>}
      <div className="diagnostics" aria-label="Sensor diagnostic">
        <div><span>Motion</span><strong>{status.usingGravityFreeAcceleration ? 'Receiving acceleration' : 'Waiting for gravity-free acceleration'}</strong></div>
        <div><span>GPS</span><strong>{status.locationSampleCount} position{status.locationSampleCount === 1 ? '' : 's'}</strong></div>
        <div><span>Latest magnitude</span><strong>{status.latestMagnitude === null ? '—' : `${status.latestMagnitude.toFixed(2)} m/s²`}</strong></div>
      </div>
      <button className="stop" onClick={onStop}>Stop ride</button>
      <p className="fine-print">Samples are being saved locally throughout the ride.</p>
    </section>
  )
}
