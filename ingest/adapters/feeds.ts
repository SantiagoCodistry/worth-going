// Generic adapters for the open web: iCalendar feeds, WordPress sites
// running The Events Calendar, Luma city calendars and schema.org JSON-LD.
import type { CategoryId, CityId } from '../../src/shared/types.ts'
import { nyToUtc } from '../../src/shared/time.ts'
import { categorize, formatFor } from '../lib/enrich.ts'
import { excerpt, get, getJson, plain, slug } from '../lib/http.ts'
import { parseIcs } from '../lib/ics.ts'
import type { Draft, FetchContext } from './types.ts'

export interface Defaults {
  city: CityId
  category: CategoryId
  sourceName: string
  /** Fallback link when an entry has no URL of its own. */
  homepage: string
  /** Keep only entries whose text matches, e.g. to drop admin events. */
  include?: RegExp
  /** Tidy titles, e.g. drop a venue suffix the source adds to every one. */
  retitle?: (title: string) => string
}

const inWindow = (start: string, end: string | undefined, ctx: FetchContext) => {
  const s = new Date(start.length === 10 ? start + 'T12:00:00Z' : start).getTime()
  const e = end ? new Date(end.length === 10 ? end + 'T23:59:59Z' : end).getTime() : s
  return e >= ctx.from.getTime() && s <= ctx.to.getTime()
}

