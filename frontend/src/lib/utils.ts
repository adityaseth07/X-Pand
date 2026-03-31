import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN')
}

export function getRecommendationColor(rec: string): string {
  switch (rec.toLowerCase()) {
    case 'open': return 'text-success'
    case 'monitor': return 'text-warning'
    case 'skip': return 'text-danger'
    default: return 'text-text-secondary'
  }
}

export function getProfitColor(p: number): [number, number, number] {
  if (p > 0.7) return [0, 255, 136]     // #00ff88
  if (p >= 0.4) return [255, 170, 0]    // #ffaa00
  return [255, 68, 68]                   // #ff4444
}

export function getProfitColorHex(p: number): string {
  if (p > 0.7) return '#00ff88'
  if (p >= 0.4) return '#ffaa00'
  return '#ff4444'
}
