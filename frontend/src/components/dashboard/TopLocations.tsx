import { useEffect } from 'react'
import { Trophy, MapPin, ChevronRight } from 'lucide-react'
import { useApp } from '@/hooks/useApp'
import { formatPercent, getProfitColorHex } from '@/lib/utils'

export default function TopLocations() {
  const { topLocations, topLoading, loadTopLocations, selectedCity, setSelectedCellId, predictions } = useApp()

  useEffect(() => {
    if (predictions.length > 0) {
      loadTopLocations(selectedCity, 8)
    }
  }, [selectedCity, predictions.length, loadTopLocations])

  if (topLoading) {
    return (
      <div className="glass-card p-5">
        <div className="metric-label mb-4">Top Locations</div>
        <div className="flex items-center justify-center py-8">
          <div
            className="w-5 h-5 rounded-full animate-spin-slow"
            style={{ border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00ff88' }}
          />
        </div>
      </div>
    )
  }

  if (topLocations.length === 0) return null

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-accent" />
        <span className="metric-label">Top Locations</span>
      </div>

      <div className="space-y-1">
        {topLocations.map((loc) => (
          <button
            key={loc.grid_id}
            onClick={() => setSelectedCellId(loc.grid_id)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-accent font-heading"
                style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)' }}
              >
                {loc.rank}
              </div>
              <div>
                <div className="text-xs font-heading font-medium text-white group-hover:text-accent transition-colors">
                  {loc.grid_id}
                </div>
                <div className="text-[10px] text-text-muted flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold font-heading tabular-nums"
                style={{ color: getProfitColorHex(loc.p_profit) }}
              >
                {formatPercent(loc.p_profit)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
