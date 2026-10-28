// Real pictures for listings, fetched during ingest (never invented).
//
// Order of preference for an event's photo:
//   1. A photo of the event itself (Wikipedia page for a parade, marathon…)
//   2. The person or band on the bill (Wikipedia portrait)
//   3. The event page's own promo image (og:image), if it passes checks
//   4. The venue (Wikipedia photo of the building or room)
//
// Every candidate is downloaded and measured. Logos, maps, icons, small or
// oddly shaped images are rejected, so cards show a typographic cover rather
// than a bad picture. Results are cached in ingest/cache/media.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Person, Place, WGEvent } from '../../src/shared/types.ts'
import { get, getJson } from './http.ts'

const CACHE = resolve(import.meta.dirname, '../cache/media.json')
type Img = { url: string; credit?: string; link?: string; w?: number; h?: number } | null
type CacheShape = Record<string, Img>
const cache: CacheShape = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

// ——— Image checks ———

const JUNK_URL = /logo|favicon|sprite|icon|placeholder|default|blank|spacer|map|staticmap|avatar|badge|banner-ad|share-image|og-default|wordmark/i

/** Read just enough of an image to learn its pixel size. */
async function measure(url: string): Promise<{ w: number; h: number; type: string } | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'WorthGoing/1.0', accept: 'image/*' } })
    if (!res.ok || !res.body) return null
    const type = res.headers.get('content-type') ?? ''
    if (!/image\/(jpeg|jpg|png|webp)/i.test(type)) return null
    const reader = res.body.getReader()
    let buf = new Uint8Array(0)
    while (buf.length < 256 * 1024) {
      const { done, value } = await reader.read()
      if (done) break
      const next = new Uint8Array(buf.length + value.length)
      next.set(buf)
      next.set(value, buf.length)
      buf = next
      const dims = dimensions(buf)
      if (dims) {
        ctrl.abort()
        return { ...dims, type }
      }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export function dimensions(b: Uint8Array): { w: number; h: number } | null {
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b.length >= 24) {
    const v = new DataView(b.buffer)
    return { w: v.getUint32(16), h: v.getUint32(20) }
  }
  // JPEG: walk segments to a SOF marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++
        continue
      }
      const marker = b[i + 1]
      const len = (b[i + 2] << 8) | b[i + 3]
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] }
      }
      i += 2 + len
    }
    return null
  }
  // WebP
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b.length >= 30) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15])
    if (chunk === 'VP8 ') return { w: ((b[27] << 8) | b[26]) & 0x3fff, h: ((b[29] << 8) | b[28]) & 0x3fff }
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
  }
  return null
}

/** Is this a photo worth showing large? */
export async function goodPhoto(url: string, minWidth = 800): Promise<{ w: number; h: number } | null> {
  if (JUNK_URL.test(url)) return null
  const m = await measure(url)
  if (!m) return null
  const ratio = m.w / m.h
  if (m.w < minWidth || ratio < 0.55 || ratio > 2.1) return null
  // Small PNGs are nearly always logos or graphics.
  if (/png/i.test(m.type) && m.w < 1200) return null
  return { w: m.w, h: m.h }
}

// ——— Sources of pictures ———

function absolute(url: string, base: string) {
  try {
    return new URL(url.replace(/&amp;/g, '&'), base).toString()
  } catch {
    return undefined
  }
}

const pages = new Map<string, Promise<string>>()
/** Fetch a page once per run, however many helpers need it. */
const page = (url: string) => {
  if (!pages.has(url)) pages.set(url, get(url, 'text/html', 15000))
  return pages.get(url)!
}

export async function pageImage(pageUrl: string): Promise<Img> {
  const key = `og2:${pageUrl}`
  if (key in cache) return cache[key]
  let img: Img = null
  try {
    const html = await page(pageUrl)
    const m =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)
    const url = m ? absolute(m[1], pageUrl) : undefined
    const dims = url ? await goodPhoto(url) : null
    if (url && dims) img = { url, credit: new URL(pageUrl).hostname.replace(/^www\./, ''), link: pageUrl, ...{ w: dims.w, h: dims.h } }
  } catch {
    return null // network trouble: try again next run
  }
  cache[key] = img
  return img
}

