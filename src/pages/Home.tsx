import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { CATEGORIES, cityById } from '../shared/taxonomy.ts'
import { PLACES } from '../data/places.ts'
import { WHEN_OPTIONS, overlaps, whenLine, whenRange } from '../lib/dates.ts'
import { applyFilters, diversePicks, rank } from '../lib/recommend.ts'
import { useStore } from '../lib/store.tsx'
import { Avatar, EventCard } from '../components/Cards.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Cover, NOT_BILLED } from '../components/Poster.tsx'
import { PreviewTag, SaveButton, SectionHead, Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

export function Home() {
  const { data, error, city } = useStore()
  const events = useMemo(() => data?.events ?? [], [data])

  const week = useMemo(() => {
    let r = rank(events, { city, when: 'week' }).filter((e) => e.kind === 'event')
    if (r.length < 6) r = rank(events, { city, when: 'month' }).filter((e) => e.kind === 'event')
    return diversePicks(r, 9, 3)
  }, [events, city])

  if (error) return <LoadError message={error} />
  if (!data) return <Spinner />

  const [lead, ...rest] = week

  return (
    <div>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 pt-6 md:flex-row md:items-center md:justify-between md:px-8">
        <CityTabs />
        <WhenLinks events={events} />
      </div>

      {lead ? <Feature e={lead} /> : <Empty />}

      {rest.length > 0 && (
        <Rail title="Coming up" blurb={city === 'all' ? 'Across all three cities.' : `In ${cityById(city).name}.`} to="/explore?when=month">
          {rest.map((e) => (
            <EventCard key={e.id} e={e} className="w-[72vw] shrink-0 snap-start sm:w-[280px]" />
          ))}
        </Rail>
      )}

      {CATEGORIES.filter((c) => c.id !== 'dining').map((c) => (
        <CategoryRail key={c.id} category={c.id} events={events} />
      ))}

      <Restaurants />
    </div>
  )
}

function Feature({ e }: { e: WGEvent }) {
  const speakers = e.people?.filter((p) => !NOT_BILLED.test(p.role)) ?? []
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 md:mt-8 md:px-8">
      <div className="rise grid overflow-hidden rounded-xl bg-bg-2 lg:grid-cols-[1.35fr_1fr]">
        <Link to={`/e/${e.id}`} className="group block">
          <Cover event={e} size="lg" className="aspect-[4/3] !rounded-none lg:aspect-auto lg:h-full lg:min-h-[520px]" />
        </Link>
        <div className="flex flex-col p-6 md:p-10">
          <p className="text-[14px] font-semibold text-accent">Pick of the week</p>
          <Link to={`/e/${e.id}`} className="group">
            <h1 className="display mt-3 text-[38px] md:text-[56px]">
              <span className="link-underline">{e.title}</span>
            </h1>
          </Link>
          <p className="mt-4 text-[16px] font-semibold">{whenLine(e)}</p>
          <p className="text-[15px] text-mute">
            {e.venue.name}, {cityById(e.city).short}
            {e.price ? ` · ${e.price}` : ''}
          </p>

          {speakers.length > 0 && (
            <ul className="mt-6 space-y-3">
              {speakers.slice(0, 3).map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <Avatar p={p} size={44} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight">{p.name}</p>
                    <p className="text-[13.5px] leading-snug text-mute">{p.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {e.why && <p className="mt-6 text-[17px] leading-relaxed text-ink-2">{e.why}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
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

function WhenLinks({ events }: { events: WGEvent[] }) {
  const { city } = useStore()
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {WHEN_OPTIONS.filter((w) => w.id !== 'all').map((w) => {
        const n = events.filter((e) => (city === 'all' || e.city === city) && overlaps(e, whenRange(w.id))).length
        return (
          <Link key={w.id} to={`/explore?when=${w.id}`} className="chip">
            {w.label} <span className="text-mute tabular-nums">{n}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function Rail({ title, blurb, to, toLabel, children }: { title: string; blurb?: string; to?: string; toLabel?: string; children: ReactNode }) {
  return (
    <section className="mt-16 md:mt-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <SectionHead title={title} blurb={blurb} to={to} toLabel={toLabel} />
      </div>
      <div className="no-scrollbar mx-auto flex max-w-[1400px] snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:scroll-px-8 md:gap-5 md:px-8">
        {children}
      </div>
    </section>
  )
}

function CategoryRail({ category, events }: { category: CategoryId; events: WGEvent[] }) {
  const { city } = useStore()
  const c = CATEGORIES.find((x) => x.id === category)!
  const items = rank(applyFilters(events, { city, category, when: 'month' }), { city }).slice(0, 10)
  if (!items.length) return null
  return (
    <Rail title={c.title} blurb={c.blurb} to={`/explore?cat=${category}`}>
      {items.map((e) => (
        <EventCard key={e.id} e={e} className="w-[72vw] shrink-0 snap-start sm:w-[280px]" />
      ))}
    </Rail>
  )
}

function Restaurants() {
  const { city } = useStore()
  const places = city === 'all' ? PLACES : PLACES.filter((p) => p.city === city)
  return (
    <Rail title="Restaurants" blurb="Places we’d send a friend, and what to order." to="/table" toLabel="All restaurants">
      {places.slice(0, 10).map((p) => (
        <PlaceCard key={p.id} p={p} className="w-[72vw] shrink-0 snap-start sm:w-[280px]" />
      ))}
    </Rail>
  )
}

function Empty() {
  const { setCity } = useStore()
  return (
    <div className="mx-auto mt-8 max-w-[1400px] px-4 md:px-8">
      <div className="rounded-xl bg-bg-2 py-16 text-center">
        <p className="text-[18px] font-semibold">Nothing listed here for the next month yet.</p>
        <button onClick={() => setCity('all')} className="btn btn-quiet mt-5">
          Show all cities
        </button>
      </div>
    </div>
  )
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-[20px] font-semibold">The listings didn’t load.</p>
      <p className="mt-3 text-mute">
        The events file is missing or unreachable ({message}). Run <code>npm run ingest</code>, then reload.
      </p>
    </div>
  )
}
