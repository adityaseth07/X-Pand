import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid3X3, Brain, BarChart3, ArrowRight } from 'lucide-react'

/* ─── Animated Counter ─── */
function AnimCounter({ end, duration = 1800, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = end / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(id) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [end, duration])
  return <>{count.toLocaleString()}{suffix}</>
}

/* ─── Interactive 3D Globe ─── */
function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef({ x: 0.3, y: 0 })
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 })
  const autoRotateRef = useRef(true)

  // City markers: name, lat, lon (in radians)
  const cities = useRef([
    { name: 'Delhi', lat: 28.65, lon: 77.2 },
    { name: 'Mumbai', lat: 19.07, lon: 72.87 },
    { name: 'London', lat: 51.5, lon: -0.12 },
    { name: 'New York', lat: 40.71, lon: -74.0 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.86, lon: 151.2 },
    { name: 'São Paulo', lat: -23.55, lon: -46.63 },
    { name: 'Dubai', lat: 25.2, lon: 55.27 },
    { name: 'Singapore', lat: 1.35, lon: 103.82 },
    { name: 'Berlin', lat: 52.52, lon: 13.4 },
    { name: 'Nairobi', lat: -1.28, lon: 36.81 },
    { name: 'Toronto', lat: 43.65, lon: -79.38 },
  ]).current

  const toRad = (d: number) => (d * Math.PI) / 180

  const project = useCallback((lat: number, lon: number, cx: number, cy: number, r: number, rx: number, ry: number) => {
    const latR = toRad(lat)
    const lonR = toRad(lon) + ry

    let x = Math.cos(latR) * Math.sin(lonR)
    let y = Math.sin(latR)
    let z = Math.cos(latR) * Math.cos(lonR)

    // Rotate around X axis (tilt)
    const y2 = y * Math.cos(rx) - z * Math.sin(rx)
    const z2 = y * Math.sin(rx) + z * Math.cos(rx)

    return {
      x: cx + x * r,
      y: cy - y2 * r,
      z: z2,
      visible: z2 > -0.1,
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const setSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setSize()
    window.addEventListener('resize', setSize)

    // Mouse drag handlers
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY }
      autoRotateRef.current = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY
      rotationRef.current.y += dx * 0.005
      rotationRef.current.x += dy * 0.005
      rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x))
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
    }
    const onMouseUp = () => {
      dragRef.current.dragging = false
      // Resume auto-rotate after 3 seconds
      setTimeout(() => { autoRotateRef.current = true }, 3000)
    }

    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      dragRef.current = { dragging: true, lastX: t.clientX, lastY: t.clientY }
      autoRotateRef.current = false
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.dragging) return
      const t = e.touches[0]
      const dx = t.clientX - dragRef.current.lastX
      const dy = t.clientY - dragRef.current.lastY
      rotationRef.current.y += dx * 0.005
      rotationRef.current.x += dy * 0.005
      rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x))
      dragRef.current.lastX = t.clientX
      dragRef.current.lastY = t.clientY
    }
    const onTouchEnd = () => {
      dragRef.current.dragging = false
      setTimeout(() => { autoRotateRef.current = true }, 3000)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    const draw = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.38

      ctx.clearRect(0, 0, w, h)

      // Auto-rotate
      if (autoRotateRef.current) {
        rotationRef.current.y += 0.003
      }

      const rx = rotationRef.current.x
      const ry = rotationRef.current.y

      // Outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.4)
      glowGrad.addColorStop(0, 'rgba(0, 255, 136, 0.06)')
      glowGrad.addColorStop(0.5, 'rgba(0, 153, 255, 0.03)')
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, w, h)

      // Globe body — dark sphere
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
      bodyGrad.addColorStop(0, 'rgba(20, 25, 40, 1)')
      bodyGrad.addColorStop(0.6, 'rgba(8, 10, 18, 1)')
      bodyGrad.addColorStop(1, 'rgba(4, 4, 6, 1)')
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // Globe rim glow
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Draw latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        let started = false
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = project(lat, lon, cx, cy, r, rx, ry)
          if (p.z > 0) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true }
            else ctx.lineTo(p.x, p.y)
          } else {
            started = false
          }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Draw longitude lines
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath()
        let started = false
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lat, lon, cx, cy, r, rx, ry)
          if (p.z > 0) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true }
            else ctx.lineTo(p.x, p.y)
          } else {
            started = false
          }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Draw continent outlines (simplified)
      const drawContour = (points: [number, number][]) => {
        ctx.beginPath()
        let started = false
        for (const [lat, lon] of points) {
          const p = project(lat, lon, cx, cy, r, rx, ry)
          if (p.z > 0) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true }
            else ctx.lineTo(p.x, p.y)
          } else {
            started = false
          }
        }
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Simplified continent outlines
      // Asia
      drawContour([[10,100],[15,105],[20,106],[25,100],[28,77],[30,70],[35,75],[40,75],[45,80],[50,85],[55,75],[60,70],[65,75],[70,70],[65,60],[55,55],[50,50],[45,40],[40,45],[35,35],[30,32],[25,35],[20,40],[15,45],[10,45],[5,100],[10,100]])
      // Europe
      drawContour([[36,-10],[38,0],[40,5],[43,5],[45,10],[47,15],[50,15],[52,10],[55,12],[58,18],[60,25],[65,25],[70,30],[65,15],[60,10],[55,8],[52,5],[48,-5],[44,-8],[36,-10]])
      // Africa
      drawContour([[35,-5],[30,30],[20,40],[10,42],[5,40],[0,42],[-5,40],[-10,35],[-15,40],[-20,35],[-25,33],[-30,30],[-35,28],[-35,20],[-30,16],[-20,12],[-10,14],[0,10],[5,1],[10,-15],[15,-17],[20,-17],[25,-13],[30,-10],[35,-5]])
      // North America
      drawContour([[25,-100],[30,-90],[35,-80],[40,-75],[45,-70],[50,-65],[55,-60],[60,-65],[65,-70],[70,-100],[65,-140],[60,-150],[55,-135],[50,-125],[45,-125],[40,-124],[35,-120],[30,-115],[25,-110],[25,-100]])
      // South America
      drawContour([[-55,-70],[-50,-75],[-45,-75],[-40,-65],[-35,-58],[-30,-50],[-20,-40],[-10,-35],[0,-50],[5,-75],[10,-75],[5,-80],[0,-80],[-5,-80],[-10,-78],[-15,-75],[-20,-70],[-30,-72],[-40,-68],[-50,-75],[-55,-70]])
      // Australia
      drawContour([[-15,130],[-20,118],[-25,115],[-30,115],[-35,118],[-38,145],[-35,150],[-28,153],[-20,150],[-15,145],[-12,135],[-15,130]])

      // Draw city markers
      cities.forEach(city => {
        const p = project(city.lat, city.lon, cx, cy, r, rx, ry)
        if (!p.visible || p.z < 0.05) return

        const alpha = Math.max(0.3, p.z)

        // Pulse ring
        const pulse = (Date.now() % 2000) / 2000
        const pulseR = 4 + pulse * 10
        ctx.beginPath()
        ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 * (1 - pulse) * alpha})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Inner dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 255, 136, ${0.9 * alpha})`
        ctx.fill()

        // City name label
        ctx.font = '10px Inter, system-ui, sans-serif'
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * alpha})`
        ctx.fillText(city.name, p.x + 8, p.y + 3)
      })

      // Arc connections between random city pairs
      const drawArc = (c1: typeof cities[0], c2: typeof cities[0], color: string) => {
        const p1 = project(c1.lat, c1.lon, cx, cy, r, rx, ry)
        const p2 = project(c2.lat, c2.lon, cx, cy, r, rx, ry)
        if (p1.z < 0.1 || p2.z < 0.1) return

        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2 - 30

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y)
        ctx.strokeStyle = color
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      drawArc(cities[0], cities[4], 'rgba(0, 255, 136, 0.12)')
      drawArc(cities[2], cities[3], 'rgba(0, 153, 255, 0.12)')
      drawArc(cities[0], cities[7], 'rgba(0, 255, 136, 0.08)')
      drawArc(cities[5], cities[8], 'rgba(0, 153, 255, 0.08)')

      // Highlight shimmer
      const shimGrad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0, cx, cy, r)
      shimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)')
      shimGrad.addColorStop(0.5, 'transparent')
      shimGrad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = shimGrad
      ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', setSize)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [cities, project])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full aspect-square cursor-grab active:cursor-grabbing"
        style={{ maxWidth: '520px', maxHeight: '520px' }}
      />
      {/* Drag hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-text-muted opacity-60">
        drag to rotate
      </div>
    </div>
  )
}

/* ─── Feature Card ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  iconColor,
  delay,
}: {
  icon: React.ElementType
  title: string
  description: string
  iconColor: string
  delay: string
}) {
  return (
    <div className="glass-card-hover p-6 cursor-default animate-fade-up" style={{ animationDelay: delay }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}30` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <h3 className="text-base font-semibold text-white mb-2 font-heading">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  )
}

/* ─── HOME PAGE ─── */
export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen relative">
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8"
        style={{
          background: 'rgba(4, 4, 6, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="live-dot-sm" />
          <span className="font-heading text-lg font-bold tracking-tight text-white">X-PAND.AI</span>
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/dashboard')} className="btn-nav text-sm">
          Launch Dashboard →
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-8 w-full flex items-center gap-12">

          {/* Left 55% */}
          <div className="flex-1 max-w-[55%]">
            {/* Live pill */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 animate-fade-up"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="live-dot-sm" />
              <span className="text-sm text-accent font-medium">ML-Powered · Global Coverage · Real-Time Scoring</span>
            </div>

            {/* Headline */}
            <h1 className="text-[68px] font-bold font-heading leading-[1.05] tracking-[-0.03em] mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <span className="text-white">Predict Where</span>
              <br />
              <span className="text-accent">Profit Lives.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-text-secondary font-normal mb-5 animate-fade-up leading-relaxed max-w-lg" style={{ animationDelay: '0.2s' }}>
              500-meter grid intelligence for any city on Earth.
              <br />
              Satellite data meets ML to pinpoint your next winning location.
            </p>

            {/* Micro stats */}
            <div className="flex items-center gap-0 mb-10 animate-fade-up" style={{ animationDelay: '0.25s' }}>
              <div className="pr-6">
                <div className="text-2xl font-semibold text-white font-heading tabular-nums"><AnimCounter end={12} suffix="+" /></div>
                <div className="text-xs text-text-muted mt-0.5">global cities</div>
              </div>
              <div className="w-px h-10 bg-[rgba(255,255,255,0.08)]" />
              <div className="px-6">
                <div className="text-2xl font-semibold text-white font-heading tabular-nums">4</div>
                <div className="text-xs text-text-muted mt-0.5">ML algorithms</div>
              </div>
              <div className="w-px h-10 bg-[rgba(255,255,255,0.08)]" />
              <div className="px-6">
                <div className="text-2xl font-semibold text-white font-heading tabular-nums">500m</div>
                <div className="text-xs text-text-muted mt-0.5">grid precision</div>
              </div>
              <div className="w-px h-10 bg-[rgba(255,255,255,0.08)]" />
              <div className="pl-6">
                <div className="text-2xl font-semibold text-white font-heading tabular-nums">95%</div>
                <div className="text-xs text-text-muted mt-0.5">confidence</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-5 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary btn-glow group"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right 45% — Interactive Globe */}
          <div className="flex-1 flex justify-center animate-fade-right">
            <InteractiveGlobe />
          </div>
        </div>
      </section>

      {/* ═══ FEATURE CARDS ═══ */}
      <section className="py-24 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Grid3X3}
            title="500m Precision Grid"
            description="Not pin codes. Not districts. Every 500 metre cell of any city scored independently using satellite and OSM data."
            iconColor="#00ff88"
            delay="0.5s"
          />
          <FeatureCard
            icon={Brain}
            title="4-Algorithm Pipeline"
            description="GWR → LightGBM → Thompson Sampling → BIP. Chained spatial intelligence with confidence intervals."
            iconColor="#0099ff"
            delay="0.6s"
          />
          <FeatureCard
            icon={BarChart3}
            title="Explainable by Default"
            description="Every prediction ships with SHAP drivers, confidence bounds, and a plain-English recommendation."
            iconColor="#ffaa00"
            delay="0.7s"
          />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[13px] text-text-muted">
          Built with WorldPop · OpenStreetMap · LightGBM · PuLP · FastAPI
        </p>
      </footer>
    </div>
  )
}
