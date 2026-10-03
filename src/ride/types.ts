export type RideStatus = 'recording' | 'interrupted' | 'completed'

export interface MotionSample {
  timestamp: number
  x: number
  y: number
  z: number
}

export interface LocationSample {
  timestamp: number
  latitude: number
  longitude: number
  speed: number | null
  accuracy: number | null
}

export interface ProcessedSecond {
  startTimestamp: number
  intensity: number | null
  moving: boolean
  latitude?: number
  longitude?: number
}

export type RideLabel = 'Calm' | 'Moderate' | 'Rough' | 'Not scored'

export interface RideSummary {
  elapsedDurationMs: number
  movingDurationMs: number
  idleDurationMs: number
  averageMovingIntensity: number | null
  maximumIntensity: number | null
  disturbedMovingPercentage: number | null
  label: RideLabel
  usableSpeedSamples: number
}

export interface Ride {
  id: string
  startTimestamp: number
  endTimestamp: number | null
  status: RideStatus
  motionSamples: MotionSample[]
  locationSamples: LocationSample[]
  processedSeconds?: ProcessedSecond[]
  summary?: RideSummary
  interruptionReason?: string
}

export interface RecordingStatus {
  elapsedMs: number
  motionSampleCount: number
  locationSampleCount: number
  latestMagnitude: number | null
  usingGravityFreeAcceleration: boolean
  interrupted: boolean
}
