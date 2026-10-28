// "Near me": where you are (device location or a place you search for), how
// far each event is, and whether it's within your radius. Your location stays
// in this browser. Place search goes to OpenStreetMap's Nominatim.
import type { CityId, Place, WGEvent } from '../shared/types.ts'

export interface Near {
  lat: number
  lng: number
  /** "Hoboken, NJ" or "Your location" */
  label: string
  miles: number
  from: 'device' | 'search'
}

export const RADII = [2, 5, 10, 25, 50] as const

/** Middle of each area, for listings without an exact venue position. */
const AREA_CENTER: Record<CityId, { lat: number; lng: number }> = {
  nyc: { lat: 40.7359, lng: -73.9911 },
  nj: { lat: 40.7357, lng: -74.1724 },
  princeton: { lat: 40.3487, lng: -74.6593 },
  philly: { lat: 39.9526, lng: -75.1652 },
}
/** The covered region, for telling people outside it what to expect. */
const COVERAGE = { lat: 40.35, lng: -74.6, radiusMiles: 90 }

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Where an event is, and whether that's exact or only its area. */
export function eventPoint(e: WGEvent): { lat: number; lng: number; exact: boolean } {
  if (e.venue.lat && e.venue.lng) return { lat: e.venue.lat, lng: e.venue.lng, exact: true }
  return { ...AREA_CENTER[e.city], exact: false }
}

export function placePoint(p: Place, meta?: { lat?: number; lng?: number }): { lat: number; lng: number; exact: boolean } {
  if (meta?.lat && meta.lng) return { lat: meta.lat, lng: meta.lng, exact: true }
  return { ...AREA_CENTER[p.city], exact: false }
}

export function distanceTo(near: Near, point: { lat: number; lng: number }): number {
  return milesBetween(near, point)
}

/**
 * Within your radius? Events we can only place by area count when the area's
 * middle is within the radius plus a margin, so a short radius doesn't drop
 * them all, but they sort after exact matches.
 */
export function withinRadius(near: Near, point: { lat: number; lng: number; exact: boolean }): boolean {
  const d = milesBetween(near, point)
  return point.exact ? d <= near.miles : d <= near.miles + 8
}

export function formatMiles(mi: number): string {
  if (mi < 0.2) return 'Nearby'
  if (mi < 10) return `${mi.toFixed(1)} mi`
  return `${Math.round(mi)} mi`
}

/** How far you are from the area we cover (0 inside it). */
export function outsideCoverage(near: Near): number {
  return Math.max(0, milesBetween(near, COVERAGE) - COVERAGE.radiusMiles)
}

export type LocateError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

/** Ask the browser for your position. */
export function locate(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((ok, no) => {
    if (!('geolocation' in navigator)) return no('unsupported' satisfies LocateError)
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => no((err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable') satisfies LocateError),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export interface PlaceHit {
  label: string
  lat: number
  lng: number
}

const shortLabel = (a: Record<string, string | undefined>, fallback: string) => {
  const town = a.neighbourhood ?? a.suburb ?? a.city_district ?? a.town ?? a.city ?? a.village ?? a.hamlet ?? a.county
  const state = a['ISO3166-2-lvl4']?.replace(/^US-/, '') ?? a.state
  return [town, state].filter(Boolean).join(', ') || fallback
}

/** Search for a town, neighborhood, address or ZIP code (US). */
export async function searchPlaces(q: string): Promise<PlaceHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  type R = { lat: string; lon: string; display_name: string; address?: Record<string, string> }
  const rows = (await res.json()) as R[]
  const seen = new Set<string>()
  return rows
    .map((r) => ({ label: r.address ? shortLabel(r.address, r.display_name.split(',').slice(0, 2).join(',')) : r.display_name, lat: Number(r.lat), lng: Number(r.lon), full: r.display_name }))
    .filter((r) => !seen.has(r.label) && !!seen.add(r.label))
    .map(({ label, lat, lng }) => ({ label, lat, lng }))
}

/** A readable name for a position ("Hoboken, NJ"), or null if the lookup fails. */
export async function placeName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const r = (await res.json()) as { address?: Record<string, string> }
    return r.address ? shortLabel(r.address, '') || null : null
  } catch {
    return null
  }
}
