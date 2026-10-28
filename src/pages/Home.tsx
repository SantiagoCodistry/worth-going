import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { CATEGORIES, cityById } from '../shared/taxonomy.ts'
import { PLACES } from '../data/places.ts'
import { applyFilters } from '../lib/recommend.ts'
import { INTERESTS, fit, type Fit } from '../lib/profile.ts'
import { artistAt } from '../lib/spotify.ts'
import { useStore } from '../lib/store.tsx'
import { Avatar, EventCard, EventRow, Reasons } from '../components/Cards.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Cover, billed, dateStamp, formatOf, summaryOf } from '../components/Poster.tsx'
import { PreviewTag, SaveButton, SectionHead, Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

type Ranked = { e: WGEvent; f: Fit }

/** Live listings need a photo and a reasonable score to be featured; the calendar still shows everything. */
const featurable = (r: Ranked) => r.e.provenance === 'preview' || (!!r.e.image && (r.e.score ?? 0) >= 20)

export function Home() {
  const { data, error, city, profile } = useStore()
  const events = useMemo(() => data?.events ?? [], [data])

  const ranked = useMemo<Ranked[]>(() => {
    return applyFilters(events, { city, when: 'month' })
      .map((e) => ({ e, f: fit(e, profile) }))
      .filter((r) => !r.f.hidden && !r.f.clash)
      .sort((a, b) => b.f.score - a.f.score)
  }, [events, city, profile])

  const picks = useMemo(() => {
    const out: Ranked[] = []
    const perCat = new Map<CategoryId, number>()
    for (const r of ranked.filter(featurable)) {
      if (r.e.kind === 'exhibition' && out.length < 3) continue
      const n = perCat.get(r.e.category) ?? 0
      if (n >= 2) continue
      perCat.set(r.e.category, n + 1)
      out.push(r)
      if (out.length === 7) break
    }
    return out
  }, [ranked])

  const week = useMemo(() => {
    const used = new Set(picks.map((r) => r.e.id))
    const inWeek = applyFilters(
      ranked.map((r) => r.e),
      { city, when: 'week' },
    )
    const ids = new Set(inWeek.map((e) => e.id))
    return ranked.filter((r) => ids.has(r.e.id) && !used.has(r.e.id) && r.e.kind === 'event').slice(0, 8)
  }, [ranked, picks, city])

  if (error) return <LoadError message={error} />
  if (!data) return <Spinner />

  const [lead, ...rest] = picks
  const loved = INTERESTS.filter((i) => profile.levels[i.id] === 2).map((i) => i.label.toLowerCase())

  // Category rows in the order of what you like most.
  const catOrder = CATEGORIES.filter((c) => c.id !== 'dining')
    .map((c) => ({ c, w: Math.max(...INTERESTS.filter((i) => i.match({ category: c.id, tags: [], title: '' } as unknown as WGEvent)).map((i) => profile.levels[i.id] ?? 1), 1) }))
    .sort((a, b) => b.w - a.w)

  return (
    <div>
      <section className="mx-auto max-w-[1400px] px-4 pt-6 md:px-8 md:pt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display text-[56px] md:text-[96px]">For you</h1>
            <p className="mt-2 max-w-xl text-[15px] text-ink-2">
              Ranked for someone based in {cityById(profile.home).name} who’s into {loved.slice(0, 3).join(', ')}
              {loved.length > 3 ? ' and more' : ''}.{' '}
              <Link to="/you" className="font-semibold text-ink underline underline-offset-2">
                Change your taste
              </Link>
            </p>
          </div>
          <CityTabs />
        </div>
      </section>

      {lead ? <Feature r={lead} /> : <Empty />}

      {rest.length > 0 && (
        <section className="mx-auto mt-12 max-w-[1400px] px-4 md:px-8">
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((r) => (
              <EventCard key={r.e.id} e={r.e} reasons={r.f.reasons} />
            ))}
          </div>
        </section>
      )}

      <MyArtists ranked={ranked} />

      {week.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1400px] px-4 md:mt-20 md:px-8">
          <SectionHead title="Also this week" to="/explore?when=week" toLabel="Full calendar" />
          <div className="border-t border-rule">
            {week.map((r) => (
              <EventRow key={r.e.id} e={r.e} />
            ))}
          </div>
        </section>
      )}

      {catOrder.map(({ c }) => (
        <CategoryRow key={c.id} category={c.id} ranked={ranked} />
      ))}

      <Restaurants />
    </div>
  )
}