function splitLocation(loc = ''): { name: string; address?: string } {
  // Luma hides the address until you register and puts the event URL here instead.
  if (/^https?:\/\//.test(loc.trim())) return { name: 'Address shared after you register' }
  const [name, ...rest] = loc.split(/,\s*/)
  return { name: name || 'See listing', address: rest.join(', ') || undefined }
}

/** Coordinates when both are real numbers. */
export function latLng(lat: unknown, lng: unknown): { lat?: number; lng?: number } {
  const a = Number(lat)
  const b = Number(lng)
  return Number.isFinite(a) && Number.isFinite(b) && a && b && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : {}
}

const isFree = (text: string) => /\b(free|no charge|no cost|admission is free)\b/i.test(text)

// ——— iCalendar ———
export async function fromIcs(url: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const events = parseIcs(await get(url, 'text/calendar'))
  return events
    .filter((e) => inWindow(e.start, e.end, ctx))
    .filter((e) => !d.include || d.include.test(`${e.summary} ${e.description ?? ''}`))
    .map((e) => {
      const description = excerpt(stripBoilerplate(plain(e.description ?? '')))
      const text = `${e.categories.join(' ')} ${description}`
      // Luma puts the event's own page in the description, not in URL.
      const own = (e.description ?? '').match(/up-to-date information at:\s*(https?:\/\/\S+)/i)?.[1]
      return {
        id: `${slug(d.sourceName)}-${slug(e.uid ?? e.summary)}-${e.start.slice(0, 10)}`,
        title: e.summary,
        kind: 'event' as const,
        city: d.city,
        category: categorize(e.summary, text, d.category),
        format: formatFor(e.summary),
        tags: e.categories.map((c) => c.toLowerCase()).slice(0, 5),
        start: e.start,
        end: e.end,
        venue: { ...splitLocation(e.location), ...(e.geo ?? {}) },
        description: description || e.summary,
        isFree: isFree(text) || undefined,
        image: e.image ? { url: e.image } : undefined,
        sourceName: d.sourceName,
        sourceUrl: own || e.url || d.homepage,
      }
    })
}

// ——— WordPress: The Events Calendar REST API (/wp-json/tribe/events/v1) ———
interface TribeEvent {
  id: number
  title: string
  description: string
  url: string
  all_day: boolean
  utc_start_date: string
  utc_end_date: string
  start_date: string
  end_date: string
  cost?: string
  image?: { url: string } | false
  venue?: { venue?: string; address?: string; city?: string; geo_lat?: number | string; geo_lng?: number | string } | []
  categories?: { name: string }[]
}

export async function fromTribe(base: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const day = (x: Date) => x.toISOString().slice(0, 10)
  const out: Draft[] = []
  let url: string | undefined =
    `${base.replace(/\/$/, '')}/wp-json/tribe/events/v1/events?start_date=${day(ctx.from)}&end_date=${day(ctx.to)}&per_page=50`
  for (let page = 0; url && page < 4; page++) {
    const res: { events: TribeEvent[]; next_rest_url?: string } = await getJson(url)
    for (const e of res.events ?? []) {
      const title = plain(e.title)
      const description = excerpt(plain(e.description))
      const cats = (e.categories ?? []).map((c) => c.name)
      const text = `${cats.join(' ')} ${description}`
      if (d.include && !d.include.test(`${title} ${text}`)) continue
      const venue = Array.isArray(e.venue) ? undefined : e.venue
      const start = e.all_day ? e.start_date.slice(0, 10) : e.utc_start_date.replace(' ', 'T') + 'Z'
      const end = e.all_day ? e.end_date.slice(0, 10) : e.utc_end_date.replace(' ', 'T') + 'Z'
      out.push({
        id: `${slug(d.sourceName)}-${e.id}`,
        title,
        kind: 'event',
        city: d.city,
        category: categorize(title, text, d.category),
        format: formatFor(title),
        tags: cats.map((c) => c.toLowerCase()).slice(0, 5),
        start,
        end: end === start ? undefined : end,
        venue: {
          name: plain(venue?.venue ?? '') || 'See listing',
          address: [venue?.address, venue?.city].filter(Boolean).join(', ') || undefined,
          ...latLng(venue?.geo_lat, venue?.geo_lng),
        },
        description: description || title,
        price: e.cost || undefined,
        isFree: isFree(`${e.cost ?? ''} ${text}`) || undefined,
        image: e.image ? { url: e.image.url } : undefined,
        sourceName: d.sourceName,
        sourceUrl: e.url,
      })
    }
    url = res.next_rest_url
  }
  return out
}

// ——— Luma: official "Add iCal subscription" feed for a city page ———
export async function fromLuma(citySlug: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  // The city page embeds its discover-place id, which the iCal endpoint takes.
  const html = await get(`https://luma.com/${citySlug}`, 'text/html').catch(() =>
    get(`https://lu.ma/${citySlug}`, 'text/html'),
  )
  const id = html.match(/discplace-[A-Za-z0-9]+/)?.[0]
  if (!id) throw new Error(`No Luma place id found on /${citySlug}`)
  return fromIcs(`https://api.lu.ma/ics/get?entity=discover&id=${id}`, d, ctx)
}

// ——— schema.org Event JSON-LD embedded in a venue's own pages ———
type Json = Record<string, unknown>

function collectEvents(node: unknown, out: Json[]) {
  if (Array.isArray(node)) return node.forEach((n) => collectEvents(n, out))
  if (!node || typeof node !== 'object') return
  const o = node as Json
  const type = ([] as unknown[]).concat(o['@type'] ?? [])
  if (type.some((t) => typeof t === 'string' && /Event$/.test(t))) out.push(o)
  for (const k of ['@graph', 'itemListElement', 'item', 'subEvent']) if (o[k]) collectEvents(o[k], out)
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? str(v[0]) : v && typeof v === 'object' ? str((v as Json).url) : undefined

/** schema.org date or datetime → our ISO form. A datetime with no offset is New York local time. */
export function instant(raw: string): string {
  if (!/T/.test(raw)) return raw.slice(0, 10)
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(raw)) return new Date(raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')).toISOString()
  const [y, mo, d, h = 0, mi = 0] = raw.split(/[-T:]/).map(Number)
  return nyToUtc(y, mo, d, h, mi).toISOString()
}

export async function fromJsonLd(url: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const html = await get(url, 'text/html')
  const found: Json[] = []
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectEvents(JSON.parse(m[1].trim()), found)
    } catch {
      /* ignore invalid blocks */
    }
  }
  return found
    .map((e): Draft | null => {
      const title = (d.retitle ?? ((t: string) => t))(plain(String(e.name ?? ''))).trim()
      const startRaw = String(e.startDate ?? '')
      if (!title || !startRaw) return null
      // Dates without an offset are New York local time; date-only stays date-only.
      const start = instant(startRaw)
      const endRaw = e.endDate ? String(e.endDate) : undefined
      const end = endRaw ? instant(endRaw) : undefined
      const loc = (Array.isArray(e.location) ? e.location[0] : e.location) as Json | undefined
      const addr = loc?.address as Json | string | undefined
      const geo = loc?.geo as Json | undefined
      const offers = (Array.isArray(e.offers) ? e.offers[0] : e.offers) as Json | undefined
      // Listing sites often fill description with "Artist at Venue at <date>"; that says nothing.
      const rawDesc = excerpt(plain(String(e.description ?? '')))
      const description = /\bat .+ at \d{4}-\d{2}-\d{2}T/.test(rawDesc) || rawDesc.toLowerCase() === title.toLowerCase() ? '' : rawDesc
      const text = description
      const price = offers?.price != null ? (Number(offers.price) === 0 ? 'Free' : `$${offers.price}`) : undefined
      // Billed performers, so the card can say who they are.
      const performers = ([] as unknown[])
        .concat(e.performer ?? [])
        .map((x) => (typeof x === 'string' ? x : plain(String((x as Json)?.name ?? ''))))
        .filter((n) => n && n.length < 60)
        .slice(0, 4)
      return {
        id: `${slug(d.sourceName)}-${slug(title)}-${start.slice(0, 10)}`,
        title,
        kind: 'event',
        city: d.city,
        category: categorize(title, text, d.category),
        format: formatFor(title),
        tags: [],
        start,
        end,
        venue: {
          name: plain(String(loc?.name ?? '')) || d.sourceName,
          address:
            typeof addr === 'string'
              ? addr
              : addr
                ? [addr.streetAddress, addr.addressLocality].filter(Boolean).join(', ')
                : undefined,
          ...latLng(geo?.latitude, geo?.longitude),
        },
        description: description || title,
        price,
        isFree: price === 'Free' || isFree(`${title} ${text}`) || undefined,
        image: str(e.image) ? { url: str(e.image)! } : undefined,
        sourceName: d.sourceName,
        sourceUrl: str(e.url) ?? url,
        ticketUrl: str(offers?.url),
        people: performers.length ? performers.map((name) => ({ name, role: d.category === 'comedy' ? 'Comedian' : 'Performer' })) : undefined,
      }
    })
    .filter((e): e is Draft => !!e && inWindow(e.start, e.end, ctx))
}