export async function wikiImage(title: string): Promise<Img> {
  const key = `wiki2:${title}`
  if (key in cache) return cache[key]
  let img: Img = null
  try {
    type Pic = { source: string; width: number; height: number }
    type S = { thumbnail?: Pic; originalimage?: Pic; content_urls?: { desktop?: { page?: string } } }
    const s = await getJson<S>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    const o = s.originalimage
    if (o && o.width >= 600) {
      // Ask for a 1400px rendition when the original is larger; otherwise use it as is.
      const url =
        o.width > 1400 && s.thumbnail?.source.includes('/thumb/')
          ? s.thumbnail.source.replace(/\/\d+px-/, '/1400px-')
          : o.source
      if (!/\.svg/i.test(url) && o.width / o.height < 2.2 && o.width / o.height > 0.5) {
        img = { url, credit: 'Wikimedia Commons', link: s.content_urls?.desktop?.page, w: o.width, h: o.height }
      }
    }
  } catch (e) {
    if (!/HTTP 404/.test((e as Error).message)) return null
  }
  cache[key] = img
  return img
}

// Wikimedia Commons photo search, for restaurants without a Wikipedia article.
// Only accepts a file whose title contains the restaurant's full name, so a
// search hit for something else isn't used.
export async function commonsImage(name: string, place: string): Promise<Img> {
  const key = `commons:${name}|${place}`
  if (key in cache) return cache[key]
  let img: Img = null
  try {
    const q = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `"${name}" ${place}`,
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: '1400',
    })
    type Page = { title: string; imageinfo?: { url: string; thumburl?: string; width: number; height: number; mime: string; descriptionurl: string }[] }
    const r = await getJson<{ query?: { pages?: Record<string, Page> } }>(`https://commons.wikimedia.org/w/api.php?${q}`)
    const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    const want = norm(name.replace(/^the /i, ''))
    for (const pg of Object.values(r.query?.pages ?? {})) {
      const ii = pg.imageinfo?.[0]
      if (!ii || ii.mime !== 'image/jpeg' || ii.width < 1000) continue
      // One-word names (e.g. "Agricola") also need the town in the file name.
      if (!norm(pg.title).includes(want) || (!want.includes(' ') && !norm(pg.title).includes(norm(place)))) continue
      const ratio = ii.width / ii.height
      if (ratio < 0.6 || ratio > 2) continue
      img = { url: ii.thumburl ?? ii.url, credit: 'Wikimedia Commons', link: ii.descriptionurl, w: ii.width, h: ii.height }
      break
    }
  } catch {
    return null
  }
  cache[key] = img
  return img
}

// Wikipedia pages for venues we list often. Used when nothing better exists.
const VENUE_WIKI: [RegExp, string][] = [
  [/92ny|92nd street y/i, '92nd_Street_Y'],
  [/beacon theatre/i, 'Beacon_Theatre_(New_York_City)'],
  [/town hall/i, 'The_Town_Hall_(New_York_City)'],
  [/carnegie hall/i, 'Carnegie_Hall'],
  [/village vanguard/i, 'Village_Vanguard'],
  [/blue note/i, 'Blue_Note_Jazz_Club'],
  [/brooklyn steel/i, 'Brooklyn_Steel'],
  [/knockdown center/i, 'Knockdown_Center'],
  [/bowery ballroom/i, 'Bowery_Ballroom'],
  [/webster hall/i, 'Webster_Hall'],
  [/\bbam\b|brooklyn academy of music/i, 'Brooklyn_Academy_of_Music'],
  [/the met\b|metropolitan museum/i, 'Metropolitan_Museum_of_Art'],
  [/cloisters/i, 'The_Cloisters'],
  [/natural history/i, 'American_Museum_of_Natural_History'],
  [/madison square garden/i, 'Madison_Square_Garden'],
  [/barclays/i, 'Barclays_Center'],
  [/javits/i, 'Javits_Center'],
  [/mütter|mutter museum/i, 'Mütter_Museum'],
  [/wagner free institute/i, 'Wagner_Free_Institute_of_Science'],
  [/eastern state/i, 'Eastern_State_Penitentiary'],
  [/philadelphia art museum|philadelphia museum of art/i, 'Philadelphia_Museum_of_Art'],
  [/free library/i, 'Free_Library_of_Philadelphia'],
  [/union transfer/i, 'Union_Transfer'],
  [/fillmore/i, 'The_Fillmore_Philadelphia'],
  [/johnny brenda/i, 'Johnny_Brenda%27s'],
  [/lincoln financial/i, 'Lincoln_Financial_Field'],
  [/xfinity mobile arena|wells fargo center/i, 'Xfinity_Mobile_Arena'],
  [/kimmel|marian anderson/i, 'Kimmel_Center_for_the_Performing_Arts'],
  [/mccarter/i, 'McCarter_Theatre'],
  [/mccosh/i, 'McCosh_Hall'],
  [/richardson auditorium|alexander hall/i, 'Alexander_Hall_(Princeton_University)'],
  [/princeton university chapel/i, 'Princeton_University_Chapel'],
  [/princeton stadium/i, 'Princeton_Stadium'],
  [/jadwin/i, 'Jadwin_Gymnasium'],
  [/graduate college|cleveland tower/i, 'Princeton_University_Graduate_College'],
  [/palmer square/i, 'Palmer_Square_(Princeton,_New_Jersey)'],
  [/princeton university art museum/i, 'Princeton_University_Art_Museum'],
]

