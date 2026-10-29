// Builds the weekly editions: npm run edition
//
// Reads editions/*.ts, fills each pick from public/data/events.json (verified
// details, photos, people) and writes frozen copies to public/data/editions/.
// An edition is rebuilt while its week is still running; after that the frozen
// file is kept as it is, so the archive doesn't change when listings expire.
// Pass --all to rebuild every edition whose events are still in the data, and
// --refresh to re-read picked events from the feeds instead of the pinned copy.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Dataset, WGEvent } from '../src/shared/types.ts'
import type { Edition, EditionCity, EditionIndexEntry, EditionSource, Pick, PlacePick } from '../src/shared/edition.ts'
import { addDays, nyDateKey } from '../src/shared/time.ts'
import { categoryById } from '../src/shared/taxonomy.ts'
import { PLACES } from '../src/data/places.ts'
import { mapsUrl, reservation } from '../src/lib/booking.ts'
import { commonsImage, saveCache, wikiImage } from './lib/media.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/data/editions')
const NOT_BILLED = /moderator$|(^|,\s*)(co-)?host$/i
const CITIES: EditionCity[] = ['princeton', 'nyc', 'philly']
const all = process.argv.includes('--all')
const refresh = process.argv.includes('--refresh')

/** A Wikipedia page's photo, or a Commons search, as the editor asked (needs network; cached). */
async function editorPhoto(wiki?: string, commons?: string) {
  if (wiki) {
    const w = await wikiImage(wiki).catch(() => null)
    if (w) return w
  }
  if (commons) {
    const [name, place = ''] = commons.split('|')
    return commonsImage(name, place).catch(() => null)
  }
  return null
}

const data = JSON.parse(readFileSync(resolve(root, 'public/data/events.json'), 'utf8')) as Dataset
const byId = new Map(data.events.map((e) => [e.id, e]))
const today = nyDateKey(new Date())

function fromEvent(e: WGEvent, src: Extract<EditionSource['picks'][number], { event: string }>): Pick {
  const city = (src.city ?? e.city) as EditionCity
  if (!CITIES.includes(city)) throw new Error(`${e.id}: city ${e.city} is outside the edition's areas`)
  return {
    id: e.id,
    city,
    category: e.category,
    kind: src.kind ?? e.format ?? categoryById(e.category).label,
    title: src.title ?? e.title,
    why: src.why,
    start: e.start,
    end: e.end,
    timeTBA: e.timeTBA,
    exhibition: e.kind === 'exhibition' || undefined,
    venue: { name: e.venue.name, address: e.venue.address, neighborhood: e.venue.neighborhood, lat: e.venue.lat, lng: e.venue.lng },
    price: src.price ?? e.price,
    isFree: e.isFree,
    link: src.link ?? e.ticketUrl ?? e.sourceUrl,
    sourceName: e.sourceName,
    people: e.people?.filter((p) => !NOT_BILLED.test(p.role)).slice(0, 3),
    image: e.image,
  }
}

function place(id: string, city: EditionCity): PlacePick {
  const p = PLACES.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown restaurant id ${id}`)
  const r = reservation(p, data.placeMeta?.[p.id]?.reserve)
  return {
    id: p.id,
    city,
    name: p.name,
    neighborhood: p.neighborhood,
    cuisine: p.cuisine,
    price: p.price,
    why: p.why,
    order: p.order,
    address: p.address,
    book: r ? { via: r.platform, url: r.url } : undefined,
    map: mapsUrl(p),
    lat: data.placeMeta?.[p.id]?.lat,
    lng: data.placeMeta?.[p.id]?.lng,
    image: data.placeImages?.[p.id] ?? undefined,
  }
}

async function build() {
  mkdirSync(OUT, { recursive: true })
  const files = readdirSync(resolve(root, 'editions')).filter((f) => /^\d{4}-\d{2}-\d{2}\.ts$/.test(f)).sort()
  const index: EditionIndexEntry[] = []
  for (const f of files) {
    const src = (await import(pathToFileURL(resolve(root, 'editions', f)).href)).default as EditionSource
    const weekOf: [string, string] = [src.date, addDays(src.date, 6)]
    const out = resolve(OUT, `${src.date}.json`)
    const frozen: Edition | null = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null
    const running = weekOf[1] >= today
    let edition: Edition
    if (frozen && !running && !all) {
      edition = frozen
    } else {
      const picks: Pick[] = []
      for (const s of src.picks) {
        if (s.event === undefined) {
          // Written by hand: use as is, with an optional Wikipedia or Commons photo.
          const { wiki, commons, event: _none, ...manual } = s
          void _none
          if (!manual.image) manual.image = (await editorPhoto(wiki, commons)) ?? undefined
          picks.push(manual)
          continue
        }
        // Details the editor checked are pinned once the edition is built: a later feed
        // refresh can't change the time, venue or link (pass --refresh to rebuild from the feeds).
        const old = frozen?.picks.find((p) => p.id === s.event)
        const e = byId.get(s.event)
        let pick: Pick
        if (old && !refresh) pick = { ...old, why: s.why, title: s.title ?? old.title, kind: s.kind ?? old.kind, link: s.link ?? old.link, price: s.price ?? old.price, city: s.city ?? old.city }
        else if (e) pick = fromEvent(e, s)
        else {
          console.warn(`! ${src.date}: no listing with id ${s.event}; skipped`)
          continue
        }
        // Photo: the editor's choice first, then the listing's. Organizer flyers with UI text (Luma cards) don't count.
        const chosen = (await editorPhoto(s.wiki, s.commons)) ?? (old?.image && !refresh ? old.image : e?.image)
        pick.image = chosen && !/luma/i.test(chosen.credit ?? '') ? chosen : undefined
        picks.push(pick)
      }
      const places = CITIES.flatMap((c) => src.places[c].map((id) => place(id, c)))
      edition = { date: src.date, number: src.number, weekOf, picks, places, builtAt: new Date().toISOString() }
      writeFileSync(out, JSON.stringify(edition, null, 1))
      const counts = CITIES.map((c) => `${c} ${picks.filter((p) => p.city === c).length}`).join(', ')
      console.log(`✓ Edition ${src.number} (${src.date}): ${picks.length} picks (${counts}), ${places.length} restaurants`)
    }
    index.push({ date: edition.date, number: edition.number, weekOf: edition.weekOf, top: edition.picks.slice(0, 3).map((p) => p.title) })
  }
  saveCache()
  index.sort((a, b) => b.date.localeCompare(a.date))
  writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 1))
  writeFileSync(resolve(root, 'public/feed.xml'), rss(index))
}

/** RSS of editions, for readers who'd rather follow along that way. */
function rss(index: EditionIndexEntry[]): string {
  const site = process.env.SITE_URL ?? 'https://santiagocodistry.github.io/worth-going/'
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const items = index
    .map(
      (e) => `  <item>
    <title>Worth Going No. ${e.number}: ${esc(e.top.join(', '))}…</title>
    <link>${site}edition/${e.date}</link>
    <guid>${site}edition/${e.date}</guid>
    <pubDate>${new Date(`${e.date}T12:00:00Z`).toUTCString()}</pubDate>
  </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Worth Going</title>
  <link>${site}</link>
  <description>Ten things worth leaving the house for, around Princeton, New York and Philadelphia. Every Thursday.</description>
${items}
</channel></rss>
`
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
