// `npm run ingest` — fetch every source, curate, and write public/data/events.json.
//
//   npm run ingest              fetch all enabled sources
//   npm run ingest -- --offline skip the network (preview + last good data only)
//   npm run ingest -- --only=knicks,luma-nyc
//
// The site reads the JSON at runtime, so refreshing data never requires a
// rebuild — re-run this and redeploy the file (the GitHub Action does both).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Dataset, SourceStatus, WGEvent } from '../src/shared/types.ts'
import { addDays, nyDateKey, sortTime } from '../src/shared/time.ts'
import type { Draft } from './adapters/types.ts'
import { CONFIG } from './config.ts'
import { isNoise, outOfArea, score, whyFor } from './lib/enrich.ts'
import { addMedia, pageImage } from './lib/media.ts'
import { PLACES } from '../src/data/places.ts'
import { slug } from './lib/http.ts'
import { previewEvents } from './seed/preview.ts'
import { SOURCES } from './sources.ts'

const OUT = resolve(import.meta.dirname, '../public/data/events.json')
const args = process.argv.slice(2)
const offline = args.includes('--offline')
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',')

const now = new Date()
const ctx = { from: now, to: new Date(now.getTime() + CONFIG.windowDays * 86400000) }

function previous(): Dataset | undefined {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8')) as Dataset
  } catch {
    return undefined
  }
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms))])

async function run() {
  const prev = previous()
  const live: WGEvent[] = []
  const statuses: SourceStatus[] = []

  const active = SOURCES.filter((s) => s.enabled !== false && (!only || only.includes(s.id)))
  await Promise.all(
    active.map(async (s) => {
      const t0 = Date.now()
      const status: SourceStatus = { id: s.id, name: s.name, city: s.city, kind: s.kind, homepage: s.homepage, ok: false, count: 0, ms: 0 }
      try {
        if (offline) throw new Error('skipped (offline run)')
        const drafts: Draft[] = await withTimeout(s.fetch(ctx), 45000)
        const events = drafts.map((d) => finish(d, s.id, 'live'))
        live.push(...events)
        Object.assign(status, { ok: true, count: events.length })
      } catch (e) {
        status.error = (e as Error).message.slice(0, 240)
        // Keep the last good data from this source so one bad night
        // doesn't empty a section of the site.
        const kept = (prev?.events ?? []).filter((x) => x.sourceId === s.id && sortTime(x.end ?? x.start) >= now.getTime() - 86400000)
        live.push(...kept)
        status.count = kept.length
      }
      status.ms = Date.now() - t0
      statuses.push(status)
      const mark = status.ok ? '✓' : '✗'
      console.log(`${mark} ${s.id.padEnd(26)} ${String(status.count).padStart(4)} ${status.error ? '· ' + status.error : ''}`)
    }),
  )

  let events = live
  if (CONFIG.includePreview) {
    const seen = new Set(live.map(dedupeKey))
    const preview = previewEvents().filter((e) => !seen.has(dedupeKey(e))).map((e) => finish(e, 'preview', 'preview'))
    events = events.concat(preview)
    statuses.push({ id: 'preview', name: 'Preview listings (researched by hand)', city: 'multi', kind: 'manual', homepage: '', ok: true, count: preview.length, ms: 0 })
  }

  const cutoff = now.getTime() - 3 * 3600000
  const byId = new Map<string, WGEvent>()
  for (const e of events) {
    if (isNoise(e) || outOfArea(e)) continue
    // Exhibitions without a published closing date stay listed for up to six months.
    const lastDay = e.end ?? (e.kind === 'exhibition' ? new Date(sortTime(e.start) + 180 * 86400000).toISOString() : e.start)
    if (sortTime(lastDay) < cutoff) continue
    if (!byId.has(e.id)) byId.set(e.id, e)
  }
  const final = collapseRepeats([...byId.values()]).sort((a, b) => sortTime(a.start) - sortTime(b.start))

  // Pictures: reuse what earlier runs found, then look up anything missing.
  const before = new Map((prev?.events ?? []).map((e) => [e.id, e]))
  for (const e of final) {
    const old = before.get(e.id)
    if (!old) continue
    e.image ??= old.image
    e.people = e.people?.map((p) => ({ ...p, image: p.image ?? old.people?.find((o) => o.name === p.name)?.image }))
  }
  if (!offline) await addMedia(final)
  for (const e of final) e.score = score(e)

  const placeImages: NonNullable<Dataset['placeImages']> = { ...(prev?.placeImages ?? {}) }
  if (!offline) {
    for (const p of PLACES) {
      if (placeImages[p.id]) continue
      const img = await pageImage(p.website)
      if (img) placeImages[p.id] = img
    }
    await addMedia([]) // flush the media cache
  }

  const data: Dataset = {
    generatedAt: now.toISOString(),
    events: final,
    placeImages,
    sources: statuses.sort((a, b) => a.id.localeCompare(b.id)),
  }
  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(data, null, 1))
  const liveCount = final.filter((e) => e.provenance === 'live').length
  console.log(`\nWrote ${final.length} events (${liveCount} live, ${final.length - liveCount} preview) → public/data/events.json`)
}

/**
 * Feeds list a recurring event once per day. Show it once instead:
 * consecutive days become a date range; spaced dates keep the next one and
 * mention the rest.
 */
function collapseRepeats(events: WGEvent[]): WGEvent[] {
  const groups = new Map<string, WGEvent[]>()
  for (const e of events) {
    const key = e.provenance === 'live' ? `${e.sourceId}|${slug(e.title)}` : e.id
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const day = (e: WGEvent) => nyDateKey(e.start)
  return [...groups.values()].map((list) => {
    if (list.length === 1) return list[0]
    list.sort((a, b) => sortTime(a.start) - sortTime(b.start))
    const first = { ...list[0] }
    const days = [...new Set(list.map(day))]
    const consecutive = days.every((d, i) => i === 0 || addDays(days[i - 1], 1) === d)
    if (consecutive && days.length >= 3) {
      first.kind = 'exhibition'
      first.start = days[0]
      first.end = days.at(-1)
      first.timeTBA = true
    } else {
      const more = days.slice(1, 5).map((d) => {
        const [, m, dd] = d.split('-').map(Number)
        return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${dd}`
      })
      if (more.length) first.note = [first.note, `Also on ${more.join(', ')}${days.length > 5 ? ' and later' : ''}.`].filter(Boolean).join(' ')
    }
    return first
  })
}

function dedupeKey(e: Pick<WGEvent, 'title' | 'start'>) {
  return `${slug(e.title).slice(0, 40)}|${e.start.slice(0, 10)}`
}

function finish(d: Draft | WGEvent, sourceId: string, provenance: WGEvent['provenance']): WGEvent {
  const e: WGEvent = {
    ...d,
    title: d.title.trim(),
    provenance,
    sourceId,
    checkedAt: 'checkedAt' in d && d.checkedAt ? d.checkedAt : now.toISOString(),
  }
  // Hand-written listings carry their own reasons; don't pad them.
  if (provenance === 'live') e.why ||= whyFor(e) || undefined
  e.score = score(e)
  return e
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
