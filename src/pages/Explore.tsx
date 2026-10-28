import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CategoryId, CityFilter } from '../shared/types.ts'
import { CATEGORIES } from '../shared/taxonomy.ts'
import { sortTime } from '../shared/time.ts'
import { WHEN_OPTIONS, dayParts, relativeDay, startKey, todayKey, type When } from '../lib/dates.ts'
import { applyFilters } from '../lib/recommend.ts'
import { favoriteAt } from '../lib/favorites.ts'
import { RADII, distanceTo, eventPoint, formatMiles } from '../lib/geo.ts'
import { useStore } from '../lib/store.tsx'
import { EventRow } from '../components/Cards.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Spinner } from '../components/bits.tsx'
import { LoadError } from './Home.tsx'

const isWhen = (s: string | null): s is When => !!s && WHEN_OPTIONS.some((w) => w.id === s)

export function Explore() {
  const { data, error, city, setCity, where, near, setNear, profile } = useStore()
  const [params, setParams] = useSearchParams()
  const when: When = isWhen(params.get('when')) ? (params.get('when') as When) : 'month'
  const cat = (params.get('cat') as CategoryId | null) ?? 'all'
  const free = params.get('free') === '1'
  const mine = params.get('mine') === '1'
  const nearest = params.get('sort') === 'near'
  const [q, setQ] = useState(params.get('q') ?? '')

  // A shared link may carry ?city=…
  useEffect(() => {
    const c = params.get('city') as CityFilter | null
    if (c && c !== city) setCity(c)
  }, [])

  // Debounce search into the URL so results can be shared.
  useEffect(() => {
    const t = setTimeout(() => update({ q: q || null }), 200)
    return () => clearTimeout(t)
  }, [q])

  function update(patch: Record<string, string | null>) {
    // Functional form: the debounced search must not overwrite newer filter changes.
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
        return next
      },
      { replace: true },
    )
  }

  const results = useMemo(
    () => applyFilters(data?.events ?? [], { ...where, category: cat, when, q, free }).filter((e) => !mine || !!favoriteAt(e, profile.favorites ?? [])),
    [data, where, cat, when, q, free, mine, profile.favorites],
  )

  const nearMode = city === 'near' && !!near
  // Nearest first: one list by distance instead of by day.
  const byDistance = useMemo(
    () =>
      nearMode && nearest
        ? results.map((e) => ({ e, mi: distanceTo(near!, eventPoint(e)) })).sort((a, b) => a.mi - b.mi).map((x) => x.e)
        : [],
    [results, nearMode, nearest, near],
  )
  // When nothing is in range, say how far the closest listing is.
  const closest = useMemo(() => {
    if (!nearMode || results.length) return null
    const all = applyFilters(data?.events ?? [], { city: 'all', category: cat, when, q, free })
    let best: number | null = null
    for (const e of all) {
      const mi = distanceTo(near!, eventPoint(e))
      if (best === null || mi < best) best = mi
    }
    return best
  }, [nearMode, results.length, data, cat, when, q, free, near])

  const { days, exhibits } = useMemo(() => {
    const today = todayKey()
    const exhibits = results.filter((e) => e.kind === 'exhibition')
    const map = new Map<string, typeof results>()
    for (const e of results.filter((x) => x.kind === 'event').sort((a, b) => sortTime(a.start) - sortTime(b.start))) {
      // Multi-day events that started earlier are shown under today.
      const k = startKey(e) < today ? today : startKey(e)
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return { days: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)), exhibits }
  }, [results])

  if (error) return <LoadError message={error} />
  if (!data) return <Spinner />

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-10 md:pt-16">
        <h1 className="display text-[72px] md:text-[128px]">Calendar</h1>
        
      </section>

      {/* Filters */}
      <div className="mt-6 space-y-3 border-t rule pt-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CityTabs />
          <div className="flex items-center gap-4">
            <div className="flex flex-1 items-center gap-2 border-[1.5px] border-ink px-3 focus-within:bg-card lg:w-72 lg:flex-none">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="text-mute">
                <circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <input
                id="calendar-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search event, venue, keyword"
                aria-label="Search"
                className="w-full bg-transparent py-2 text-[14px] outline-none placeholder:text-mute"
              />
              {q && (
                <button onClick={() => setQ('')} className="text-mute hover:text-ink" aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[14px] font-medium select-none">
              <input
                id="free-only"
                type="checkbox"
                checked={free}
                onChange={(e) => update({ free: e.target.checked ? '1' : null })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Free only
            </label>
            {nearMode && (
              <label className="ml-4 inline-flex items-center gap-2 text-[14px] font-medium">
                <input type="checkbox" checked={nearest} onChange={(e) => update({ sort: e.target.checked ? 'near' : null })} className="h-4 w-4 accent-[var(--accent)]" />
                Nearest first
              </label>
            )}
            {(profile.favorites?.length ?? 0) > 0 && (
              <label className="ml-4 inline-flex items-center gap-2">
                <input type="checkbox" checked={mine} onChange={(e) => update({ mine: e.target.checked ? '1' : null })} className="h-4 w-4 accent-[var(--accent)]" />
                My favorites
              </label>
            )}
          </div>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {WHEN_OPTIONS.map((w) => (
            <button key={w.id} className="chip" aria-pressed={when === w.id} onClick={() => update({ when: w.id })}>
              {w.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => update({ cat: null })}>
            All
          </button>
          {CATEGORIES.filter((c) => c.id !== 'dining').map((c) => (
            <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => update({ cat: c.id })}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-[14px] text-mute" aria-live="polite">
        {results.length} {results.length === 1 ? 'listing' : 'listings'}
      </p>

      {nearMode && nearest && byDistance.length > 0 && (
        <section className="mt-6 border-t rule">
          {byDistance.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </section>
      )}

      {!(nearMode && nearest) && days.map(([key, items]) => {
        const p = dayParts(key)
        const rel = relativeDay(key)
        return (
          <section key={key} className="mt-8 grid gap-1 md:grid-cols-[200px_1fr] md:gap-8">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className="display text-[30px] md:text-[36px]">{rel === 'Today' || rel === 'Tomorrow' ? rel : p.weekdayLong}</h2>
              <p className="text-[14px] text-mute">
                {p.monthLong} {p.day}
              </p>
            </div>
            <div className="border-t rule">
              {items.map((e) => (
                <EventRow key={e.id} e={e} showDate={false} />
              ))}
            </div>
          </section>
        )
      })}

      {!(nearMode && nearest) && exhibits.length > 0 && (
        <section className="mt-12 grid gap-1 md:grid-cols-[200px_1fr] md:gap-8">
          <div>
            <h2 className="display text-[30px] md:text-[36px]">On view</h2>
            <p className="text-[14px] text-mute">Exhibitions</p>
          </div>
          <div className="border-t rule">
            {exhibits.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      {results.length === 0 && nearMode && (
        <div className="py-16 text-center">
          <p className="text-[18px] font-medium">Nothing within {near!.miles} miles of {near!.label}.</p>
          {closest !== null && <p className="mt-2 text-mute">The closest listing that fits your other filters is {formatMiles(closest)} away.</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {RADII.filter((r) => r > near!.miles).slice(0, 2).map((r) => (
              <button key={r} className="btn btn-quiet" onClick={() => setNear({ ...near!, miles: r })}>
                Widen to {r} miles
              </button>
            ))}
            <button className="btn btn-quiet" onClick={() => setCity('all')}>
              Show everywhere
            </button>
          </div>
        </div>
      )}

      {results.length === 0 && !nearMode && (
        <div className="py-20 text-center">
          <p className="text-[18px] font-medium">No matches.</p>
          <p className="mt-2 text-mute">Try a wider date range, another city, or a different search.</p>
          <button
            onClick={() => {
              setQ('')
              setParams(new URLSearchParams({ when: 'all' }), { replace: true })
              setCity('all')
            }}
            className="btn btn-quiet mt-5"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  )
}
