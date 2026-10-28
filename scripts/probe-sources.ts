// Tries candidate event sources with each keyless adapter and reports what
// works. Run in CI (the dev container can't reach these sites):
//   npx tsx scripts/probe-sources.ts > probe.json
import { writeFileSync } from 'node:fs'
import { fromJsonLd, fromLuma, type Defaults } from '../ingest/adapters/feeds.ts'
import type { Draft } from '../ingest/adapters/types.ts'
import type { CityId } from '../src/shared/types.ts'

// Round 2: pages that list many events at once, tried with JSON-LD and Luma.
const PAGES: [CityId, string][] = [
  ['princeton', 'https://www.eventbrite.com/d/nj--princeton/all-events/'],
  ['princeton', 'https://www.eventbrite.com/d/nj--princeton/events--this-month/'],
  ['nj', 'https://www.eventbrite.com/d/nj--new-brunswick/all-events/'],
  ['nyc', 'https://www.eventbrite.com/d/ny--new-york/comedy--events/'],
  ['nyc', 'https://www.eventbrite.com/d/ny--new-york/science-and-tech--events/'],
  ['nyc', 'https://www.eventbrite.com/d/ny--new-york/startups--events/'],
  ['nyc', 'https://www.eventbrite.com/d/ny--new-york/talks--events/'],
  ['philly', 'https://www.eventbrite.com/d/pa--philadelphia/comedy--events/'],
  ['philly', 'https://www.eventbrite.com/d/pa--philadelphia/science-and-tech--events/'],
  ['nyc', 'https://www.songkick.com/metro-areas/7644-us-new-york-nyc'],
  ['philly', 'https://www.songkick.com/metro-areas/5202-us-philadelphia'],
  ['nyc', 'https://www.unionhallny.com/calendar'],
  ['nyc', 'https://www.thebellhouseny.com/calendar'],
  ['nyc', 'https://www.gothamcomedyclub.com/calendar'],
  ['nyc', 'https://www.newyorkcomedyclub.com/calendar'],
  ['nyc', 'https://standupny.com/calendar'],
  ['nyc', 'https://www.thestandnyc.com/shows'],
  ['nyc', 'https://www.caveat.nyc/events'],
  ['nyc', 'https://www.brooklyncomedycollective.com/calendar'],
  ['nyc', 'https://www.unionpool.com/calendar'],
  ['nyc', 'https://www.babysallright.com/calendar'],
  ['nyc', 'https://www.bowerypresents.com/new-york-city/shows'],
  ['nyc', 'https://www.mercuryeastpresents.com/'],
  ['nyc', 'https://www.irvingplaza.com/shows'],
  ['nyc', 'https://www.bowery.com/events'],
  ['nyc', 'https://www.knittingfactory.com/brooklyn/'],
  ['nyc', 'https://www.nationalsawdust.org/events'],
  ['nyc', 'https://www.villagevanguard.com/'],
  ['nyc', 'https://www.smallslive.com/'],
  ['nyc', 'https://www.dizzysclub.org/'],
  ['princeton', 'https://www.mccarter.org/events/'],
  ['princeton', 'https://www.mccarter.org/season/'],
  ['princeton', 'https://princetonlibrary.org/events/'],
  ['princeton', 'https://www.labyrinthbooks.com/events/'],
  ['princeton', 'https://www.princetongardentheatre.org/films/'],
  ['princeton', 'https://www.hopewelltheater.com/events'],
  ['princeton', 'https://www.hopewelltheater.com/shows'],
  ['princeton', 'https://www.kelseytheatre.org/shows'],
  ['princeton', 'https://www.groundsforsculpture.org/events/'],
  ['princeton', 'https://www.morven.org/events/'],
  ['princeton', 'https://drgreenway.org/events/'],
  ['princeton', 'https://princetonuniversityconcerts.org/concerts/'],
  ['princeton', 'https://www.princetonsymphony.org/concerts/'],
  ['nj', 'https://www.stonepony.com/events'],
  ['nj', 'https://www.asburylanes.com/events'],
  ['nj', 'https://www.thewellmont.com/events'],
  ['nj', 'https://www.njpac.org/events/'],
  ['nj', 'https://www.mayoarts.org/events'],
  ['nj', 'https://www.statetheatrenj.org/events'],
  ['philly', 'https://www.utphilly.com/events'],
  ['philly', 'https://www.johnnybrendas.com/events'],
  ['philly', 'https://www.franklinmusichall.com/events'],
  ['philly', 'https://www.worldcafelive.com/events'],
  ['philly', 'https://www.thefillmorephilly.com/shows'],
  ['philly', 'https://www.helium-comedy.com/philadelphia'],
  ['philly', 'https://philadelphia.heliumcomedy.com/events'],
  ['philly', 'https://www.easternstate.org/events'],
  ['philly', 'https://www.wagnerfreeinstitute.org/events'],
]
const LUMA = ['tech', 'ai', 'princeton', 'new-jersey', 'nj', 'brooklyn', 'philly', 'newyork', 'arts', 'climate', 'crypto', 'wellness', 'food']

const now = new Date()
const ctx = { from: now, to: new Date(now.getTime() + 45 * 86400000) }
const timeout = <T>(p: Promise<T>, ms = 20000) => Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error('timed out')), ms))])

type Result = { base: string; city: CityId; method: string; url: string; count: number; sample: string[] }
const results: Result[] = []
const errors: Record<string, string[]> = {}

async function attempt(base: string, city: CityId, method: string, url: string, run: (d: Defaults) => Promise<Draft[]>) {
  const d: Defaults = { city, category: 'unusual', sourceName: new URL(base).hostname, homepage: base }
  try {
    const got = await timeout(run(d))
    if (got.length) results.push({ base, city, method, url, count: got.length, sample: got.slice(0, 10).map((e) => `${e.start.slice(0, 10)} ${e.title} @ ${e.venue.name}`) })
    else (errors[base] ??= []).push(`${method}: 0 events`)
  } catch (e) {
    ;(errors[base] ??= []).push(`${method}: ${(e as Error).message.slice(0, 90)}`)
  }
}

const queue: (() => Promise<void>)[] = [
  ...PAGES.map(([city, url]) => () => attempt(url, city, 'jsonld', url, (d) => fromJsonLd(url, d, ctx))),
  ...LUMA.map((slug) => () => attempt(`https://luma.com/${slug}`, 'nyc', 'luma', `https://luma.com/${slug}`, (d) => fromLuma(slug, d, ctx))),
]
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
console.log(`${best.size} of ${PAGES.length + LUMA.length} pages returned events`)
