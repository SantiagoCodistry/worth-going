import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Place } from '../shared/types.ts'
import { CITIES, cityById } from '../shared/taxonomy.ts'
import { todayKey } from '../lib/dates.ts'
import { PLACES } from '../data/places.ts'
import { useStore, type PlaceLog } from '../lib/store.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Photo, inkFor } from '../components/Poster.tsx'
import { ShareButton } from '../components/bits.tsx'
import { appUrl } from '../lib/share.ts'
import { Distance } from '../components/NearMe.tsx'
import { distanceTo, placePoint, radiusLabel, withinRadius } from '../lib/geo.ts'

const GOOD_FOR: Record<string, string> = {
  cheap: 'Cheap',
  date: 'Date night',
  group: 'Groups',
  solo: 'On your own',
  late: 'Late',
  splurge: 'Splurge',
  new: 'New',
}

const VERDICT = { loved: 'Loved it', liked: 'Liked it', meh: 'Meh' } as const
const VERDICT_RANK = { loved: 0, liked: 1, meh: 2 } as const

const mapsUrl = (p: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address ?? `${p.neighborhood}, ${cityById(p.city).name}`}`)}`

const RESY_CITY: Record<string, string> = { nyc: 'new-york-ny', philly: 'philadelphia-pa', princeton: 'princeton-nj', nj: 'new-jersey' }

/** Where to book: the hand-checked entry first, then a link found on the restaurant's own site. */
function reservation(p: Place, found?: { platform: string; url: string }): { platform: string; url: string } | null {
  const b = p.book
  if (b && b.via !== 'Walk-in') {
    if (b.url) return { platform: b.via, url: b.url }
    if (found?.platform === b.via) return found
    if (b.via === 'Resy') return { platform: 'Resy', url: `https://resy.com/cities/${RESY_CITY[p.city]}/search?query=${encodeURIComponent(p.name)}` }
  }
  return b?.via === 'Walk-in' ? null : (found ?? null)
}

/** Booking-page link with your date and party size filled in, where the platform supports it. */
function bookingUrl(platform: string, url: string, date: string, seats: number, time = '19:00') {
  try {
    const u = new URL(url)
    if (platform === 'Resy') {
      u.searchParams.set('date', date)
      u.searchParams.set('seats', String(seats))
    } else if (platform === 'OpenTable') {
      u.searchParams.set('covers', String(seats))
      u.searchParams.set('dateTime', `${date}T${time}`)
    } else if (platform === 'Tock') {
      u.searchParams.set('date', date)
      u.searchParams.set('size', String(seats))
      u.searchParams.set('time', time)
    } else if (platform === 'SevenRooms') {
      u.searchParams.set('date', date)
      u.searchParams.set('party_size', String(seats))
    }
    return u.toString()
  } catch {
    return url
  }
}

