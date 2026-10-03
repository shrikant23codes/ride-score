import { useEffect, useReducer, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { RideRecorder, requestLocationPermission, requestMotionPermission } from './ride/recorder'
import { scoreRide } from './ride/scoring'
import { deleteRide, getRecoverableRide, saveRide } from './ride/storage'
import type { RecordingStatus, Ride } from './ride/types'
import { ReadyScreen } from './screens/ReadyScreen'
import { RecordingScreen } from './screens/RecordingScreen'
import { ResultsScreen } from './screens/ResultsScreen'

type AppPhase = 'ready' | 'requesting-permission' | 'recording' | 'interrupted' | 'processing' | 'results' | 'permission-denied' | 'error'

interface AppState {
  phase: AppPhase
  ride?: Ride
  message?: string
}

type Action =
  | { type: 'REQUEST' }
  | { type: 'RECORDING'; ride: Ride }
  | { type: 'INTERRUPTED'; ride: Ride }
  | { type: 'PROCESSING' }
  | { type: 'RESULTS'; ride: Ride }
  | { type: 'READY' }
  | { type: 'PERMISSION_DENIED'; message: string }
  | { type: 'ERROR'; message: string }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'REQUEST': return { phase: 'requesting-permission' }
    case 'RECORDING': return { phase: 'recording', ride: action.ride }
    case 'INTERRUPTED': return { phase: 'interrupted', ride: action.ride }
    case 'PROCESSING': return { ...state, phase: 'processing' }
    case 'RESULTS': return { phase: 'results', ride: action.ride }
    case 'READY': return { phase: 'ready' }
    case 'PERMISSION_DENIED': return { phase: 'permission-denied', message: action.message }
    case 'ERROR': return { phase: 'error', message: action.message }
  }
}

const initialStatus: RecordingStatus = {
  elapsedMs: 0,
  motionSampleCount: 0,
  locationSampleCount: 0,
  latestMagnitude: null,
  usingGravityFreeAcceleration: false,
  interrupted: false
}

function isPermissionError(message: string): boolean {
  return /permission|denied|not granted/i.test(message)
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { phase: 'ready' })
  const [status, setStatus] = useState<RecordingStatus>(initialStatus)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const updateServiceWorker = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined)
  const recorder = useRef<RideRecorder | undefined>(undefined)

  useEffect(() => {
    updateServiceWorker.current = registerSW({ onNeedRefresh: () => setUpdateAvailable(true) })
    void getRecoverableRide().then((ride) => {
      if (ride) dispatch({ type: 'INTERRUPTED', ride })
    }).catch(() => {
      // A new installation may not have an IndexedDB database yet.
    })
  }, [])

  const startRide = async (): Promise<void> => {
    dispatch({ type: 'REQUEST' })
    try {
      // Start both browser permission requests within the Start Ride tap handler.
      const locationPermission = requestLocationPermission()
      const motionPermission = requestMotionPermission()
      const [initialLocation] = await Promise.all([locationPermission, motionPermission])
      const nextRecorder = new RideRecorder((nextStatus) => setStatus(nextStatus))
      recorder.current = nextRecorder
      setStatus(initialStatus)
      const ride = await nextRecorder.start(initialLocation)
      dispatch({ type: 'RECORDING', ride })
    } catch (error) {
      recorder.current = undefined
      const message = error instanceof Error ? error.message : 'Could not start this ride.'
      dispatch(isPermissionError(message) ? { type: 'PERMISSION_DENIED', message } : { type: 'ERROR', message })
    }
  }

  const processRide = async (ride: Ride): Promise<void> => {
    if (!ride.endTimestamp) ride.endTimestamp = Date.now()
    dispatch({ type: 'PROCESSING' })
    try {
      const result = scoreRide(ride.motionSamples, ride.locationSamples, ride.startTimestamp, ride.endTimestamp)
      const completeRide: Ride = { ...ride, status: 'completed', ...result }
      await saveRide(completeRide)
      dispatch({ type: 'RESULTS', ride: completeRide })
    } catch (error) {
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Could not process this ride.' })
    }
  }

  const stopRide = async (): Promise<void> => {
    try {
      const ride = await recorder.current?.stop()
      recorder.current = undefined
      if (!ride) throw new Error('The active ride could not be found.')
      await processRide(ride)
    } catch (error) {
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'Could not stop this ride.' })
    }
  }

  const discardRecoveredRide = async (): Promise<void> => {
    if (state.ride) await deleteRide(state.ride.id)
    dispatch({ type: 'READY' })
  }

  const startAnother = (): void => {
    setStatus(initialStatus)
    dispatch({ type: 'READY' })
  }

  return (
    <main className="app-shell">
      <nav className="topbar"><span className="brand">Ride Score</span><span>Local-only PWA</span></nav>
      {updateAvailable && state.phase !== 'recording' && (
        <div className="update-banner">An app update is ready. <button onClick={() => void updateServiceWorker.current?.(true)}>Reload to update</button></div>
      )}
      {state.phase === 'ready' || state.phase === 'requesting-permission' ? <ReadyScreen onStart={() => void startRide()} busy={state.phase === 'requesting-permission'} /> : null}
      {state.phase === 'recording' ? <RecordingScreen status={status} onStop={() => void stopRide()} /> : null}
      {state.phase === 'processing' ? <section className="panel"><p className="eyebrow">Processing locally</p><h1>Calculating your ride result…</h1></section> : null}
      {state.phase === 'results' && state.ride ? <ResultsScreen ride={state.ride} onNewRide={startAnother} /> : null}
      {state.phase === 'interrupted' && state.ride ? (
        <section className="panel">
          <p className="eyebrow">Recovered local ride</p><h1>Finish the saved recording?</h1>
          <p className="lead">A previous ride was saved on this device. It may have a gap because the app was interrupted.</p>
          <div className="button-row"><button className="primary" onClick={() => void processRide(state.ride as Ride)}>Process saved ride</button><button className="secondary" onClick={() => void discardRecoveredRide()}>Discard</button></div>
        </section>
      ) : null}
      {(state.phase === 'permission-denied' || state.phase === 'error') ? (
        <section className="panel"><p className="eyebrow">{state.phase === 'permission-denied' ? 'Permission needed' : 'Something went wrong'}</p><h1>{state.message}</h1><button className="primary" onClick={startAnother}>Back to start</button></section>
      ) : null}
    </main>
  )
}
