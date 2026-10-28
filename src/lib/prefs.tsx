// What this browser remembers: your area (or position, for Near me), your taste, and your shortlist.
// No account; nothing leaves the browser.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CityChoice, Here, Taste } from './edition.ts'

interface Prefs {
  city: CityChoice
  setCity: (c: CityChoice) => void
  /** Your position for "Near me"; never leaves the browser. */
  here: Here | null
  setHere: (h: Here | null) => void
  taste: Taste
  setTaste: (t: Taste) => void
  /** Up to three pick ids, per edition date. */
  shortlist: (date: string) => string[]
  toggleShortlist: (date: string, id: string) => 'added' | 'removed' | 'full'
  clearShortlist: (date: string) => void
}

export const SHORTLIST_MAX = 3

const Ctx = createContext<Prefs | null>(null)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode: it just won't be remembered */
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [here, setHereState] = useState<Here | null>(() => read<Here | null>('wg2.here', null))
  const [city, setCityState] = useState<CityChoice>(() => {
    const c = read<CityChoice>('wg2.city', 'all')
    return c === 'near' && !read('wg2.here', null) ? 'all' : c
  })
  const [taste, setTasteState] = useState<Taste>(() => ({ interests: [], artists: [], ...read<Partial<Taste>>('wg2.taste', {}) }))
  const [lists, setLists] = useState<Record<string, string[]>>(() => read('wg2.shortlist', {}))

  const setCity = useCallback((c: CityChoice) => {
    setCityState(c)
    write('wg2.city', c)
  }, [])
  const setHere = useCallback((h: Here | null) => {
    setHereState(h)
    write('wg2.here', h)
  }, [])
  const setTaste = useCallback((t: Taste) => {
    setTasteState(t)
    write('wg2.taste', t)
  }, [])
  const shortlist = useCallback((date: string) => lists[date] ?? [], [lists])
  const toggleShortlist = useCallback(
    (date: string, id: string) => {
      const cur = lists[date] ?? []
      let result: 'added' | 'removed' | 'full'
      let next: string[]
      if (cur.includes(id)) {
        next = cur.filter((x) => x !== id)
        result = 'removed'
      } else if (cur.length >= SHORTLIST_MAX) {
        return 'full'
      } else {
        next = [...cur, id]
        result = 'added'
      }
      const all = { ...lists, [date]: next }
      setLists(all)
      write('wg2.shortlist', all)
      return result
    },
    [lists],
  )
  const clearShortlist = useCallback(
    (date: string) => {
      const all = { ...lists, [date]: [] }
      setLists(all)
      write('wg2.shortlist', all)
    },
    [lists],
  )

  const value = useMemo(
    () => ({ city, setCity, here, setHere, taste, setTaste, shortlist, toggleShortlist, clearShortlist }),
    [city, setCity, here, setHere, taste, setTaste, shortlist, toggleShortlist, clearShortlist],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs() {
  const p = useContext(Ctx)
  if (!p) throw new Error('usePrefs outside PrefsProvider')
  return p
}
