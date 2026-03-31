import { useEffect, useState, useMemo } from 'react'
import {
  X, MapPin, TrendingUp, AlertTriangle, XCircle,
  Thermometer, Shield, Building, Loader2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { useApp } from '@/hooks/useApp'
import { fetchPrediction, reverseGeocode } from '@/api/client'
import { formatPercent, getProfitColorHex, cn } from '@/lib/utils'
import type { PredictionResult, SHAPDriver } from '@/types/api'

function RecommendationBadge({ rec }: { rec: string }) {
  const config = {
    open: { icon: TrendingUp, cls: 'badge-open', label: 'OPEN' },
    monitor: { icon: AlertTriangle, cls: 'badge-monitor', label: 'MONITOR' },
    skip: { icon: XCircle, cls: 'badge-skip', label: 'SKIP' },
  }
  const c = config[rec as keyof typeof config] || config.skip
  const Icon = c.icon
  return (
    <span className={c.cls}>
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </span>
  )
}

function ShapChart({ drivers }: { drivers: SHAPDriver[] }) {
  if (!drivers || drivers.length === 0) return null

  const data = drivers.map(d => ({
    name: d.feature.replace(/_/g, ' '),
    value: d.impact,
    fill: d.impact > 0 ? '#00ff88' : '#ff4444',
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fill: '#44445a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#8888aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10, 10, 15, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '12px',
              backdropFilter: 'blur(20px)',
            }}
            formatter={(val: unknown) => [Number(val).toFixed(4), 'Impact']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function CellDetail() {
  const { selectedCellId, setSelectedCellId, predictions, selectedCity } = useApp()
  const [detail, setDetail] = useState<PredictionResult | null>(null)
  const [areaName, setAreaName] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const basicPred = useMemo(
    () => predictions.find(p => p.grid_id === selectedCellId),
    [predictions, selectedCellId]
  )

  useEffect(() => {
    if (!selectedCellId || !basicPred) {
      setDetail(null)
      return
    }

    setDetail(basicPred)
    setLoading(true)

    fetchPrediction(
      { lat: basicPred.lat, lon: basicPred.lon, grid_id: selectedCellId },
      selectedCity
    )
      .then(result => setDetail(result))
      .catch(() => {})
      .finally(() => setLoading(false))

    reverseGeocode(basicPred.lat, basicPred.lon)
      .then(geo => setAreaName(geo.area_name))
      .catch(() => setAreaName(''))
  }, [selectedCellId, basicPred, selectedCity])

  if (!selectedCellId || !detail) return null

  const profitColor = getProfitColorHex(detail.p_profit)

  return (
    <div
      className="w-96 h-full overflow-y-auto animate-fade-right"
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div
        className="p-5 sticky top-0 z-10"
        style={{
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm font-heading font-semibold text-white">{selectedCellId}</span>
          </div>
          <button
            onClick={() => setSelectedCellId(null)}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-all"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        {areaName && (
          <div className="text-xs text-text-secondary truncate">{areaName}</div>
        )}
        <div className="text-[10px] text-text-muted mt-1 font-heading tabular-nums">
          {detail.lat.toFixed(5)}, {detail.lon.toFixed(5)}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="p-5 space-y-4">
        {/* Profit Gauge */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Profitability Score</span>
            <RecommendationBadge rec={detail.recommendation} />
          </div>
          <div className="text-4xl font-bold mb-3 font-heading tabular-nums" style={{ color: profitColor }}>
            {formatPercent(detail.p_profit)}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ backgroundColor: profitColor, width: `${detail.p_profit * 100}%` }}
            />
          </div>
          {/* CI */}
          {detail.ci_lower !== null && detail.ci_upper !== null && (
            <div className="mt-3 flex gap-4 text-xs text-text-secondary">
              <div>
                <span className="text-text-muted">CI Lower:</span>{' '}
                <span className="font-heading text-white tabular-nums">{detail.ci_lower.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-text-muted">CI Upper:</span>{' '}
                <span className="font-heading text-white tabular-nums">{detail.ci_upper.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Cold Start */}
        {detail.is_cold_start && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-xs text-warning">Cold-start cell — using Thompson Sampling estimate</span>
          </div>
        )}

        {/* SHAP Drivers */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="metric-label">Top Feature Impacts (SHAP)</span>
            {loading && (
              <div
                className="w-3 h-3 rounded-full animate-spin-slow"
                style={{ border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00ff88' }}
              />
            )}
          </div>
          {detail.shap_drivers && detail.shap_drivers.length > 0 ? (
            <ShapChart drivers={detail.shap_drivers} />
          ) : detail.is_cold_start ? (
            <div className="text-xs text-text-muted py-4 text-center">
              No SHAP data — cold-start cells use Thompson Sampling
            </div>
          ) : loading ? (
            <div className="text-xs text-text-muted py-4 text-center">
              Loading SHAP analysis...
            </div>
          ) : (
            <div className="text-xs text-text-muted py-4 text-center">
              SHAP data unavailable
            </div>
          )}
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <Thermometer className="w-4 h-4 text-accent-blue mb-2" />
            <div className="metric-label">Model</div>
            <div className="text-sm font-semibold text-white mt-1 font-heading">
              {detail.is_cold_start ? 'Thompson' : 'LightGBM'}
            </div>
          </div>
          <div className="glass-card p-4">
            <Shield className="w-4 h-4 text-accent-blue mb-2" />
            <div className="metric-label">Confidence</div>
            <div className="text-sm font-semibold text-white mt-1 font-heading tabular-nums">
              {detail.ci_lower !== null && detail.ci_upper !== null
                ? `±${((detail.ci_upper - detail.ci_lower) * 50).toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Investment Assessment */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-accent" />
            <span className="metric-label">Investment Assessment</span>
          </div>
          <div className={cn(
            "text-lg font-bold mb-1 font-heading",
            detail.p_profit > 0.7 ? "text-accent" :
            detail.p_profit >= 0.4 ? "text-warning" : "text-danger"
          )}>
            {detail.p_profit > 0.7 ? 'Strong Opportunity' :
             detail.p_profit >= 0.4 ? 'Needs Monitoring' : 'Not Recommended'}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {detail.p_profit > 0.7
              ? 'High probability of profitability within 6 months. Consider for expansion.'
              : detail.p_profit >= 0.4
              ? 'Moderate potential. Monitor market conditions and competition before committing.'
              : 'Low probability of profitability. Explore alternative locations.'}
          </p>
        </div>
      </div>
    </div>
  )
}
