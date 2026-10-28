// Optional: Ticketmaster Discovery API. Only runs when TICKETMASTER_API_KEY
// is set (free key from developer.ticketmaster.com). Everything else in
// Worth Going works without it — this simply broadens concert coverage.
import type { CityId } from '../../src/shared/types.ts'
import { categorize } from '../lib/enrich.ts'
import { getJson } from '../lib/http.ts'
import type { Draft, FetchContext } from './types.ts'

const DMA: Record<CityId, string> = { nyc: '345', philly: '358', princeton: '345' }

export async function ticketmaster(city: CityId, ctx: FetchContext): Promise<Draft[]> {
  const key = process.env.TICKETMASTER_API_KEY
  if (!key) return []
  type Img = { url: string; width: number; ratio?: string }
  type R = {
    _embedded?: {
      events: {
        id: string
        name: string
        url: string
        info?: string
        dates: { start: { dateTime?: string; localDate: string }; timeTBA?: boolean }
        images?: Img[]
        priceRanges?: { min: number }[]
        classifications?: { segment?: { name: string }; genre?: { name: string } }[]
        _embedded?: { venues?: { name: string; address?: { line1?: string }; city?: { name: string } }[] }
      }[]
    }
  }
  const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z')
  const r = await getJson<R>(
    `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${key}&dmaId=${DMA[city]}` +
      `&classificationName=music&startDateTime=${iso(ctx.from)}&endDateTime=${iso(ctx.to)}&size=100&sort=relevance,desc`,
  )
  return (r._embedded?.events ?? []).map((e) => {
    const v = e._embedded?.venues?.[0]
    const img = e.images?.filter((i) => i.ratio === '16_9').sort((a, b) => b.width - a.width)[0]
    const genre = e.classifications?.[0]?.genre?.name
    return {
      id: `tm-${e.id}`,
      title: e.name,
      kind: 'event',
      city,
      category: categorize(e.name, genre ?? '', 'music'),
      tags: genre ? [genre.toLowerCase()] : [],
      start: e.dates.start.dateTime ?? e.dates.start.localDate,
      timeTBA: !e.dates.start.dateTime || undefined,
      venue: { name: v?.name ?? 'See listing', address: [v?.address?.line1, v?.city?.name].filter(Boolean).join(', ') },
      description: e.info ?? `${e.name} at ${v?.name ?? 'a venue near you'}.`,
      price: e.priceRanges?.[0] ? `From $${Math.round(e.priceRanges[0].min)}` : undefined,
      image: img ? { url: img.url } : undefined,
      sourceName: 'Ticketmaster',
      sourceUrl: e.url,
      ticketUrl: e.url,
    } satisfies Draft
  })
}
