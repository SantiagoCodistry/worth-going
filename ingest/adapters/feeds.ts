// Generic adapters for the open web: iCalendar feeds, WordPress sites
// running The Events Calendar, Luma city calendars and schema.org JSON-LD.
import type { CategoryId, CityId } from '../../src/shared/types.ts'
import { categorize } from '../lib/enrich.ts'
import { excerpt, get, getJson, plain, slug } from '../lib/http.ts'
import { parseIcs } from '../lib/ics.ts'
import type { Draft, FetchContext } from './types.ts'

interface Defaults {
  city: CityId
  category: CategoryId
  sourceName: string
  /** Fallback link when an entry has no URL of its own. */
  homepage: string
  /** Keep only entries whose text matches, e.g. to drop admin events. */
  include?: RegExp
}

const inWindow = (start: string, end: string | undefined, ctx: FetchContext) => {
  const s = new Date(start.length === 10 ? start + 'T12:00:00Z' : start).getTime()
  const e = end ? new Date(end.length === 10 ? end + 'T23:59:59Z' : end).getTime() : s
  return e >= ctx.from.getTime() && s <= ctx.to.getTime()
}

function splitLocation(loc = ''): { name: string; address?: string } {
  const [name, ...rest] = loc.split(/,\s*/)
  return { name: name || 'See listing', address: rest.join(', ') || undefined }
}

const isFree = (text: string) => /\b(free|no charge|no cost|admission is free)\b/i.test(text)

// ——— iCalendar ———
export async function fromIcs(url: string, d: Defaults, ctx: FetchContext): Promise<Draft[]> {
  const events = parseIcs(await get(url, 'text/calendar'))
  return events
    .filter((e) => inWindow(e.start, e.end, ctx))
    .filter((e) => !d.include || d.include.test(`${e.summary} ${e.description ?? ''}`))
    .map((e) => {
      const description = excerpt(plain(e.description ?? ''))
      const text = `${e.summary} ${e.categories.join(' ')} ${description}`
      return {
        id: `${slug(d.sourceName)}-${slug(e.uid ?? e.summary)}-${e.start.slice(0, 10)}`,
        title: e.summary,
        kind: 'event' as const,
        city: d.city,
        category: categorize(text, d.category),
        tags: e.categories.map((c) => c.toLowerCase()).slice(0, 5),
        start: e.start,
        end: e.end,
        venue: splitLocation(e.location),
        description: description || e.summary,
        isFree: isFree(text) || undefined,
        image: e.image ? { url: e.image } : undefined,
        sourceName: d.sourceName,
        sourceUrl: e.url || d.homepage,
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
  venue?: { venue?: string; address?: string; city?: string } | []
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
      const text = `${title} ${cats.join(' ')} ${description}`
      if (d.include && !d.include.test(text)) continue
      const venue = Array.isArray(e.venue) ? undefined : e.venue
      const start = e.all_day ? e.start_date.slice(0, 10) : e.utc_start_date.replace(' ', 'T') + 'Z'
      const end = e.all_day ? e.end_date.slice(0, 10) : e.utc_end_date.replace(' ', 'T') + 'Z'
      out.push({
        id: `${slug(d.sourceName)}-${e.id}`,
        title,
        kind: 'event',
        city: d.city,
        category: categorize(text, d.category),
        tags: cats.map((c) => c.toLowerCase()).slice(0, 5),
        start,
        end: end === start ? undefined : end,
        venue: {
          name: plain(venue?.venue ?? '') || 'See listing',
          address: [venue?.address, venue?.city].filter(Boolean).join(', ') || undefined,
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
      const title = plain(String(e.name ?? ''))
      const startRaw = String(e.startDate ?? '')
      if (!title || !startRaw) return null
      // Dates without an offset are local; date-only stays date-only.
      const start = /T/.test(startRaw) ? new Date(startRaw).toISOString() : startRaw.slice(0, 10)
      const endRaw = e.endDate ? String(e.endDate) : undefined
      const end = endRaw ? (/T/.test(endRaw) ? new Date(endRaw).toISOString() : endRaw.slice(0, 10)) : undefined
      const loc = (Array.isArray(e.location) ? e.location[0] : e.location) as Json | undefined
      const addr = loc?.address as Json | string | undefined
      const offers = (Array.isArray(e.offers) ? e.offers[0] : e.offers) as Json | undefined
      const description = excerpt(plain(String(e.description ?? '')))
      const text = `${title} ${description}`
      const price = offers?.price != null ? (Number(offers.price) === 0 ? 'Free' : `$${offers.price}`) : undefined
      return {
        id: `${slug(d.sourceName)}-${slug(title)}-${start.slice(0, 10)}`,
        title,
        kind: 'event',
        city: d.city,
        category: categorize(text, d.category),
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
        },
        description: description || title,
        price,
        isFree: price === 'Free' || isFree(text) || undefined,
        image: str(e.image) ? { url: str(e.image)! } : undefined,
        sourceName: d.sourceName,
        sourceUrl: str(e.url) ?? url,
        ticketUrl: str(offers?.url),
      }
    })
    .filter((e): e is Draft => !!e && inWindow(e.start, e.end, ctx))
}
