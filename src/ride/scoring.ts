import type { LocationSample, MotionSample, ProcessedSecond, RideLabel, RideSummary } from './types'

export const MOVING_SPEED_THRESHOLD_MPS = 1
export const MODERATE_INTENSITY_THRESHOLD = 0.6
export const ROUGH_INTENSITY_THRESHOLD = 1.4

export interface ScoringOptions {
  movingSpeedThresholdMps?: number
  moderateIntensityThreshold?: number
  roughIntensityThreshold?: number
}

export interface ScoringResult {
  processedSeconds: ProcessedSecond[]
  summary: RideSummary
}

function nearestLocation(timestamp: number, locations: LocationSample[]): LocationSample | undefined {
  let closest: LocationSample | undefined
  let smallestDifference = Number.POSITIVE_INFINITY
  for (const location of locations) {
    const difference = Math.abs(location.timestamp - timestamp)
    if (difference < smallestDifference) {
      smallestDifference = difference
      closest = location
    }
  }
  return closest
}

function labelFor(value: number | null, moderate: number, rough: number): RideLabel {
  if (value === null) return 'Not scored'
  if (value >= rough) return 'Rough'
  if (value >= moderate) return 'Moderate'
  return 'Calm'
}

export function magnitude(sample: MotionSample): number {
  return Math.hypot(sample.x, sample.y, sample.z)
}

export function scoreRide(
  motionSamples: MotionSample[],
  locationSamples: LocationSample[],
  startTimestamp: number,
  endTimestamp: number,
  options: ScoringOptions = {}
): ScoringResult {
  const movingThreshold = options.movingSpeedThresholdMps ?? MOVING_SPEED_THRESHOLD_MPS
  const moderateThreshold = options.moderateIntensityThreshold ?? MODERATE_INTENSITY_THRESHOLD
  const roughThreshold = options.roughIntensityThreshold ?? ROUGH_INTENSITY_THRESHOLD
  const start = Math.min(startTimestamp, endTimestamp)
  const end = Math.max(startTimestamp, endTimestamp)
  const windowCount = Math.ceil((end - start) / 1000)
  const buckets = Array.from({ length: windowCount }, () => [] as number[])

  for (const sample of motionSamples) {
    const index = Math.floor((sample.timestamp - start) / 1000)
    if (index >= 0 && index < buckets.length) buckets[index].push(magnitude(sample))
  }

  const processedSeconds = buckets.map((values, index) => {
    const startOfSecond = start + index * 1000
    const location = nearestLocation(startOfSecond + 500, locationSamples)
    const intensity = values.length === 0
      ? null
      : Math.sqrt(values.reduce((total, value) => total + value ** 2, 0) / values.length)
    const moving = location?.speed !== null && location?.speed !== undefined && location.speed >= movingThreshold
    return {
      startTimestamp: startOfSecond,
      intensity,
      moving,
      ...(location ? { latitude: location.latitude, longitude: location.longitude } : {})
    }
  })

  const scoredMoving = processedSeconds.filter((second) => second.moving && second.intensity !== null)
  const scoredIdle = processedSeconds.filter((second) => !second.moving && second.intensity !== null)
  const movingIntensities = scoredMoving.map((second) => second.intensity as number)
  const allIntensities = processedSeconds
    .map((second) => second.intensity)
    .filter((intensity): intensity is number => intensity !== null)
  const average = movingIntensities.length === 0
    ? null
    : movingIntensities.reduce((total, value) => total + value, 0) / movingIntensities.length
  const disturbed = movingIntensities.length === 0
    ? null
    : (movingIntensities.filter((value) => value >= moderateThreshold).length / movingIntensities.length) * 100

  return {
    processedSeconds,
    summary: {
      elapsedDurationMs: end - start,
      movingDurationMs: scoredMoving.length * 1000,
      idleDurationMs: scoredIdle.length * 1000,
      averageMovingIntensity: average,
      maximumIntensity: allIntensities.length === 0 ? null : Math.max(...allIntensities),
      disturbedMovingPercentage: disturbed,
      label: labelFor(average, moderateThreshold, roughThreshold),
      usableSpeedSamples: locationSamples.filter((sample) => sample.speed !== null).length
    }
  }
}
