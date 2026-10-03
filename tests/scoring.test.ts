import { describe, expect, it } from 'vitest'
import { magnitude, scoreRide } from '../src/ride/scoring'
import type { LocationSample, MotionSample } from '../src/ride/types'

const start = 1_000_000

function motion(timestampOffset: number, x = 0, y = 0, z = 0): MotionSample {
  return { timestamp: start + timestampOffset, x, y, z }
}

function location(timestampOffset: number, speed: number | null): LocationSample {
  return { timestamp: start + timestampOffset, latitude: 12.9716, longitude: 77.5946, speed, accuracy: 5 }
}

describe('ride scoring', () => {
  it('calculates a direction-independent motion magnitude', () => {
    expect(magnitude(motion(0, 3, 4, 12))).toBe(13)
  })

  it('does not score idle time as moving', () => {
    const result = scoreRide([motion(100, 10), motion(1100, 1)], [location(500, 0), location(1500, 4)], start, start + 2_000)
    expect(result.processedSeconds.map((second) => second.moving)).toEqual([false, true])
    expect(result.summary.averageMovingIntensity).toBe(1)
    expect(result.summary.movingDurationMs).toBe(1_000)
    expect(result.summary.idleDurationMs).toBe(1_000)
  })

  it('uses RMS so one large event raises a second intensity', () => {
    const result = scoreRide([motion(50, 1), motion(100, 5)], [location(500, 4)], start, start + 1_000)
    expect(result.processedSeconds[0].intensity).toBeCloseTo(Math.sqrt(13))
  })

  it('gives stronger synthetic motion a higher overall result', () => {
    const locations = [location(500, 3), location(1500, 3)]
    const gentle = scoreRide([motion(100, 0.2), motion(1100, 0.2)], locations, start, start + 2_000)
    const strong = scoreRide([motion(100, 2), motion(1100, 2)], locations, start, start + 2_000)
    expect(strong.summary.averageMovingIntensity).toBeGreaterThan(gentle.summary.averageMovingIntensity as number)
  })

  it('handles several medium events and creates per-second windows', () => {
    const result = scoreRide(
      [motion(0, 0.8), motion(400, 0.8), motion(1_100, 0.8), motion(2_900, 0.8)],
      [location(500, 2), location(1500, 2), location(2500, 2)],
      start,
      start + 3_000
    )
    expect(result.processedSeconds).toHaveLength(3)
    expect(result.summary.disturbedMovingPercentage).toBe(100)
  })

  it('tolerates missing samples and irregular timestamps', () => {
    const result = scoreRide([motion(20, 1), motion(2_950, 3)], [location(300, 2), location(2_700, 2)], start, start + 3_000)
    expect(result.processedSeconds.map((second) => second.intensity)).toEqual([1, null, 3])
    expect(result.summary.movingDurationMs).toBe(2_000)
  })

  it('does not calculate a moving score without usable GPS speed', () => {
    const result = scoreRide([motion(100, 2)], [location(500, null)], start, start + 1_000)
    expect(result.summary.averageMovingIntensity).toBeNull()
    expect(result.summary.label).toBe('Not scored')
    expect(result.summary.usableSpeedSamples).toBe(0)
  })

  it('handles empty and very short rides', () => {
    const empty = scoreRide([], [], start, start)
    const short = scoreRide([motion(0, 1)], [location(0, 2)], start, start + 100)
    expect(empty.processedSeconds).toEqual([])
    expect(empty.summary.maximumIntensity).toBeNull()
    expect(short.processedSeconds).toHaveLength(1)
    expect(short.summary.averageMovingIntensity).toBe(1)
  })
})
