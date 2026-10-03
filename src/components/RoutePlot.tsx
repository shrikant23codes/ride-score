import { MODERATE_INTENSITY_THRESHOLD, ROUGH_INTENSITY_THRESHOLD } from '../ride/scoring'
import type { LocationSample, ProcessedSecond } from '../ride/types'

interface RoutePlotProps {
  locations: LocationSample[]
  seconds: ProcessedSecond[]
}

function closestIntensity(timestamp: number, seconds: ProcessedSecond[]): number | null {
  let result: number | null = null
  let difference = Number.POSITIVE_INFINITY
  for (const second of seconds) {
    if (second.intensity === null) continue
    const currentDifference = Math.abs(second.startTimestamp - timestamp)
    if (currentDifference < difference) {
      difference = currentDifference
      result = second.intensity
    }
  }
  return result
}

function colorFor(intensity: number | null): string {
  if (intensity === null) return '#aab7b2'
  if (intensity >= ROUGH_INTENSITY_THRESHOLD) return '#e35a4f'
  if (intensity >= MODERATE_INTENSITY_THRESHOLD) return '#e3ad3c'
  return '#2d9b73'
}

export function RoutePlot({ locations, seconds }: RoutePlotProps) {
  if (locations.length < 2) return <p className="empty-chart">At least two GPS positions are needed to draw the route.</p>
  const latitudes = locations.map((location) => location.latitude)
  const longitudes = locations.map((location) => location.longitude)
  const latitudeRange = Math.max(...latitudes) - Math.min(...latitudes) || 0.0001
  const longitudeRange = Math.max(...longitudes) - Math.min(...longitudes) || 0.0001
  const padding = 24
  const size = 360
  const pointFor = (location: LocationSample) => ({
    x: padding + ((location.longitude - Math.min(...longitudes)) / longitudeRange) * (size - padding * 2),
    y: size - padding - ((location.latitude - Math.min(...latitudes)) / latitudeRange) * (size - padding * 2)
  })
  const points = locations.map(pointFor)

  return (
    <>
      <svg className="route-plot" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Route coloured by disturbance intensity">
        {points.slice(1).map((point, index) => {
          const previous = points[index]
          const intensity = closestIntensity(locations[index + 1].timestamp, seconds)
          return <line key={`${locations[index].timestamp}-${locations[index + 1].timestamp}`} x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} stroke={colorFor(intensity)} strokeWidth="8" strokeLinecap="round" />
        })}
        <circle cx={points[0].x} cy={points[0].y} r="7" className="route-start" />
        <circle cx={points.at(-1)?.x} cy={points.at(-1)?.y} r="7" className="route-end" />
      </svg>
      <p className="legend"><span className="green-dot" /> Low <span className="yellow-dot" /> Moderate <span className="red-dot" /> High</p>
    </>
  )
}
