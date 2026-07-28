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
import { buildElevationProfile } from './lib/routeStats'

function ElevationChart({ routeData, compact = false }) {
  const chartData = useMemo(() => {
    const coordinates = routeData?.features?.[0]?.geometry?.coordinates
    return buildElevationProfile(coordinates)
  }, [routeData])

  if (!chartData.length) return null

  const elevations = chartData.map((item) => item.elevation)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const padding = Math.max(5, (maxElev - minElev) * 0.08)
  const yDomain = [
    Math.max(0, Math.floor(minElev - padding)),
    Math.ceil(maxElev + padding),
  ]

  const chartHeight = compact ? 'h-full min-h-[180px] md:min-h-[120px]' : 'h-48'
  const gradientId = compact ? 'elevationGradientCompact' : 'elevationGradient'

  return (
    <div
      className={
        compact
          ? 'flex h-full flex-col p-3'
          : 'soft-panel rounded-xl border border-orange-100 bg-[#FFF4D6] p-4'
      }
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide text-orange-800 ${
          compact ? 'mb-1' : ''
        }`}
      >
        Profil wysokościowy
      </p>
      <div className={`mt-1 w-full ${chartHeight} ${compact ? 'flex-1' : 'mt-3'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={
              compact
                ? { top: 4, right: 4, bottom: 0, left: 0 }
                : { top: 8, right: 8, bottom: 8, left: 0 }
            }
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FC6C26" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#FC6C26" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9ddcf" />
            <XAxis
              dataKey="distance"
              tick={{ fontSize: compact ? 11 : 12, fill: '#4c4338' }}
              tickFormatter={(value) => `${value} km`}
              height={compact ? 28 : undefined}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: compact ? 11 : 12, fill: '#4c4338' }}
              tickFormatter={(value) => `${value} m`}
              width={compact ? 44 : 52}
            />
            <Tooltip
              isAnimationActive={false}
              animationDuration={0}
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
              fill={`url(#${gradientId})`}
              connectNulls
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ElevationChart
