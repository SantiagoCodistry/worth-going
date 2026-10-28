// Tries candidate event sources with each keyless adapter and reports what
// works. Run in CI (the dev container can't reach these sites):
//   npx tsx scripts/probe-sources.ts > probe.json
import { writeFileSync } from 'node:fs'
import { fromIcs, fromJsonLd, fromLocalist, fromLuma, fromTribe, type Defaults } from '../ingest/adapters/feeds.ts'
import type { Draft } from '../ingest/adapters/types.ts'
import type { CityId } from '../src/shared/types.ts'
import { getJson } from '../ingest/lib/http.ts'

// Round 4: Mexico City. Each site is tried as Tribe, Localist, iCal and JSON-LD.
const SITES: [CityId, string, string[]][] = [
  ['cdmx', 'https://www.songkick.com', ['/metro-areas/34385-mexico-mexico-city']],
  ['cdmx', 'https://www.lunario.com.mx', ['/cartelera', '/eventos']],
  ['cdmx', 'https://www.auditorio.com.mx', ['/cartelera', '/eventos']],
  ['cdmx', 'https://www.elplaza.mx', ['/eventos', '/cartelera']],
  ['cdmx', 'https://www.pepsicenter.com.mx', ['/eventos']],
  ['cdmx', 'https://www.arenacdmx.com', ['/eventos', '/calendario']],
  ['cdmx', 'https://www.teatrometropolitan.com.mx', ['/eventos']],
  ['cdmx', 'https://indierocks.mx', ['/foro', '/eventos']],
  ['cdmx', 'https://www.cinetecanacional.net', ['/cartelera.php', '/']],
  ['cdmx', 'https://muac.unam.mx', ['/exposiciones', '/actividades']],
  ['cdmx', 'https://www.fundacionjumex.org', ['/es/museo/exposiciones', '/es/museo/calendario']],
  ['cdmx', 'https://www.museotamayo.org', ['/exposiciones', '/actividades']],
  ['cdmx', 'https://palacio.inba.gob.mx', ['/exposiciones', '/cartelera']],
  ['cdmx', 'https://www.museofridakahlo.org.mx', ['/es/exposiciones']],
  ['cdmx', 'https://kurimanzutto.com', ['/exhibitions', '/es/exhibitions']],
  ['cdmx', 'https://cartelera.cdmx.gob.mx', ['/', '/busqueda']],
  ['cdmx', 'https://www.cultura.unam.mx', ['/', '/cartelera']],
  ['cdmx', 'https://www.eventbrite.com.mx', ['/d/mexico--ciudad-de-méxico/all-events/', '/d/mexico--ciudad-de-mexico/tecnologia--events/']],
  ['cdmx', 'https://www.ticketmaster.com.mx', ['/discover/concerts', '/']],
  ['cdmx', 'https://www.boletia.com', ['/', '/eventos']],
  ['cdmx', 'https://www.passline.com', ['/eventos-en-ciudad-de-mexico']],
  ['cdmx', 'https://www.residentadvisor.net', ['/events/mx/mexicocity']],
  ['cdmx', 'https://ra.co', ['/events/mx/mexicocity']],
  ['cdmx', 'https://www.timeoutmexico.mx', ['/ciudad-de-mexico/que-hacer']],
]
const now = new Date()
const ctx = { from: now, to: new Date(now.getTime() + 45 * 86400000) }
const timeout = <T>(p: Promise<T>, ms = 20000) => Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error('timed out')), ms))])

type Result = { base: string; city: CityId; method: string; url: string; count: number; sample: string[] }
const results: Result[] = []
const errors: Record<string, string[]> = {}

async function attempt(base: string, city: CityId, method: string, url: string, run: (d: Defaults) => Promise<Draft[]>) {
  const d: Defaults = { city, category: 'unusual', sourceName: base.startsWith('http') ? new URL(base).hostname : base, homepage: base }
  try {
    const got = await timeout(run(d))
    if (got.length) results.push({ base, city, method, url, count: got.length, sample: got.slice(0, 40).map((e) => `${e.start.slice(0, 16)} ${e.title} @ ${e.venue.name}`) })
    else (errors[base] ??= []).push(`${method}: 0 events`)
  } catch (e) {
    ;(errors[base] ??= []).push(`${method}: ${(e as Error).message.slice(0, 90)}`)
  }
}

const LUMA_SLUGS = ['mexico-city', 'cdmx', 'mexicocity', 'ciudad-de-mexico']
const extra: (() => Promise<void>)[] = [
  ...LUMA_SLUGS.map((slug) => () => attempt(`https://luma.com/${slug}`, 'cdmx', 'luma', `https://luma.com/${slug}`, (d) => fromLuma(slug, d, ctx))),
  () =>
    attempt('espn mex.1', 'cdmx', 'espn', 'mex.1 scoreboard', async () => {
      const r = await getJson<{ events: { name: string; date: string; competitions: { venue?: { fullName?: string; address?: { city?: string } } }[] }[] }>(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=20261028-20261215&limit=200',
      )
      return r.events.map((e) => ({ title: e.name, start: e.date, venue: { name: `${e.competitions[0]?.venue?.fullName} (${e.competitions[0]?.venue?.address?.city})` } })) as unknown as Draft[]
    }),
]
const queue: (() => Promise<void>)[] = [...extra, ...SITES.flatMap(([city, base, paths]) => [
  () => attempt(base, city, 'tribe', base, (d) => fromTribe(base, d, ctx)),
  () => attempt(base, city, 'localist', base, (d) => fromLocalist(base, d, ctx)),
  ...['/events/?ical=1', '/?ical=1', ...paths.filter((x) => /ical|\.ics/.test(x))].map((x) => () => attempt(base, city, 'ics', base + x, (d) => fromIcs(base + x, d, ctx))),
  ...['', ...paths].map((x) => () => attempt(base, city, 'jsonld', base + x, (d) => fromJsonLd(base + x, d, ctx))),
])]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await job()
  }),
)
// Best method per site.
const best = new Map<string, Result>()
for (const r of results) if (!best.has(r.base) || best.get(r.base)!.count < r.count) best.set(r.base, r)
const report = { at: now.toISOString(), working: [...best.values()].sort((a, b) => b.count - a.count), failing: Object.fromEntries(Object.entries(errors).filter(([b]) => !best.has(b))) }
writeFileSync('probe.json', JSON.stringify(report, null, 1))
console.log(`${best.size} of ${SITES.length} pages returned events`)
