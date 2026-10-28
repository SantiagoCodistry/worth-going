// Tries candidate event sources with each keyless adapter and reports what
// works. Run in CI (the dev container can't reach these sites):
//   npx tsx scripts/probe-sources.ts > probe.json
import { writeFileSync } from 'node:fs'
import { fromIcs, fromJsonLd, fromLocalist, fromTribe, type Defaults } from '../ingest/adapters/feeds.ts'
import type { Draft } from '../ingest/adapters/types.ts'
import type { CityId } from '../src/shared/types.ts'

// Round 3: museums with exhibitions, and public-affairs talks (world leaders,
// the UN, the Fed). Each site is tried as Tribe, Localist, iCal and JSON-LD.
const SITES: [CityId, string, string[]][] = [
  ['nyc', 'https://www.guggenheim.org', ['/exhibitions', '/calendar']],
  ['nyc', 'https://whitney.org', ['/exhibitions', '/events']],
  ['nyc', 'https://www.themorgan.org', ['/exhibitions/current', '/programs']],
  ['nyc', 'https://www.frick.org', ['/exhibitions', '/calendar']],
  ['nyc', 'https://www.amnh.org', ['/exhibitions', '/calendar']],
  ['nyc', 'https://www.cooperhewitt.org', ['/exhibitions', '/events']],
  ['nyc', 'https://www.neuegalerie.org', ['/exhibitions']],
  ['nyc', 'https://www.metmuseum.org', ['/exhibitions', '/events']],
  ['nyc', 'https://www.newmuseum.org', ['/exhibitions', '/calendar']],
  ['nyc', 'https://www.museumofthemovingimage.org', ['/calendar', '/exhibitions']],
  ['nyc', 'https://www.nyhistory.org', ['/exhibitions', '/programs']],
  ['nyc', 'https://www.mcny.org', ['/exhibitions', '/events']],
  ['nyc', 'https://www.intrepidmuseum.org', ['/events', '/exhibitions']],
  ['nyc', 'https://www.thejewishmuseum.org', ['/exhibitions', '/calendar']],
  ['nyc', 'https://www.noguchi.org', ['/museum/exhibitions', '/museum/calendar']],
  ['nyc', 'https://www.nyc.gov', ['/site/cecm/index.page']],
  ['nyc', 'https://www.cfr.org', ['/events', '/event']],
  ['nyc', 'https://www.econclubny.org', ['/events', '/upcoming-events']],
  ['nyc', 'https://asiasociety.org', ['/new-york/events']],
  ['nyc', 'https://www.japansociety.org', ['/events']],
  ['nyc', 'https://www.as-coa.org', ['/events']],
  ['nyc', 'https://worldleaders.columbia.edu', ['/events', '/upcoming-events']],
  ['nyc', 'https://www.sipa.columbia.edu', ['/events', '/communities-connections/events']],
  ['nyc', 'https://www.newyorkfed.org', ['/newsevents/events', '/newsevents/speeches']],
  ['nyc', 'https://www.ny.frb.org', ['/newsevents/events']],
  ['nyc', 'https://www.un.org', ['/en/calendar', '/en/observances/list-days-weeks']],
  ['nyc', 'https://webtv.un.org', ['/en/schedule']],
  ['nyc', 'https://www.ipinst.org', ['/events']],
  ['nyc', 'https://www.carnegiecouncil.org', ['/events', '/calendar']],
  ['nyc', 'https://www.nypl.org', ['/events/calendar', '/events']],
  ['nyc', 'https://www.lib.nyu.edu', ['/events']],
  ['nyc', 'https://www.law.nyu.edu', ['/events']],
  ['nyc', 'https://www.stern.nyu.edu', ['/events']],
  ['nyc', 'https://www.gc.cuny.edu', ['/events']],
  ['nyc', 'https://www.newschool.edu', ['/events']],
  ['nyc', 'https://www.cooper.edu', ['/events-and-exhibitions/events', '/events']],
  ['nyc', 'https://www.bard.edu', ['/events']],
  ['princeton', 'https://spia.princeton.edu', ['/events', '/events/ical']],
  ['princeton', 'https://bendheim.princeton.edu', ['/events']],
  ['princeton', 'https://cpd.princeton.edu', ['/events']],
  ['princeton', 'https://lisd.princeton.edu', ['/events']],
  ['princeton', 'https://jameson.princeton.edu', ['/events']],
  ['princeton', 'https://kellercenter.princeton.edu', ['/events']],
  ['princeton', 'https://csml.princeton.edu', ['/events']],
  ['princeton', 'https://ai.princeton.edu', ['/events']],
  ['princeton', 'https://www.cs.princeton.edu', ['/events']],
  ['princeton', 'https://history.princeton.edu', ['/news-events/events']],
  ['princeton', 'https://pei.princeton.edu', ['/events']],
  ['princeton', 'https://jrr.princeton.edu', ['/events']],
  ['princeton', 'https://arts.princeton.edu', ['/events', '/calendar']],
  ['princeton', 'https://www.princetonlibrary.org', ['/events', '/calendar']],
  ['princeton', 'https://artmuseum.princeton.edu', ['/exhibitions', '/calendar']],
  ['princeton', 'https://www.ias.edu', ['/events', '/calendar']],
  ['philly', 'https://www.philadelphiafed.org', ['/events', '/calendar']],
  ['philly', 'https://www.penn.museum', ['/calendar', '/exhibitions']],
  ['philly', 'https://www.pennmuseum.org', ['/calendar']],
  ['philly', 'https://www.muttermuseum.org', ['/exhibitions', '/events']],
  ['philly', 'https://www.philamuseum.org', ['/calendar', '/exhibitions']],
  ['philly', 'https://www.barnesfoundation.org', ['/whats-on', '/whats-on/exhibitions']],
  ['philly', 'https://www.fi.edu', ['/en/events', '/en/exhibits']],
  ['philly', 'https://www.ansp.org', ['/events']],
  ['philly', 'https://www.constitutioncenter.org', ['/calendar', '/events']],
  ['philly', 'https://www.wpafilmlibrary.org', ['/events']],
  ['philly', 'https://perrywolf.upenn.edu', ['/events']],
  ['philly', 'https://www.fpri.org', ['/events']],
  ['philly', 'https://global.upenn.edu', ['/events']],
  ['philly', 'https://www.sas.upenn.edu', ['/events']],
  ['philly', 'https://www.wharton.upenn.edu', ['/events']],
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
    if (got.length) results.push({ base, city, method, url, count: got.length, sample: got.slice(0, 10).map((e) => `${e.start.slice(0, 10)} ${e.title} @ ${e.venue.name}`) })
    else (errors[base] ??= []).push(`${method}: 0 events`)
  } catch (e) {
    ;(errors[base] ??= []).push(`${method}: ${(e as Error).message.slice(0, 90)}`)
  }
}

const queue: (() => Promise<void>)[] = SITES.flatMap(([city, base, paths]) => [
  () => attempt(base, city, 'tribe', base, (d) => fromTribe(base, d, ctx)),
  () => attempt(base, city, 'localist', base, (d) => fromLocalist(base, d, ctx)),
  ...['/events/?ical=1', '/?ical=1', ...paths.filter((x) => /ical|\.ics/.test(x))].map((x) => () => attempt(base, city, 'ics', base + x, (d) => fromIcs(base + x, d, ctx))),
  ...['', ...paths].map((x) => () => attempt(base, city, 'jsonld', base + x, (d) => fromJsonLd(base + x, d, ctx))),
])
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