/** Luma and similar calendars prepend a link and a placeholder address to every description. */
export function stripBoilerplate(text: string): string {
  return text
    .replace(/^Get up-to-date information at:\s*\S+\s*/i, '')
    .replace(/^Address:\s*(Check event page for more details\.?|Register to see address\.?)?\s*/i, '')
    .trim()
}

/** Several listing pages of the same site (page 1, 2, …), merged. Later pages may not exist. */
export async function fromJsonLdPages(urls: string[], d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const out: Draft[] = []
  for (const [i, url] of urls.entries()) {
    try {
      out.push(...(await fromJsonLd(url, d, ctx)))
    } catch (e) {
      if (i === 0) throw e
      break
    }
  }
  return out
}

// ——— Localist: the calendar platform many universities use (public JSON API) ———
type LocalistEvent = {
  id: number
  title: string
  description_text?: string
  localist_url: string
  location_name?: string
  address?: string
  room_number?: string
  photo_url?: string
  free?: boolean
  ticket_cost?: string
  ticket_url?: string
  filters?: { event_types?: { name: string }[] }
  geo?: { latitude?: string; longitude?: string }
  event_instances: { event_instance: { start: string; end?: string; all_day?: boolean } }[]
}

export async function fromLocalist(base: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const days = Math.min(90, Math.ceil((ctx.to.getTime() - ctx.from.getTime()) / 86400000))
  const out: Draft[] = []
  for (let page = 1; page <= 5; page++) {
    const res = await getJson<{ events: { event: LocalistEvent }[]; page?: { total: number } }>(
      `${base.replace(/\/$/, '')}/api/2/events?days=${days}&pp=100&page=${page}`,
    )
    for (const { event: e } of res.events ?? []) {
      const title = plain(e.title)
      const description = excerpt(plain(e.description_text ?? ''))
      const types = (e.filters?.event_types ?? []).map((t) => t.name)
      const text = `${types.join(' ')} ${description}`
      if (d.include && !d.include.test(`${title} ${text}`)) continue
      const inst = e.event_instances[0]?.event_instance
      if (!inst) continue
      const start = inst.all_day ? inst.start.slice(0, 10) : new Date(inst.start).toISOString()
      const end = inst.end ? (inst.all_day ? inst.end.slice(0, 10) : new Date(inst.end).toISOString()) : undefined
      if (!inWindow(start, end, ctx)) continue
      const photo = e.photo_url && !/default|placeholder/i.test(e.photo_url) ? e.photo_url.replace('/huge/', '/big/') : undefined
      out.push({
        id: `${slug(d.sourceName)}-${e.id}-${start.slice(0, 10)}`,
        title,
        kind: 'event',
        city: d.city,
        category: categorize(title, text, d.category),
        format: formatFor(title),
        tags: types.map((t) => t.toLowerCase()).slice(0, 5),
        start,
        end: end === start ? undefined : end,
        venue: { name: plain(e.location_name ?? '') || d.sourceName, address: e.address || undefined, ...latLng(e.geo?.latitude, e.geo?.longitude) },
        description: description || title,
        price: e.free ? 'Free' : e.ticket_cost || undefined,
        isFree: e.free || isFree(text) || undefined,
        image: photo ? { url: photo } : undefined,
        sourceName: d.sourceName,
        sourceUrl: e.localist_url,
        ticketUrl: e.ticket_url || undefined,
      })
    }
    if (!res.page || page >= res.page.total) break
  }
  return out
}
