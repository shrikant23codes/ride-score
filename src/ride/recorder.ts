import { saveRide } from './storage'
import type { LocationSample, MotionSample, RecordingStatus, Ride } from './types'

const PERSIST_INTERVAL_MS = 5_000
const STATUS_INTERVAL_MS = 1_000

type StatusListener = (status: RecordingStatus) => void

function makeId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ride-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function positionToSample(position: GeolocationPosition): LocationSample {
  return {
    timestamp: position.timestamp || Date.now(),
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: position.coords.speed,
    accuracy: position.coords.accuracy
  }
}

function locationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access was denied. Allow Location for this website in iPhone Settings, then try again.'
    case error.POSITION_UNAVAILABLE:
      return 'Your location is currently unavailable. Check Location Services and try again outside or near a window.'
    case error.TIMEOUT:
      return 'Location took too long to respond. Check Location Services and try again.'
    default:
      return `Location could not be requested: ${error.message || 'unknown error'}`
  }
}

export async function requestLocationPermission(): Promise<LocationSample> {
  if (!navigator.geolocation) throw new Error('Location is not available in this browser.')
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(positionToSample(position)),
      (error) => reject(new Error(locationErrorMessage(error))),
      // A quick initial fix confirms permission; the recording watch requests high accuracy afterwards.
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 }
    )
  })
}

export async function requestMotionPermission(): Promise<void> {
  if (typeof DeviceMotionEvent === 'undefined') {
    throw new Error('Motion sensing is not available in this browser.')
  }
  const eventWithPermission = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<PermissionState>
  }
  if (eventWithPermission.requestPermission) {
    const permission = await eventWithPermission.requestPermission()
    if (permission !== 'granted') throw new Error('Motion permission was not granted.')
  }
}

export class RideRecorder {
  private ride: Ride | undefined
  private watchId: number | undefined
  private wakeLock: WakeLockSentinel | undefined
  private lastPersistedAt = 0
  private statusTimer: number | undefined
  private listener: StatusListener | undefined
  private latestMagnitude: number | null = null
  private stopped = false

  constructor(listener?: StatusListener) {
    this.listener = listener
  }

  async start(initialLocation: LocationSample): Promise<Ride> {
    if (this.ride && !this.stopped) throw new Error('A ride is already being recorded.')
    const now = Date.now()
    this.ride = {
      id: makeId(),
      startTimestamp: now,
      endTimestamp: null,
      status: 'recording',
      motionSamples: [],
      locationSamples: [initialLocation]
    }
    this.stopped = false
    this.lastPersistedAt = now
    await saveRide(this.ride)

    window.addEventListener('devicemotion', this.handleMotion)
    this.watchId = navigator.geolocation.watchPosition(
      this.handleLocation,
      this.handleLocationError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    )
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.statusTimer = window.setInterval(() => this.publishStatus(), STATUS_INTERVAL_MS)
    await this.acquireWakeLock()
    this.publishStatus()
    return this.ride
  }

  get activeRide(): Ride | undefined {
    return this.ride
  }

  async stop(): Promise<Ride> {
    const ride = this.ride
    if (!ride) throw new Error('There is no active ride to stop.')
    ride.endTimestamp = Date.now()
    ride.status = 'completed'
    await this.persist()
    this.cleanup()
    return ride
  }

  private handleMotion = (event: DeviceMotionEvent): void => {
    const acceleration = event.acceleration
    if (!this.ride || !acceleration) return
    const { x, y, z } = acceleration
    if (x === null || y === null || z === null) return
    const sample: MotionSample = { timestamp: Date.now(), x, y, z }
    this.ride.motionSamples.push(sample)
    this.latestMagnitude = Math.hypot(x, y, z)
    this.persistIfDue()
  }

  private handleLocation = (position: GeolocationPosition): void => {
    if (!this.ride) return
    this.ride.locationSamples.push(positionToSample(position))
    this.persistIfDue()
  }

  private handleLocationError = (): void => {
    void this.markInterrupted('Location updates stopped. Keep the app open and check location access.')
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      void this.markInterrupted('The app left the foreground; the recording may have a gap.')
    }
  }

  private async markInterrupted(reason: string): Promise<void> {
    if (!this.ride || this.stopped) return
    this.ride.status = 'interrupted'
    this.ride.interruptionReason = reason
    await this.persist()
    this.publishStatus()
  }

  private async acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return
    try {
      this.wakeLock = await navigator.wakeLock.request('screen')
      this.wakeLock.addEventListener('release', () => { this.wakeLock = undefined })
    } catch {
      // Wake Lock is best-effort; recording remains usable without it.
    }
  }

  private persistIfDue(): void {
    if (Date.now() - this.lastPersistedAt >= PERSIST_INTERVAL_MS) void this.persist()
  }

  private async persist(): Promise<void> {
    if (!this.ride) return
    await saveRide(this.ride)
    this.lastPersistedAt = Date.now()
  }

  private publishStatus(): void {
    if (!this.ride || !this.listener) return
    this.listener({
      elapsedMs: Date.now() - this.ride.startTimestamp,
      motionSampleCount: this.ride.motionSamples.length,
      locationSampleCount: this.ride.locationSamples.length,
      latestMagnitude: this.latestMagnitude,
      usingGravityFreeAcceleration: this.ride.motionSamples.length > 0,
      interrupted: this.ride.status === 'interrupted'
    })
  }

  private cleanup(): void {
    this.stopped = true
    window.removeEventListener('devicemotion', this.handleMotion)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)
    if (this.statusTimer !== undefined) window.clearInterval(this.statusTimer)
    if (this.wakeLock) void this.wakeLock.release()
    this.watchId = undefined
    this.statusTimer = undefined
    this.wakeLock = undefined
  }
}
