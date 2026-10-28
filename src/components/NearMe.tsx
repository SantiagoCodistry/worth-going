import { useState } from 'react'
import { RADII, distanceTo, formatMiles, locate, outsideCoverage, placeName, searchPlaces, type LocateError, type PlaceHit } from '../lib/geo.ts'
import { useStore } from '../lib/store.tsx'

const LOCATE_ERROR: Record<LocateError, string> = {
  denied: 'Location is blocked for this site. Allow it in your browser’s site settings, or search for a place instead.',
  unavailable: 'Your device couldn’t find your location. Search for a place instead.',
  timeout: 'Finding your location took too long. Try again, or search for a place.',
  unsupported: 'This browser can’t share its location. Search for a place instead.',
}

/** Set "near me" from your device or a searched place, and pick a radius. */
export function NearMePanel({ onDone }: { onDone?: () => void }) {
  const { near, setNear } = useStore()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PlaceHit[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching'>('idle')
  const [error, setError] = useState('')
  const miles = near?.miles ?? 10

  const useDevice = async () => {
    setError('')
    setStatus('locating')
    try {
      const pos = await locate()
      const label = (await placeName(pos.lat, pos.lng)) ?? 'Your location'
      setNear({ lat: pos.lat, lng: pos.lng, label, miles, from: 'device' })
      onDone?.()
    } catch (e) {
      setError(LOCATE_ERROR[(e as LocateError) in LOCATE_ERROR ? (e as LocateError) : 'unavailable'])
    } finally {
      setStatus('idle')
    }
  }

  const search = async () => {
    if (!q.trim()) return
    setError('')
    setStatus('searching')
    try {
      const found = await searchPlaces(q.trim())
      setHits(found)
      if (!found.length) setError('No places found. Try a town, neighborhood, address or ZIP code.')
    } catch {
      setError('Place search isn’t responding. Try again in a moment.')
    } finally {
      setStatus('idle')
    }
  }

  const away = near ? outsideCoverage(near) : 0

  return (
    <div className="border-[1.5px] border-ink bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-accent" onClick={useDevice} disabled={status === 'locating'}>
          {status === 'locating' ? 'Finding you…' : 'Use my location'}
        </button>
        <span className="hidden text-[13px] text-mute sm:inline">or</span>
        <form
          className="flex min-w-0 flex-1 basis-full gap-2 sm:basis-auto"
          onSubmit={(ev) => {
            ev.preventDefault()
            search()
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Town, neighborhood, address or ZIP"
            aria-label="Search for a place"
            className="min-w-0 flex-1 border-[1.5px] border-ink bg-bg px-3 py-2 text-[15px] outline-none"
          />
          <button className="btn btn-quiet" disabled={status === 'searching'}>
            {status === 'searching' ? '…' : 'Search'}
          </button>
        </form>
      </div>

      {hits && hits.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--rule)] border-y border-rule">
          {hits.map((h) => (
            <li key={`${h.lat},${h.lng}`}>
              <button
                className="w-full px-1 py-2 text-left text-[15px] font-semibold hover:bg-[var(--riso-yellow)]"
                onClick={() => {
                  setNear({ lat: h.lat, lng: h.lng, label: h.label, miles, from: 'search' })
                  setHits(null)
                  setQ('')
                  onDone?.()
                }}
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-[14px] text-[var(--riso-pink)]">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold">Within</span>
        {RADII.map((r) => (
          <button key={r} className="chip" aria-pressed={miles === r} onClick={() => near && setNear({ ...near, miles: r })} disabled={!near}>
            {r} mi
          </button>
        ))}
      </div>

      {near && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
          <span>
            Showing what’s within {near.miles} miles of <strong>{near.label}</strong>.
          </span>
          <button className="text-mute underline" onClick={() => setNear(null)}>
            Stop using location
          </button>
        </div>
      )}
      {near && away > 0 && (
        <p className="mt-3 rounded-[2px] bg-[var(--riso-yellow)] p-3 text-[14px]">
          Worth Going covers New York, New Jersey and Philadelphia. {near.label} is about {Math.round(away)} miles outside that, so
          there may be nothing within your radius.
        </p>
      )}
      <p className="mt-3 text-[12px] text-mute">
        Your location stays in this browser. Place search uses OpenStreetMap.
      </p>
    </div>
  )
}

/** "3.2 mi" from you, when you're using near me. */
export function Distance({ point, className = '' }: { point: { lat: number; lng: number; exact: boolean }; className?: string }) {
  const { near, city } = useStore()
  if (!near || city !== 'near') return null
  const mi = distanceTo(near, point)
  return <span className={className}>{point.exact ? formatMiles(mi) : `~${formatMiles(mi)}`}</span>
}
