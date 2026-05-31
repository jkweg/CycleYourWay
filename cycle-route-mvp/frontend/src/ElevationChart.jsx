import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const EARTH_RADIUS_METERS = 6371000

const toRadians = (degrees) => (degrees * Math.PI) / 180

const distanceBetweenPointsMeters = (pointA, pointB) => {
  const [lonA, latA] = pointA
  const [lonB, latB] = pointB
  const dLat = toRadians(latB - latA)
  const dLon = toRadians(lonB - lonA)
  const latARad = toRadians(latA)
  const latBRad = toRadians(latB)

  const haversineValue =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latARad) *
      Math.cos(latBRad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const arc = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  return EARTH_RADIUS_METERS * arc
}

function ElevationChart({ routeData }) {
  const chartData = useMemo(() => {
    const coordinates = routeData?.features?.[0]?.geometry?.coordinates
    if (!Array.isArray(coordinates) || coordinates.length < 2) return []

    let cumulativeDistanceMeters = 0

    return coordinates
      .map((point, index) => {
        if (!Array.isArray(point) || point.length < 3) return null

        if (index > 0 && Array.isArray(coordinates[index - 1])) {
          cumulativeDistanceMeters += distanceBetweenPointsMeters(
            coordinates[index - 1],
            point
          )
        }

        return {
          distance: Number((cumulativeDistanceMeters / 1000).toFixed(2)),
          elevation: Number(point[2].toFixed(1)),
        }
      })
      .filter(Boolean)
  }, [routeData])

  if (!chartData.length) return null

  return (
    <div className="soft-panel rounded-xl border border-emerald-100 bg-[#f8fbf6] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Profil wysokościowy
      </p>
      <div className="mt-3 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b7c54" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#3b7c54" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ddcf" />
            <XAxis
              dataKey="distance"
              tick={{ fontSize: 12, fill: '#4c4338' }}
              tickFormatter={(value) => `${value} km`}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#4c4338' }}
              tickFormatter={(value) => `${value} m`}
              width={52}
            />
            <Tooltip
              formatter={(value, name) =>
                name === 'elevation' ? [`${value} m n.p.m.`, 'Wysokość'] : [value, name]
              }
              labelFormatter={(value) => `Dystans: ${value} km`}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#7a6248"
              strokeWidth={2}
              fill="url(#elevationGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ElevationChart

