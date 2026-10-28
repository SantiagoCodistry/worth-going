// Loading editions and choosing the ten to show.
/// <reference types="vite/client" />
import type { CategoryId } from '../shared/types.ts'
import type { Edition, EditionCity, EditionIndexEntry, Pick, PlacePick } from '../shared/edition.ts'
import { isDateOnly, nyDateKey } from '../shared/time.ts'
import { tzOf } from '../shared/taxonomy.ts'

const base = import.meta.env?.BASE_URL ?? '/'

export async function loadIndex(): Promise<EditionIndexEntry[]> {
  const r = await fetch(`${base}data/editions/index.json`, { cache: 'no-cache' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function loadEdition(date: string): Promise<Edition> {
  const r = await fetch(`${base}data/editions/${date}.json`, { cache: 'no-cache' })
  if (!r.ok) throw new Error(r.status === 404 ? 'There’s no edition for that date.' : `HTTP ${r.status}`)
  return r.json()
}

/** The edition for today: the newest one that has come out. */
export function currentDate(index: EditionIndexEntry[], today = nyDateKey(new Date())): string | undefined {
  return index.find((e) => e.date <= today)?.date ?? index[index.length - 1]?.date
}

/** An area, everywhere, or the area nearest you ('near'). */
export type CityChoice = EditionCity | 'all' | 'near'

/** Where you are, from your device. Kept in this browser only. */
export interface Here {
  lat: number
  lng: number
}

const AREA_CENTER: Record<EditionCity, Here> = {
  princeton: { lat: 40.3487, lng: -74.6593 },
  nyc: { lat: 40.7359, lng: -73.9911 },
  philly: { lat: 39.9526, lng: -75.1652 },
}

export function milesBetween(a: Here, b: Here): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 3958.8 * Math.asin(Math.sqrt(h))
}

/** The edition area closest to you, and how far its middle is. */
export function nearestArea(here: Here): { city: EditionCity; miles: number } {
  return (Object.keys(AREA_CENTER) as EditionCity[])
    .map((city) => ({ city, miles: milesBetween(here, AREA_CENTER[city]) }))
    .sort((a, b) => a.miles - b.miles)[0]
}

/** Miles from you to a pick or restaurant, when we know where it is. */
export function milesTo(here: Here | null, at: { lat?: number; lng?: number }): number | null {
  return here && at.lat && at.lng ? milesBetween(here, { lat: at.lat, lng: at.lng }) : null
}

/** Distances only mean something when you're in or near the area. */
export const showMiles = (mi: number | null): mi is number => mi !== null && mi <= 60

export const formatMiles = (mi: number) => (mi < 0.2 ? 'Around the corner' : mi < 10 ? `${mi.toFixed(1)} mi away` : `${Math.round(mi)} mi away`)

/** Ask the browser where you are. Rejects with 'denied' | 'unavailable' | 'unsupported'. */
export function locate(): Promise<Here> {
  return new Promise((ok, no) => {
    if (!('geolocation' in navigator)) return no('unsupported')
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: Math.round(p.coords.latitude * 1000) / 1000, lng: Math.round(p.coords.longitude * 1000) / 1000 }),
      (e) => no(e.code === 1 ? 'denied' : 'unavailable'),
      { timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export const CITY_LABEL: Record<CityChoice, string> = {
  near: 'Near me',
  all: 'Everywhere',
  princeton: 'Princeton',
  nyc: 'New York',
  philly: 'Philadelphia',
}

/** What you're into, for ordering the pool. */
export const INTERESTS: { id: string; label: string; categories: CategoryId[] }[] = [
  { id: 'music', label: 'Live music', categories: ['music'] },
  { id: 'comedy', label: 'Comedy', categories: ['comedy'] },
  { id: 'ideas', label: 'Talks and ideas', categories: ['ideas'] },
  { id: 'art', label: 'Art', categories: ['art'] },
  { id: 'odd', label: 'Odd and fun', categories: ['unusual'] },
  { id: 'sports', label: 'Sports', categories: ['sports'] },
  { id: 'startups', label: 'Startups', categories: ['startups'] },
]

export interface Taste {
  interests: string[]
  /** Artist names from Spotify. */
  artists: string[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Is one of your Spotify artists in this pick? */
export function artistIn(p: Pick, artists: string[]): string | undefined {
  if (!artists.length) return undefined
  const names = [p.title, ...(p.people ?? []).map((x) => x.name)].map(norm)
  return artists.find((a) => {
    const n = norm(a)
    return n.length >= 3 && names.some((x) => x === n || (n.length >= 5 && ` ${x} `.includes(` ${n} `)))
  })
}

export interface Ranked {
  pick: Pick
  /** Why it moved up, when ordering for you. */
  reason?: string
}

/**
 * The ten to show: the editor's order, filtered by city, nudged by your taste
 * when you've set one. With no taste it's exactly the editor's list.
 */
export function topTen(edition: Edition, city: CityChoice, taste: Taste, here: Here | null = null): Ranked[] {
  const area = city === 'near' ? (here ? nearestArea(here).city : 'nyc') : city
  const pool = edition.picks.filter((p) => area === 'all' || p.city === area)
  const personal = taste.interests.length > 0 || taste.artists.length > 0
  const near = city === 'near' && here
  if (!personal && !near) return pool.slice(0, 10).map((pick) => ({ pick }))
  const liked = new Set(INTERESTS.filter((i) => taste.interests.includes(i.id)).flatMap((i) => i.categories))
  return pool
    .map((pick, i) => {
      const artist = artistIn(pick, taste.artists)
      const interest = liked.has(pick.category)
      // Editor's order counts most; your taste lifts a pick a few places, an artist you play lifts it to the top.
      // Near me: closer picks move up a little; far ones (more than ~20 miles) drop a few places.
      const mi = near ? milesTo(here, pick.venue) : null
      // Gentle enough that the editor's order mostly holds: about one place up when it's close by.
      const distance = mi === null ? 0 : mi < 3 ? 1.5 : mi < 8 ? 0.5 : mi > 20 ? -3 : 0
      const score = pool.length - i + (interest ? 6 : 0) + (artist ? 40 : 0) - (liked.size && !interest && !artist ? 3 : 0) + distance
      return { pick, score, reason: artist ? `You listen to ${artist}` : undefined }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ pick, reason }) => ({ pick, reason }))
}

/** Ten places to eat for the city, or a mix for everywhere. */
export function placesFor(edition: Edition, city: CityChoice, here: Here | null = null): PlacePick[] {
  if (city === 'near') {
    const area = here ? nearestArea(here).city : 'nyc'
    const list = edition.places.filter((p) => p.city === area)
    if (!here) return list.slice(0, 10)
    // Closest first; places we can't place keep the editor's order at the end.
    return list
      .map((p, i) => ({ p, d: milesTo(here, p) ?? 1000 + i }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.p)
      .slice(0, 10)
  }
  if (city !== 'all') return edition.places.filter((p) => p.city === city).slice(0, 10)
  const by = (c: EditionCity, n: number) => edition.places.filter((p) => p.city === c).slice(0, n)
  return [...by('nyc', 4), ...by('philly', 3), ...by('princeton', 3)]
}

// ——— Dates, in each pick's own city time ———

const fmt = (p: Pick, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: tzOf(p.city), ...o })
const fmtDay = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...o }).format(new Date(`${iso}T12:00:00Z`))

export function timeOf(p: Pick): string | null {
  if (p.timeTBA || isDateOnly(p.start)) return null
  return fmt(p, { hour: 'numeric', minute: '2-digit' }).format(new Date(p.start)).replace(':00', '').replace(' AM', ' am').replace(' PM', ' pm')
}

/** "Saturday, October 31 · 7 pm", or "On view through January 31". */
export function whenOf(p: Pick): string {
  if (p.exhibition) return p.end ? `On view through ${fmtDay(p.end.slice(0, 10), { month: 'long', day: 'numeric' })}` : 'On view now'
  const day = isDateOnly(p.start) ? fmtDay(p.start, { weekday: 'long', month: 'long', day: 'numeric' }) : fmt(p, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(p.start))
  const t = timeOf(p)
  const multi = p.end && nyDateKey(p.end, tzOf(p.city)) !== nyDateKey(p.start, tzOf(p.city))
  if (multi && isDateOnly(p.end!)) return `${day} – ${fmtDay(p.end!, { month: 'long', day: 'numeric' })}`
  return t ? `${day} · ${t}` : day
}

/** "Sat 31" for the small date line. */
export function shortDay(p: Pick): string {
  if (p.exhibition) return 'On view'
  const d = new Date(isDateOnly(p.start) ? `${p.start}T12:00:00Z` : p.start)
  return new Intl.DateTimeFormat('en-US', { timeZone: isDateOnly(p.start) ? 'UTC' : tzOf(p.city), weekday: 'short', month: 'short', day: 'numeric' }).format(d)
}

/** Has it already happened (not counting exhibitions still on view)? */
export function isPast(p: Pick, now = Date.now()): boolean {
  const last = p.end ?? p.start
  const t = isDateOnly(last) ? Date.parse(`${last}T23:59:59-05:00`) : Date.parse(last) + 3 * 3600_000
  return t < now
}

export function weekLabel([from, to]: [string, string]): string {
  const f = (d: string, o: Intl.DateTimeFormatOptions) => fmtDay(d, o)
  const sameMonth = from.slice(5, 7) === to.slice(5, 7)
  return `${f(from, { month: 'long', day: 'numeric' })} – ${sameMonth ? f(to, { day: 'numeric' }) : f(to, { month: 'long', day: 'numeric' })}`
}

export function editionDateLabel(date: string): string {
  return fmtDay(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// ——— Calendar ———

const gcal = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function calendarUrl(p: Pick): string {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: p.title, details: `${p.why}\n\n${p.link}`, location: [p.venue.name, p.venue.address].filter(Boolean).join(', ') })
  if (isDateOnly(p.start) || p.exhibition) {
    const start = (p.exhibition ? nyDateKey(new Date()) : p.start).replace(/-/g, '')
    const endDay = new Date(`${(p.exhibition ? nyDateKey(new Date()) : p.end ?? p.start).slice(0, 10)}T12:00:00Z`)
    endDay.setUTCDate(endDay.getUTCDate() + 1)
    q.set('dates', `${start}/${endDay.toISOString().slice(0, 10).replace(/-/g, '')}`)
  } else {
    const s = new Date(p.start)
    const e = p.end && !isDateOnly(p.end) ? new Date(p.end) : new Date(s.getTime() + 2 * 3600_000)
    q.set('dates', `${gcal(s)}/${gcal(e)}`)
  }
  return `https://calendar.google.com/calendar/render?${q}`
}

/** A weekly Thursday reminder, as an .ics file: a free way to come back every week. */
export function thursdayReminderIcs(siteUrl: string): string {
  // Next Thursday at 8 am New York.
  const now = new Date()
  const d = new Date(now)
  d.setUTCDate(now.getUTCDate() + ((4 - now.getUTCDay() + 7) % 7 || 7))
  const day = d.toISOString().slice(0, 10).replace(/-/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Worth Going//EN',
    'BEGIN:VEVENT',
    `UID:worth-going-thursday@worthgoing`,
    `DTSTAMP:${gcal(now)}`,
    `DTSTART;TZID=America/New_York:${day}T080000`,
    `DTEND;TZID=America/New_York:${day}T081500`,
    'RRULE:FREQ=WEEKLY;BYDAY=TH',
    'SUMMARY:New Worth Going: 10 things worth leaving the house for',
    `URL:${siteUrl}`,
    `DESCRIPTION:This week’s ten: ${siteUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
