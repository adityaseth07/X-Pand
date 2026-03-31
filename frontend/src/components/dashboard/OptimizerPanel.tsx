import { Target, MapPin, CheckCircle2, Clock } from 'lucide-react'
import { useApp } from '@/hooks/useApp'
import { formatPercent, getProfitColorHex } from '@/lib/utils'

export default function OptimizerPanel() {
  const { optimizeResult, setSelectedCellId } = useApp()

  if (!optimizeResult) return null

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-accent" />
        <span className="metric-label">Optimization Results</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xl font-bold text-accent font-heading tabular-nums">{optimizeResult.hub_details.length}</div>
          <div className="text-[10px] text-text-muted uppercase mt-0.5">Hubs</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xl font-bold text-white font-heading tabular-nums">{optimizeResult.total_score.toFixed(2)}</div>
          <div className="text-[10px] text-text-muted uppercase mt-0.5">Score</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xl font-bold text-white font-heading tabular-nums flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {optimizeResult.processing_time_seconds.toFixed(1)}s
          </div>
          <div className="text-[10px] text-text-muted uppercase mt-0.5">Time</div>
        </div>
      </div>

      {/* Separation check */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        {optimizeResult.separation_constraint_met ? (
          <span className="flex items-center gap-1 text-accent">
            <CheckCircle2 className="w-3.5 h-3.5" /> Separation constraint met
          </span>
        ) : (
          <span className="text-danger">⚠ Separation constraint violated</span>
        )}
      </div>

      {/* Hub table */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {optimizeResult.hub_details.map((hub, i) => (
          <button
            key={hub.grid_id}
            onClick={() => setSelectedCellId(hub.grid_id)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left hover:bg-[rgba(0,153,255,0.06)]"
            style={{ background: 'rgba(0,153,255,0.04)', border: '1px solid rgba(0,153,255,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-accent-blue font-heading"
                style={{ background: 'rgba(0,153,255,0.1)' }}
              >
                {i + 1}
              </div>
              <div>
                <div className="text-xs font-heading font-medium text-white">{hub.grid_id}</div>
                <div className="text-[10px] text-text-muted flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {hub.lat.toFixed(4)}, {hub.lon.toFixed(4)}
                </div>
              </div>
            </div>
            <span
              className="text-sm font-bold font-heading tabular-nums"
              style={{ color: getProfitColorHex(hub.p_profit) }}
            >
              {formatPercent(hub.p_profit)}
            </span>
          </button>
        ))}
      </div>

      {/* Stats footer */}
      <div className="mt-4 pt-3 flex justify-between text-[10px] text-text-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span>Eligible: {optimizeResult.eligible_cells} / {optimizeResult.total_cells}</span>
        <span>Model: {optimizeResult.model_used}</span>
      </div>
    </div>
  )
}
