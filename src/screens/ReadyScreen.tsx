interface ReadyScreenProps {
  onStart: () => void
  busy: boolean
}

export function ReadyScreen({ onStart, busy }: ReadyScreenProps) {
  return (
    <section className="panel ready-panel">
      <p className="eyebrow">Ride disturbance recorder</p>
      <h1>Capture how the journey feels.</h1>
      <p className="lead">Ride Score records gravity-free motion and GPS while your iPhone stays mounted in the foreground.</p>
      <div className="notice">
        <strong>Before you start</strong>
        <ul>
          <li>Secure the iPhone in a rigid mount.</li>
          <li>Keep the screen on and the app visible.</li>
          <li>Do not handle or reposition the phone during the ride.</li>
        </ul>
      </div>
      <button className="primary" onClick={onStart} disabled={busy}>{busy ? 'Requesting access…' : 'Start ride'}</button>
      <p className="fine-print">Your ride stays on this device. Braking, turns, bumps, and vibration may all raise the result.</p>
    </section>
  )
}