const venueWiki = (e: WGEvent) => VENUE_WIKI.find(([re]) => re.test(`${e.venue.name} ${e.venue.address ?? ''}`))?.[1]

const NOT_BILLED = /moderator$|(^|,\s*)(co-)?host$/i

const PERFORMER = /\b(singer|band|rapper|musician|comedian|comic|actor|actress|dj|group|songwriter|composer|producer|duo|trio|orchestra|ensemble|pianist|guitarist|violinist|cellist|drummer|team|club|podcaster|author|writer|magician|dancer|choir|quartet|personality|host)\b/i

/** Who is this performer? Wikipedia's one-line description, if the page is clearly about a performer. */
export async function whoIs(name: string): Promise<{ role: string; wiki: string } | null> {
  const key = `who:${name}`
  if (key in cache) return cache[key] as unknown as { role: string; wiki: string } | null
  let out: { role: string; wiki: string } | null = null
  try {
    type S = { type?: string; title: string; description?: string }
    const s = await getJson<S>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`)
    if (s.type === 'standard' && s.description && PERFORMER.test(s.description)) {
      out = { role: s.description.charAt(0).toUpperCase() + s.description.slice(1), wiki: s.title.replace(/ /g, '_') }
    }
  } catch (e) {
    if (!/HTTP 404/.test((e as Error).message)) return null
  }
  ;(cache as Record<string, unknown>)[key] = out
  return out
}

async function withPortraits(list: Person[] = [], lookup = false): Promise<Person[]> {
  return Promise.all(
    list.map(async (p) => {
      let q = p
      if (lookup && !p.wiki) {
        const w = await whoIs(p.name)
        if (w) q = { ...p, role: w.role, wiki: w.wiki }
      }
      return q.wiki ? { ...q, image: (await wikiImage(q.wiki)) ?? undefined } : q
    }),
  )
}

async function pickImage(e: WGEvent): Promise<Img> {
  // Ticketmaster artwork is the artist's official image at full size.
  if (e.image?.credit === 'Ticketmaster') return e.image
  if (e.wiki) {
    const own = await wikiImage(e.wiki)
    if (own) return own
  }
  const lead = e.people?.find((p) => !NOT_BILLED.test(p.role) && p.image)?.image
  if (lead) return lead
  const page = await pageImage(e.sourceUrl)
  if (page) return page
  const venue = venueWiki(e)
  return venue ? wikiImage(venue) : null
}

/** Add images in place. */
export async function addMedia(events: WGEvent[], concurrency = 8): Promise<void> {
  const queue = [...events]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        if (e.people?.length) e.people = await withPortraits(e.people, e.provenance === 'live')
        e.image = (await pickImage(e)) ?? undefined
        if (!e.price && e.provenance === 'preview') {
          const price = (await pagePrice(e.ticketUrl ?? e.sourceUrl)) ?? (e.ticketUrl ? await pagePrice(e.sourceUrl) : null)
          if (price) e.price = price
        }
      }
    }),
  )
  saveCache()
}

export async function placeImage(p: Place): Promise<Img> {
  if (p.wiki) {
    const w = await wikiImage(p.wiki)
    if (w) return w
  }
  const site = p.website ? await pageImage(p.website) : null
  if (site) return site
  const commons = await commonsImage(p.name, p.city === 'nyc' ? 'New York' : p.city === 'philly' ? 'Philadelphia' : 'Princeton')
  if (commons) return commons
  // OpenTable and Tock pages carry the restaurant's own photos.
  return p.book?.url ? pageImage(p.book.url) : null
}

export function saveCache() {
  mkdirSync(dirname(CACHE), { recursive: true })
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
}

// ——— Prices from the event page’s own structured data ———

export async function pagePrice(pageUrl: string): Promise<string | null> {
  const key = `price:${pageUrl}`
  if (key in cache) return (cache as Record<string, unknown>)[key] as string | null
  let price: string | null = null
  try {
    const html = await page(pageUrl)
    const prices: number[] = []
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const walk = (n: unknown): void => {
          if (Array.isArray(n)) return n.forEach(walk)
          if (!n || typeof n !== 'object') return
          const o = n as Record<string, unknown>
          for (const k of ['lowPrice', 'price']) {
            const v = Number(o[k])
            if (Number.isFinite(v) && v > 0) prices.push(v)
          }
          Object.values(o).forEach(walk)
        }
        walk(JSON.parse(m[1].trim()))
      } catch {
        /* ignore */
      }
    }
    if (prices.length) price = `From $${Math.round(Math.min(...prices))}`
  } catch {
    return null
  }
  ;(cache as Record<string, unknown>)[key] = price
  return price
}

// ——— Restaurants: booking link, menu and map position ———

export interface PlaceMeta {
  reserve?: { platform: string; url: string }
  menu?: string
  lat?: number
  lng?: number
}

const BOOKING: [RegExp, string][] = [
  [/https?:\/\/(www\.)?resy\.com\/cities\/[^"'\s<>]+/i, 'Resy'],
  [/https?:\/\/(www\.)?opentable\.com\/(r|restref)\/[^"'\s<>]+/i, 'OpenTable'],
  [/https?:\/\/(www\.)?exploretock\.com\/[^"'\s<>]+/i, 'Tock'],
  [/https?:\/\/(www\.)?sevenrooms\.com\/reservations\/[^"'\s<>]+/i, 'SevenRooms'],
]

export async function placeMeta(p: Place, cityName: string): Promise<PlaceMeta> {
  const key = `place:${p.id}`
  const cached = (cache as Record<string, unknown>)[key] as PlaceMeta | undefined
  if (cached?.lat && (cached.reserve || cached.menu || !p.website)) return cached
  const meta: PlaceMeta = {}
  if (p.website) {
    try {
      const html = await page(p.website)
      for (const [re, platform] of BOOKING) {
        const m = html.match(re)
        if (m) {
          meta.reserve = { platform, url: m[0].replace(/&amp;/g, '&') }
          break
        }
      }
      const menu = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].find(
        ([, href, text]) => /menu/i.test(href) || /\bmenus?\b/i.test(text.replace(/<[^>]+>/g, '')),
      )
      if (menu) meta.menu = absolute(menu[1], p.website)
    } catch {
      /* site unreachable: keep going */
    }
  }
  // OpenStreetMap geocoding (Nominatim): one request a second, identified.
  try {
    // Name first (puts the pin on the building), then the street address alone.
    const queries = [`${p.name}, ${p.address ?? `${p.neighborhood}, ${cityName}`}`, p.address].filter((x): x is string => !!x)
    for (const q of queries) {
      await new Promise((ok) => setTimeout(ok, 1100))
      const res = await getJson<{ lat: string; lon: string }[]>(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`)
      if (res[0]) {
        meta.lat = Number(res[0].lat)
        meta.lng = Number(res[0].lon)
        break
      }
    }
  } catch {
    /* no map pin */
  }
  ;(cache as Record<string, unknown>)[key] = meta
  return meta
}