function Feature({ r }: { r: Ranked }) {
  const e = r.e
  const people = billed(e)
  return (
    <section className="mx-auto mt-8 max-w-[1400px] px-4 md:px-8">
      <div className="rise grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
        <Link to={`/e/${e.id}`} className="group block">
          <Cover e={e} className="aspect-[4/3] rounded-[3px] lg:aspect-[5/4]" />
        </Link>
        <div className="flex flex-col">
          <p className="label text-[12px]">
            Top pick · {formatOf(e)} · {cityById(e.city).short}
          </p>
          <Link to={`/e/${e.id}`} className="group">
            <h2 className="display mt-3 text-[48px] md:text-[72px]">
              <span className="link-underline">{e.title}</span>
            </h2>
          </Link>
          <p className="stamp mt-4 text-[14px]">{dateStamp(e)}</p>
          <p className="text-[15px] text-ink-2">
            {e.venue.name}
            {e.price ? ` · ${e.price}` : e.isFree ? ' · Free' : ''}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed">{summaryOf(e)}</p>
          {people.length > 0 && (
            <ul className="mt-5 space-y-3">
              {people.slice(0, 3).map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <Avatar p={p} size={48} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight">{p.name}</p>
                    <p className="text-[14px] leading-snug text-ink-2">{p.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {e.why && <p className="mt-5 border-l-[3px] border-[var(--riso-yellow)] pl-3 text-[15px] text-ink-2">{e.why}</p>}
          <Reasons reasons={r.f.reasons} className="mt-5" />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link to={`/e/${e.id}`} className="btn btn-accent">
              Details
            </Link>
            <SaveButton id={e.id} label className="btn btn-quiet" />
            <PreviewTag e={e} className="ml-2" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function Row({ title, to, toLabel, children }: { title: string; to?: string; toLabel?: string; children: ReactNode }) {
  return (
    <section className="mt-16 md:mt-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <SectionHead title={title} to={to} toLabel={toLabel} />
      </div>
      <div className="no-scrollbar mx-auto flex max-w-[1400px] snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 md:scroll-px-8 md:px-8">
        {children}
      </div>
    </section>
  )
}

/** Shows by artists you listen to (Spotify or typed in), soonest first. */
function MyArtists({ ranked }: { ranked: Ranked[] }) {
  const { profile, data, city } = useStore()
  const artists = profile.artists ?? []
  const items = useMemo(
    () =>
      applyFilters(data?.events ?? [], { city, when: 'all' })
        .filter((e) => artistAt(e, artists))
        .map((e) => ranked.find((r) => r.e.id === e.id) ?? { e, f: fit(e, profile) })
        .slice(0, 12),
    [data, city, artists, ranked, profile],
  )
  if (!artists.length) return null
  if (!items.length)
    return (
      <section className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <SectionHead title="Your artists" />
        <p className="text-[15px] text-ink-2">None of your {artists.length} artists have a show listed nearby yet. New dates are added every morning.</p>
      </section>
    )
  return (
    <Row title="Your artists" to="/explore?cat=music&when=all&mine=1" toLabel="All their shows">
      {items.map((r) => (
        <EventCard key={r.e.id} e={r.e} reasons={r.f.reasons} className="w-[78vw] shrink-0 snap-start sm:w-[320px]" />
      ))}
    </Row>
  )
}

function CategoryRow({ category, ranked }: { category: CategoryId; ranked: Ranked[] }) {
  const c = CATEGORIES.find((x) => x.id === category)!
  const items = ranked.filter((r) => r.e.category === category && featurable(r)).slice(0, 10)
  if (items.length < 2) return null
  return (
    <Row title={c.title} to={`/explore?cat=${category}`}>
      {items.map((r) => (
        <EventCard key={r.e.id} e={r.e} reasons={r.f.reasons} className="w-[78vw] shrink-0 snap-start sm:w-[320px]" />
      ))}
    </Row>
  )
}

function Restaurants() {
  const { city, profile } = useStore()
  const list = (city === 'all' ? PLACES : PLACES.filter((p) => p.city === city))
    .slice()
    .sort((a, b) => Number(b.city === profile.home) - Number(a.city === profile.home))
  return (
    <Row title="Where to eat" to="/table" toLabel="All restaurants">
      {list.slice(0, 10).map((p) => (
        <PlaceCard key={p.id} p={p} className="w-[78vw] shrink-0 snap-start sm:w-[320px]" />
      ))}
    </Row>
  )
}

function Empty() {
  const { setCity } = useStore()
  return (
    <div className="mx-auto mt-8 max-w-[1400px] px-4 md:px-8">
      <div className="border border-rule py-16 text-center">
        <p className="text-[18px] font-bold">Nothing listed here for the next month yet.</p>
        <button onClick={() => setCity('all')} className="btn mt-5">
          Show all cities
        </button>
      </div>
    </div>
  )
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-[20px] font-bold">The listings didn’t load.</p>
      <p className="mt-3 text-ink-2">
        The events file is missing or unreachable ({message}). Run <code>npm run ingest</code>, then reload.
      </p>
    </div>
  )
}