function PlaceImage({ p, className = '' }: { p: Place; className?: string }) {
  const { data } = useStore()
  const [failed, setFailed] = useState(false)
  const img = data?.placeImages?.[p.id]
  if (img && !failed)
    return (
      <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
        <Photo
          src={img.url}
          onFail={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
        />
      </div>
    )
  const ink = inkFor('dining')
  return (
    <div className={`@container relative overflow-hidden ${className}`} style={{ background: ink.bg, color: ink.fg }}>
      <div className="absolute inset-0 flex flex-col justify-end p-[6cqw]">
        <p className="label mb-[2.5cqw] text-[4.2cqw]">{p.cuisine}</p>
        <p className="display" style={{ fontSize: `${Math.min(16, 120 / Math.max(...p.name.split(/\s+/).map((w) => w.length), 5))}cqw` }}>
          {p.name}
        </p>
      </div>
    </div>
  )
}

function LogBadge({ log }: { log?: PlaceLog }) {
  if (!log) return null
  const text = log.status === 'want' ? 'Want to go' : log.verdict ? `Been · ${VERDICT[log.verdict]}` : 'Been'
  return <span className="rounded-[2px] bg-ink px-2 py-1 text-[11px] font-semibold text-bg">{text}</span>
}

export function PlaceCard({ p, className = '' }: { p: Place; className?: string }) {
  const { places, logPlace, data } = useStore()
  const log = places[p.id]
  const r = reservation(p, data?.placeMeta?.[p.id]?.reserve)
  const how = r ? `Book on ${r.platform}` : p.book?.via === 'Walk-in' ? 'Walk-in' : null
  return (
    <Link to={`/table/${p.id}`} className={`group block ${className}`}>
      <div className="relative">
        <PlaceImage p={p} className="aspect-[4/3] rounded-[3px]" />
        <span className="stamp absolute left-2 top-2 rounded-[2px] bg-bg px-2 py-1 text-[11px]">{p.price}</span>
        <span className="absolute right-2 top-2">
          {log ? (
            <LogBadge log={log} />
          ) : (
            <button
              onClick={(ev) => {
                ev.preventDefault()
                logPlace(p.id, { status: 'want' })
              }}
              className="rounded-[2px] bg-bg px-2 py-1 text-[11px] font-semibold hover:bg-[var(--riso-yellow)]"
            >
              + Want to go
            </button>
          )}
        </span>
      </div>
      <div className="pt-3">
        <p className="label text-[11px] text-mute">
          {p.cuisine} · {p.neighborhood}
          <Distance point={placePoint(p, data?.placeMeta?.[p.id])} className="text-ink before:content-['_·_']" />
        </p>
        <h3 className="mt-1 text-[17px] font-bold leading-snug">
          <span className="link-underline">{p.name}</span>
          {how && <span className="ml-2 align-middle text-[11.5px] font-semibold text-ink-2">{how}</span>}
        </h3>
        <p className="mt-1 text-[14px] leading-snug text-ink-2">{p.dek}</p>
        <p className="mt-2 flex flex-wrap gap-1">
          {p.goodFor.slice(0, 3).map((g) => (
            <span key={g} className="rounded-[2px] bg-bg-2 px-1.5 py-0.5 text-[11.5px] font-semibold">
              {GOOD_FOR[g] ?? g}
            </span>
          ))}
        </p>
      </div>
    </Link>
  )
}

type Tab = 'all' | 'want' | 'been'

export function Table() {
  const { city, near, profile, places, data } = useStore()
  const [good, setGood] = useState<string>('any')
  const nearMode = city === 'near' && !!near
  const [tab, setTab] = useState<Tab>('all')
  const want = PLACES.filter((p) => places[p.id]?.status === 'want')
  const been = PLACES.filter((p) => places[p.id]?.status === 'been').sort(
    (a, b) => VERDICT_RANK[places[a.id].verdict ?? 'liked'] - VERDICT_RANK[places[b.id].verdict ?? 'liked'],
  )
  const list = PLACES.filter(
    (p) =>
      (city === 'all' || (nearMode ? withinRadius(near!, placePoint(p, data?.placeMeta?.[p.id])) : p.city === city)) &&
      (good === 'any' || p.goodFor.includes(good)),
  )
  // Near me: one list, closest first.
  const nearby = nearMode
    ? list.map((p) => ({ p, mi: distanceTo(near!, placePoint(p, data?.placeMeta?.[p.id])) })).sort((a, b) => a.mi - b.mi).map((x) => x.p)
    : []
  const order = [profile.home, ...CITIES.map((c) => c.id).filter((c) => c !== profile.home)]
  const groups = order.map((id) => ({ c: cityById(id), items: list.filter((p) => p.city === id) })).filter((g) => g.items.length)

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-8 md:pt-12">
        <h1 className="display text-[56px] md:text-[96px]">Where to eat</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-2">
          Places current reviewers rate highly, from $6 lunches to big nights out. Keep a list of where you want to go and how
          the places you’ve been were.
        </p>
        <div className="mt-6 flex flex-wrap gap-1.5">
          <button className="chip" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            All places
          </button>
          <button className="chip" aria-pressed={tab === 'want'} onClick={() => setTab('want')}>
            Want to go · {want.length}
          </button>
          <button className="chip" aria-pressed={tab === 'been'} onClick={() => setTab('been')}>
            Been · {been.length}
          </button>
        </div>
      </section>

      {tab === 'all' && (
        <>
          <div className="mt-4 flex flex-col gap-2">
            <CityTabs />
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {['any', ...Object.keys(GOOD_FOR)].map((g) => (
                <button key={g} onClick={() => setGood(g)} aria-pressed={good === g} className="chip">
                  {g === 'any' ? 'Anything' : GOOD_FOR[g]}
                </button>
              ))}
            </div>
          </div>
          {nearMode && nearby.length > 0 && (
            <section className="mt-12">
              <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">Near {near!.label}</h2>
              <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {nearby.map((p) => (
                  <PlaceCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}
          {nearMode && !nearby.length && (
            <p className="py-20 text-center text-mute">
              No restaurants on our list within {radiusLabel(near!)} of {near!.label}. Try a wider radius.
            </p>
          )}
          {!nearMode && groups.map(({ c, items }) => (
            <section key={c.id} className="mt-12">
              <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">{c.name}</h2>
              <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p) => (
                  <PlaceCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          ))}
          {!nearMode && !groups.length && <p className="py-20 text-center text-mute">Nothing matches. Try another filter or area.</p>}
        </>
      )}

      {tab !== 'all' && (
        <section className="mt-8">
          {(tab === 'want' ? want : been).length === 0 ? (
            <p className="border border-rule py-16 text-center text-ink-2">
              {tab === 'want' ? 'Tap “+ Want to go” on any restaurant to start your list.' : 'Mark places as Been on their page to rank them here.'}
            </p>
          ) : (
            <ol className="divide-y divide-[var(--rule)] border-y border-rule">
              {(tab === 'want' ? want : been).map((p, i) => (
                <li key={p.id}>
                  <Link to={`/table/${p.id}`} className="grid grid-cols-[32px_72px_1fr] items-center gap-4 py-3 hover:bg-bg-2">
                    <span className="stamp text-[18px]">{i + 1}</span>
                    <PlaceImage p={p} className="aspect-square w-[72px] rounded-[3px]" />
                    <span className="min-w-0">
                      <span className="block text-[16px] font-bold">{p.name}</span>
                      <span className="block truncate text-[14px] text-ink-2">
                        {p.cuisine} · {p.neighborhood}, {cityById(p.city).short}
                      </span>
                      {places[p.id]?.note && <span className="block truncate text-[13px] italic text-mute">“{places[p.id].note}”</span>}
                      <span className="mt-1 inline-block">
                        <LogBadge log={places[p.id]} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      <p className="mt-12 text-[13px] text-mute">Hours and prices change; check before you go.</p>
    </div>
  )
}

function YourVerdict({ p }: { p: Place }) {
  const { places, logPlace } = useStore()
  const log = places[p.id]
  const set = (patch: Partial<PlaceLog>) => logPlace(p.id, { ...(log ?? { status: 'want' as const }), ...patch })
  return (
    <div className="rounded-[3px] border border-rule p-4">
      <p className="label">You</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          className="chip"
          aria-pressed={log?.status === 'want'}
          onClick={() => (log?.status === 'want' ? logPlace(p.id, null) : set({ status: 'want', verdict: undefined }))}
        >
          Want to go
        </button>
        {(Object.keys(VERDICT) as (keyof typeof VERDICT)[]).map((v) => (
          <button
            key={v}
            className="chip"
            aria-pressed={log?.status === 'been' && log.verdict === v}
            onClick={() => set({ status: 'been', verdict: v, date: log?.date ?? todayKey() })}
          >
            Been · {VERDICT[v]}
          </button>
        ))}
      </div>
      {log && (
        <textarea
          id={`note-${p.id}`}
          value={log.note ?? ''}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Notes for next time: what you ordered, who you went with"
          rows={2}
          className="mt-3 w-full border border-rule bg-card px-3 py-2 text-[14px]"
        />
      )}
    </div>
  )
}

function Book({ p }: { p: Place }) {
  const { data } = useStore()
  const meta = data?.placeMeta?.[p.id]
  const [date, setDate] = useState(todayKey())
  const [seats, setSeats] = useState(2)
  const [time, setTime] = useState('19:00')
  const r = reservation(p, meta?.reserve)
  if (!r)
    return (
      <div className="rounded-[3px] bg-bg-2 p-4">
        <p className="label">{p.book?.via === 'Walk-in' ? 'No reservations' : 'Reservations'}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          {p.book?.via === 'Walk-in'
            ? p.book.note ?? 'Walk in. Google Maps shows today’s hours and how busy it is.'
            : 'We didn’t find an online booking link. It may be walk-in only; Google Maps shows hours and how busy it is.'}
        </p>
        <a href={mapsUrl(p)} target="_blank" rel="noreferrer" className="btn btn-accent mt-3">
          Hours on Google Maps ↗
        </a>
      </div>
    )
  return (
    <div className="rounded-[3px] bg-[var(--riso-yellow)] p-4">
      <p className="label">Book on {r.platform}</p>
      {p.book?.note && <p className="mt-1 text-[14px]">{p.book.note}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-[13px] font-semibold">
          Date
          <input id="book-date" type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} className="border border-ink bg-card px-2 py-1.5 font-normal" />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          Time
          <input id="book-time" type="time" value={time} step={900} onChange={(e) => setTime(e.target.value)} className="border border-ink bg-card px-2 py-1.5 font-normal" />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          People
          <select id="book-seats" value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="border border-ink bg-card px-2 py-1.5 font-normal">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <a href={bookingUrl(r.platform, r.url, date, seats, time)} target="_blank" rel="noreferrer" className="btn btn-accent">
          See open tables ↗
        </a>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-2">Opens {r.platform} with live availability for your date and party size.</p>
    </div>
  )
}

function MapBox({ p }: { p: Place }) {
  const { data } = useStore()
  const meta = data?.placeMeta?.[p.id]
  if (!meta?.lat || !meta.lng) return null
  const d = 0.006
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${meta.lng - d},${meta.lat - d * 0.6},${meta.lng + d},${meta.lat + d * 0.6}&layer=mapnik&marker=${meta.lat},${meta.lng}`
  return (
    <div>
      <iframe title={`Map of ${p.name}`} src={src} loading="lazy" className="aspect-[16/9] w-full rounded-[3px] border border-rule" />
      <p className="mt-1 text-[11.5px] text-mute">
        Map ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
          OpenStreetMap contributors
        </a>
      </p>
    </div>
  )
}

export function PlacePage() {
  const { id } = useParams()
  const { data } = useStore()
  const p = PLACES.find((x) => x.id === id)
  if (!p) return <p className="py-24 text-center text-mute">We couldn’t find that restaurant.</p>
  const meta = data?.placeMeta?.[p.id]
  const others = PLACES.filter((x) => x.city === p.city && x.id !== p.id).slice(0, 4)

  return (
    <article className="mx-auto max-w-[1400px] px-4 md:px-8">
      <div className="pt-6">
        <Link to="/table" className="label hover:underline">
          ← Where to eat
        </Link>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="space-y-4">
          <PlaceImage p={p} className="aspect-[4/3] rounded-[3px]" />
          <div className="hidden lg:block">
            <MapBox p={p} />
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <p className="label">
              {p.cuisine} · {p.neighborhood}, {cityById(p.city).short} · {p.price}
            </p>
            <h1 className="display mt-2 text-[56px] md:text-[88px]">{p.name}</h1>
            <p className="mt-3 text-[19px] leading-relaxed">{p.dek}</p>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{p.why}</p>
          </div>
          {p.order && (
            <div className="rounded-[3px] bg-bg-2 p-4">
              <p className="label">What to order</p>
              <p className="mt-1 text-[17px] font-semibold">{p.order}</p>
            </div>
          )}
          <Book p={p} />
          <YourVerdict p={p} />
          <div className="flex flex-wrap gap-2">
            {meta?.menu && (
              <a href={meta.menu} target="_blank" rel="noreferrer" className="btn btn-quiet">
                Menu ↗
              </a>
            )}
            <a href={mapsUrl(p)} target="_blank" rel="noreferrer" className="btn btn-quiet">
              Directions ↗
            </a>
            <ShareButton title={p.name} text={`${p.name} — ${p.dek}`} url={appUrl(`table/${p.id}`)} />
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="btn btn-quiet">
                Website ↗
              </a>
            )}
          </div>
          {p.know && <p className="text-[15px] text-ink-2">{p.know}</p>}
          {p.address && <p className="text-[15px]">{p.address}</p>}
          <div className="lg:hidden">
            <MapBox p={p} />
          </div>
          <p className="flex flex-wrap gap-1">
            {p.goodFor.map((g) => (
              <span key={g} className="rounded-[2px] bg-bg-2 px-2 py-1 text-[13px] font-semibold">
                {GOOD_FOR[g] ?? g}
              </span>
            ))}
          </p>
          {p.source && (
            <p className="text-[13px] text-mute">
              Recommended by{' '}
              <a href={p.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                {p.source.name}
              </a>
              .
            </p>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-20">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">More in {cityById(p.city).name}</h2>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((x) => (
              <PlaceCard key={x.id} p={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
