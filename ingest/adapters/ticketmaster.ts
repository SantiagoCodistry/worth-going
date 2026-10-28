// Ticketmaster Discovery API: concerts, comedy, theatre and games across the
// whole region, with current price ranges and direct ticket links.
// Runs only when TICKETMASTER_API_KEY is set (free key from
// developer.ticketmaster.com). Everything else works without it.
import type { CategoryId, Person } from '../../src/shared/types.ts'
import { areaFor } from '../lib/area.ts'
import { getJson } from '../lib/http.ts'
import type { Draft, FetchContext } from './types.ts'

// Centre of the region (near Princeton) and a radius that reaches NYC and Philadelphia.
const CENTER = '40.3487,-74.6593'
const RADIUS_MILES = 75

// Listings that aren't events.
const NOT_EVENTS = /\b(parking|vip|package|upgrade|add-?on|suite|gift card|tribute|experience package|meet & greet|pre-?show|lounge access|fast lane|souvenir|hotel)\b/i

type TMImage = { url: string; width: number; ratio?: string }
type TMClass = { segment?: { name: string }; genre?: { name: string }; subGenre?: { name: string } }
type TMEvent = {
  id: string
  name: string
  url: string
  info?: string
  pleaseNote?: string
  dates: { start: { dateTime?: string; localDate: string; timeTBA?: boolean; noSpecificTime?: boolean }; status?: { code: string } }
  images?: TMImage[]
  priceRanges?: { min: number; max: number; currency?: string }[]
  classifications?: TMClass[]
  _embedded?: {
    venues?: { name: string; address?: { line1?: string }; city?: { name: string }; state?: { stateCode: string } }[]
    attractions?: { name: string; classifications?: TMClass[] }[]
  }
}

function categoryFor(c?: TMClass): CategoryId {
  const seg = c?.segment?.name ?? ''
  const genre = c?.genre?.name ?? ''
  if (/comedy/i.test(genre)) return 'comedy'
  if (seg === 'Music') return 'music'
  if (seg === 'Sports') return 'sports'
  if (/museum|exhibit|fine art|dance|theatre|theater|opera|ballet|film/i.test(`${genre} ${seg}`)) return 'art'
  if (/lecture|seminar|spoken word|magic|circus|variety/i.test(genre)) return 'unusual'
  return seg === 'Arts & Theatre' ? 'art' : 'unusual'
}

function formatFor(c?: TMClass): string | undefined {
  const seg = c?.segment?.name ?? ''
  const genre = (c?.genre?.name ?? '').replace(/^Undefined$/i, '')
  const sub = (c?.subGenre?.name ?? '').replace(/^Undefined$/i, '')
  if (/comedy/i.test(genre)) return 'Stand-up comedy'
  if (seg === 'Music') return genre ? `${genre === 'Other' ? sub || 'Live' : genre} concert` : 'Concert'
  if (seg === 'Sports') return genre || 'Sports'
  if (genre) return genre === 'Theatre' ? 'Theater' : genre
  return undefined
}

const usd = (n: number) => `$${Math.round(n)}`

async function page(key: string, classification: string, ctx: FetchContext, n: number) {
  const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z')
  const q = new URLSearchParams({
    apikey: key,
    latlong: CENTER,
    radius: String(RADIUS_MILES),
    unit: 'miles',
    classificationName: classification,
    startDateTime: iso(ctx.from),
    endDateTime: iso(ctx.to),
    size: '200',
    page: String(n),
    sort: 'date,asc',
    locale: '*',
  })
  type R = { _embedded?: { events: TMEvent[] }; page?: { totalPages: number } }
  return getJson<R>(`https://app.ticketmaster.com/discovery/v2/events.json?${q}`)
}

export async function ticketmasterRegion(ctx: FetchContext): Promise<Draft[]> {
  const key = process.env.TICKETMASTER_API_KEY
  if (!key) return []
  const raw: TMEvent[] = []
  // Pages per kind of event; the API allows 5 requests a second.
  for (const [cls, pages] of [
    ['music', 5],
    ['comedy', 2],
    ['theatre', 2],
    ['sports', 2],
  ] as const) {
    for (let n = 0; n < pages; n++) {
      const r = await page(key, cls, ctx, n)
      raw.push(...(r._embedded?.events ?? []))
      await new Promise((ok) => setTimeout(ok, 250))
      if (!r.page || n + 1 >= r.page.totalPages) break
    }
  }

  const seen = new Set<string>()
  const out: Draft[] = []
  for (const e of raw) {
    if (seen.has(e.id) || NOT_EVENTS.test(e.name) || /cancel|postpon/i.test(e.dates.status?.code ?? '')) continue
    seen.add(e.id)
    const v = e._embedded?.venues?.[0]
    const city = areaFor(v?.city?.name, v?.state?.stateCode)
    if (!city) continue
    const c = e.classifications?.[0]
    const img = e.images
      ?.filter((i) => i.ratio === '16_9' || i.ratio === '4_3' || i.ratio === '3_2')
      .sort((a, b) => b.width - a.width)[0]
    const price = e.priceRanges?.[0]
    const people: Person[] =
      e._embedded?.attractions?.slice(0, 4).map((a) => {
        const g = a.classifications?.[0]?.genre?.name
        const seg = a.classifications?.[0]?.segment?.name
        const role = seg === 'Sports' ? 'Team' : g && g !== 'Undefined' ? `${g} act` : 'Performer'
        return { name: a.name, role }
      }) ?? []
    const timed = !!e.dates.start.dateTime && !e.dates.start.timeTBA && !e.dates.start.noSpecificTime
    out.push({
      id: `tm-${e.id}`,
      title: e.name,
      format: formatFor(c),
      kind: 'event',
      city,
      category: categoryFor(c),
      tags: [c?.genre?.name, c?.subGenre?.name].filter((t): t is string => !!t && t !== 'Undefined').map((t) => t.toLowerCase()),
      start: timed ? e.dates.start.dateTime! : e.dates.start.localDate,
      timeTBA: !timed || undefined,
      venue: {
        name: v?.name ?? 'Venue on the listing',
        address: [v?.address?.line1, v?.city?.name, v?.state?.stateCode].filter(Boolean).join(', ') || undefined,
      },
      description: (e.info ?? '').trim() || `${formatFor(c) ?? 'Live event'} at ${v?.name ?? 'the venue'}, ${v?.city?.name ?? ''}.`.replace(/, \.$/, '.'),
      people: people.length ? people : undefined,
      price: price ? (price.min === price.max ? usd(price.min) : `${usd(price.min)}–${usd(price.max)}`) : undefined,
      image: img && img.width >= 1000 ? { url: img.url, credit: 'Ticketmaster', w: img.width } : undefined,
      sourceName: 'Ticketmaster',
      sourceUrl: e.url,
      ticketUrl: e.url,
    } as Draft)
  }
  return out
}
