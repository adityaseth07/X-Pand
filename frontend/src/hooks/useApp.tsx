import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { CityInfo, PredictionResult, OptimizeResponse, GridCell } from '@/types/api'
import { fetchCities, fetchGrid, fetchBatchPredictions, runOptimizer, fetchTopLocations } from '@/api/client'
import type { OptimizeRequest, TopLocation } from '@/types/api'

interface AppState {
  // Cities
  cities: CityInfo[]
  selectedCity: string
  citiesLoading: boolean

  // Grid & Predictions
  gridCells: GridCell[]
  predictions: PredictionResult[]
  predictionsLoading: boolean

  // Optimizer
  optimizeResult: OptimizeResponse | null
  optimizing: boolean

  // Top locations
  topLocations: TopLocation[]
  topLoading: boolean

  // Selected cell
  selectedCellId: string | null

  // Actions
  setSelectedCity: (city: string) => void
  setSelectedCellId: (id: string | null) => void
  loadCityData: (city: string) => Promise<void>
  runOptimize: (params: OptimizeRequest) => Promise<void>
  loadTopLocations: (city: string, n?: number) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<CityInfo[]>([])
  const [selectedCity, setSelectedCity] = useState('delhi')
  const [citiesLoading, setCitiesLoading] = useState(true)

  const [gridCells, setGridCells] = useState<GridCell[]>([])
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [predictionsLoading, setPredictionsLoading] = useState(false)

  const [optimizeResult, setOptimizeResult] = useState<OptimizeResponse | null>(null)
  const [optimizing, setOptimizing] = useState(false)

  const [topLocations, setTopLocations] = useState<TopLocation[]>([])
  const [topLoading, setTopLoading] = useState(false)

  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)

  // Load cities on mount
  useEffect(() => {
    setCitiesLoading(true)
    fetchCities()
      .then(setCities)
      .catch(console.error)
      .finally(() => setCitiesLoading(false))
  }, [])

  const loadCityData = useCallback(async (city: string) => {
    setPredictionsLoading(true)
    setOptimizeResult(null)
    setSelectedCellId(null)
    try {
      const grid = await fetchGrid(city)
      setGridCells(grid)

      const locations = grid.map(c => ({
        lat: c.lat,
        lon: c.lon,
        grid_id: c.grid_id,
      }))
      const preds = await fetchBatchPredictions(locations, city)
      setPredictions(preds)
    } catch (err) {
      console.error('Failed to load city data:', err)
    } finally {
      setPredictionsLoading(false)
    }
  }, [])

  const runOptimize = useCallback(async (params: OptimizeRequest) => {
    setOptimizing(true)
    try {
      const result = await runOptimizer(params)
      setOptimizeResult(result)
    } catch (err) {
      console.error('Optimizer failed:', err)
    } finally {
      setOptimizing(false)
    }
  }, [])

  const loadTopLocations = useCallback(async (city: string, n: number = 10) => {
    setTopLoading(true)
    try {
      const data = await fetchTopLocations(city, n)
      setTopLocations(data.top_locations)
    } catch (err) {
      console.error('Failed to load top locations:', err)
    } finally {
      setTopLoading(false)
    }
  }, [])

  return (
    <AppContext.Provider
      value={{
        cities,
        selectedCity,
        citiesLoading,
        gridCells,
        predictions,
        predictionsLoading,
        optimizeResult,
        optimizing,
        topLocations,
        topLoading,
        selectedCellId,
        setSelectedCity,
        setSelectedCellId,
        loadCityData,
        runOptimize,
        loadTopLocations,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
