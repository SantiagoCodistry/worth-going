// Real pictures for listings, fetched during ingest (never invented):
//  1. The event page's own promo image (og:image / twitter:image).
//  2. Portraits of the people on the bill from Wikipedia's page summary API,
//     which also returns a short description, credited and linked back.
// Results are cached in ingest/cache/media.json so daily runs stay polite.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Person, WGEvent } from '../../src/shared/types.ts'
import { get, getJson } from './http.ts'

const CACHE = resolve(import.meta.dirname, '../cache/media.json')
type Img = { url: string; credit?: string; link?: string } | null
const cache: Record<string, Img> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

// Generic site artwork, not a picture of the event.
const JUNK = /logo|default|placeholder|favicon|sprite|share-image|og-default|blank|spacer/i

function absolute(url: string, base: string) {
  try {
    return new URL(url.replace(/&amp;/g, '&'), base).toString()
  } catch {
    return undefined
  }
}

export async function pageImage(pageUrl: string): Promise<Img> {
  const key = `og:${pageUrl}`
  if (key in cache) return cache[key]
  let img: Img = null
  try {
    const html = await get(pageUrl, 'text/html', 15000)
    const m =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)
    const url = m ? absolute(m[1], pageUrl) : undefined
    if (url && !JUNK.test(url)) img = { url, credit: new URL(pageUrl).hostname.replace(/^www\./, ''), link: pageUrl }
  } catch {
    return null // network trouble: don't cache, try again next run
  }
  cache[key] = img
  return img
}

export async function wikiPortrait(title: string): Promise<Img> {
  const key = `wiki:${title}`
  if (key in cache) return cache[key]
  let img: Img = null
  try {
    type Pic = { source: string; width: number }
    type S = { thumbnail?: Pic; originalimage?: Pic; content_urls?: { desktop?: { page?: string } } }
    const s = await getJson<S>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    // Use the original when it's a reasonable size; otherwise ask for a 1000px thumbnail
    // (only possible when the original is wider than that).
    const o = s.originalimage
    const sized =
      o && o.width <= 1600
        ? o.source
        : s.thumbnail?.source.includes('/thumb/')
          ? s.thumbnail.source.replace(/\/\d+px-/, '/1000px-')
          : (o?.source ?? s.thumbnail?.source)
    if (sized) img = { url: sized, credit: 'Wikimedia Commons', link: s.content_urls?.desktop?.page }
  } catch (e) {
    if (!/HTTP 404/.test((e as Error).message)) return null // only a missing page is a definite answer
  }
  cache[key] = img
  return img
}

async function people(list: Person[] = []): Promise<Person[]> {
  return Promise.all(
    list.map(async (p) => (p.wiki && !p.image ? { ...p, image: (await wikiPortrait(p.wiki)) ?? undefined } : p)),
  )
}

/** Add images in place. Talks lead with the speaker's portrait; everything else with the event's own artwork. */
export async function addMedia(events: WGEvent[], concurrency = 6): Promise<void> {
  const queue = [...events]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        e.people = e.people?.length ? await people(e.people) : e.people
        if (e.image) continue
        const portrait = e.people?.find((p) => p.image)?.image
        if (e.category === 'ideas' && portrait) {
          e.image = portrait
          continue
        }
        e.image = (await pageImage(e.sourceUrl)) ?? portrait ?? undefined
      }
    }),
  )
  mkdirSync(dirname(CACHE), { recursive: true })
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
}
