// Tries candidate event sources with each keyless adapter and reports what
// works. Run in CI (the dev container can't reach these sites):
//   npx tsx scripts/probe-sources.ts > probe.json
import { writeFileSync } from 'node:fs'
import { fromIcs, fromJsonLd, fromLocalist, fromTribe, type Defaults } from '../ingest/adapters/feeds.ts'
import type { Draft } from '../ingest/adapters/types.ts'
import type { CityId } from '../src/shared/types.ts'

const C: [CityId, string][] = [
  // Princeton and central NJ
  ['princeton', 'https://events.princeton.edu'],
  ['princeton', 'https://artscouncilofprinceton.org'],
  ['princeton', 'https://www.mccarter.org'],
  ['princeton', 'https://princetonlibrary.org'],
  ['princeton', 'https://www.morven.org'],
  ['princeton', 'https://www.labyrinthbooks.com'],
  ['princeton', 'https://www.princetongardentheatre.org'],
  ['princeton', 'https://drgreenway.org'],
  ['princeton', 'https://www.hopewelltheater.com'],
  ['princeton', 'https://www.princetonsymphony.org'],
  ['princeton', 'https://princetonuniversityconcerts.org'],
  ['princeton', 'https://www.princetonhistory.org'],
  ['princeton', 'https://palmersquare.com'],
  ['princeton', 'https://artmuseum.princeton.edu'],
  ['princeton', 'https://www.terhuneorchards.com'],
  ['princeton', 'https://www.kelseytheatre.org'],
  ['princeton', 'https://events.tcnj.edu'],
  ['princeton', 'https://www.groundsforsculpture.org'],
  ['princeton', 'https://www.sesamepl.com'],
  ['princeton', 'https://www.princetonchamber.org'],
  ['princeton', 'https://www.ias.edu'],
  ['princeton', 'https://www.cityofprinceton.org'],
  ['nj', 'https://www.statetheatrenj.org'],
  ['nj', 'https://events.rutgers.edu'],
  ['nj', 'https://events.stevens.edu'],
  ['nj', 'https://events.njit.edu'],
  ['nj', 'https://www.njpac.org'],
  ['nj', 'https://www.whiteeaglehall.org'],
  ['nj', 'https://www.montclairfilm.org'],
  ['nj', 'https://www.thewellmont.com'],
  ['nj', 'https://www.asburylanes.com'],
  ['nj', 'https://www.stonepony.com'],
  // New York
  ['nyc', 'https://events.columbia.edu'],
  ['nyc', 'https://events.nyu.edu'],
  ['nyc', 'https://events.newschool.edu'],
  ['nyc', 'https://www.caveat.nyc'],
  ['nyc', 'https://www.thebellhouseny.com'],
  ['nyc', 'https://www.unionhallny.com'],
  ['nyc', 'https://www.littlefieldnyc.com'],
  ['nyc', 'https://www.nerdnitenyc.com'],
  ['nyc', 'https://pioneerworks.org'],
  ['nyc', 'https://www.lpr.com'],
  ['nyc', 'https://www.joespub.com'],
  ['nyc', 'https://www.housingworks.org'],
  ['nyc', 'https://www.strandbooks.com'],
  ['nyc', 'https://www.bklynlibrary.org'],
  ['nyc', 'https://www.morbidanatomymuseum.org'],
  ['nyc', 'https://www.brooklynbowl.com'],
  ['nyc', 'https://www.unionpool.com'],
  ['nyc', 'https://www.babysallright.com'],
  ['nyc', 'https://www.publicrecords.nyc'],
  ['nyc', 'https://www.nationalsawdust.org'],
  ['nyc', 'https://www.smalls.live'],
  ['nyc', 'https://www.bluenotejazz.com'],
  ['nyc', 'https://www.thestandnyc.com'],
  ['nyc', 'https://www.comedycellar.com'],
  ['nyc', 'https://www.unionsquaremusic.com'],
  ['nyc', 'https://www.makerversity.com'],
  ['nyc', 'https://www.ny.techweek.com'],
  ['nyc', 'https://www.nyhistory.org'],
  ['nyc', 'https://www.brooklynmuseum.org'],
  ['nyc', 'https://www.newmuseum.org'],
  ['nyc', 'https://www.moma.org'],
  ['nyc', 'https://www.thehighline.org'],
  ['nyc', 'https://www.bam.org'],
  ['nyc', 'https://www.thekitchen.org'],
  ['nyc', 'https://www.symphonyspace.org'],
  ['nyc', 'https://www.92ny.org'],
  ['nyc', 'https://www.asphaltgreen.org'],
  ['nyc', 'https://www.nycgovparks.org'],
  ['nyc', 'https://www.brooklynbrainery.com'],
  ['nyc', 'https://www.secretscience.com'],
  // Philadelphia
  ['philly', 'https://events.temple.edu'],
  ['philly', 'https://events.drexel.edu'],
  ['philly', 'https://www.upenn.edu'],
  ['philly', 'https://www.worldcafelive.com'],
  ['philly', 'https://www.utphilly.com'],
  ['philly', 'https://www.johnnybrendas.com'],
  ['philly', 'https://www.franklinmusichall.com'],
  ['philly', 'https://www.fi.edu'],
  ['philly', 'https://www.easternstate.org'],
  ['philly', 'https://www.wagnerfreeinstitute.org'],
  ['philly', 'https://www.freelibrary.org'],
  ['philly', 'https://www.philamuseum.org'],
  ['philly', 'https://www.thephillycomedycenter.com'],
  ['philly', 'https://www.punchlinephilly.com'],
  ['philly', 'https://www.philadelphiamagicgardens.org'],
  ['philly', 'https://www.thebarnes.org'],
]

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
    if (got.length) results.push({ base, city, method, url, count: got.length, sample: got.slice(0, 6).map((e) => `${e.start.slice(0, 10)} ${e.title}`) })
    else (errors[base] ??= []).push(`${method}: 0 events`)
  } catch (e) {
    ;(errors[base] ??= []).push(`${method}: ${(e as Error).message.slice(0, 90)}`)
  }
}

async function probe([city, base]: [CityId, string]) {
  await attempt(base, city, 'tribe', base, (d) => fromTribe(base, d, ctx))
  await attempt(base, city, 'localist', base, (d) => fromLocalist(base, d, ctx))
  for (const path of ['/events/?ical=1', '/?ical=1', '/events.ics', '/calendar.ics'])
    await attempt(base, city, 'ics', base + path, (d) => fromIcs(base + path, d, ctx))
  for (const path of ['', '/events', '/events/', '/calendar', '/shows', '/whats-on', '/upcoming-events'])
    await attempt(base, city, 'jsonld', base + path, (d) => fromJsonLd(base + path, d, ctx))
}

const queue = [...C]
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) await probe(c)
  }),
)
// Best method per site.
const best = new Map<string, Result>()
for (const r of results) if (!best.has(r.base) || best.get(r.base)!.count < r.count) best.set(r.base, r)
const report = { at: now.toISOString(), working: [...best.values()].sort((a, b) => b.count - a.count), failing: Object.fromEntries(Object.entries(errors).filter(([b]) => !best.has(b))) }
writeFileSync('probe.json', JSON.stringify(report, null, 1))
console.log(`${best.size} of ${C.length} sites returned events`)
