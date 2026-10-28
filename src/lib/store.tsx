// App state: the dataset (fetched once), the chosen city, and saved items.
// Saved items live in localStorage — no account needed.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CityFilter, Dataset, WGEvent } from '../shared/types.ts'
import { DEFAULT_PROFILE, type Profile } from './profile.ts'

interface Store {
  data: Dataset | null
  error: string | null
  city: CityFilter
  setCity: (c: CityFilter) => void
  saved: string[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  byId: (id: string) => WGEvent | undefined
  profile: Profile
  setProfile: (p: Profile) => void
  /** Your restaurant log, Beli-style. */
  places: Record<string, PlaceLog>
  logPlace: (id: string, entry: PlaceLog | null) => void
}

export interface PlaceLog {
  status: 'want' | 'been'
  verdict?: 'loved' | 'liked' | 'meh'
  note?: string
  /** YYYY-MM-DD you marked it been */
  date?: string
}

const Ctx = createContext<Store | null>(null)

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode — saving just won't persist */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [city, setCityState] = useState<CityFilter>(() => readLocal('wg.city', 'all'))
  const [saved, setSaved] = useState<string[]>(() => readLocal('wg.saved', []))
  const [profile, setProfileState] = useState<Profile>(() => ({ ...DEFAULT_PROFILE, ...readLocal<Partial<Profile>>('wg.profile', {}) }))
  const setProfile = useCallback((p: Profile) => {
    setProfileState(p)
    writeLocal('wg.profile', p)
  }, [])
  const [places, setPlaces] = useState<Record<string, PlaceLog>>(() => readLocal('wg.places', {}))
  const logPlace = useCallback((id: string, entry: PlaceLog | null) => {
    setPlaces((prev) => {
      const next = { ...prev }
      if (entry) next[id] = entry
      else delete next[id]
      writeLocal('wg.places', next)
      return next
    })
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/events.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  // Keep saved items in sync across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'wg.saved') setSaved(readLocal('wg.saved', []))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setCity = useCallback((c: CityFilter) => {
    setCityState(c)
    writeLocal('wg.city', c)
  }, [])

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
      writeLocal('wg.saved', next)
      return next
    })
  }, [])

  const index = useMemo(() => new Map((data?.events ?? []).map((e) => [e.id, e])), [data])

  const value = useMemo<Store>(
    () => ({
      data,
      error,
      city,
      setCity,
      saved,
      isSaved: (id) => saved.includes(id),
      toggleSaved,
      byId: (id) => index.get(id),
      profile,
      setProfile,
      places,
      logPlace,
    }),
    [data, error, city, setCity, saved, toggleSaved, index, profile, setProfile, places, logPlace],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
