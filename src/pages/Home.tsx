import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { CATEGORIES, cityById } from '../shared/taxonomy.ts'
import { PLACES } from '../data/places.ts'
import { WHEN_OPTIONS, overlaps, whenRange } from '../lib/dates.ts'
import { applyFilters, diversePicks, rank } from '../lib/recommend.ts'
import { useStore } from '../lib/store.tsx'
import { EventCard, EventRow } from '../components/Cards.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Flyer } from '../components/Poster.tsx'
import { SectionHead, Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

export function Home() {
  const { data, error, city } = useStore()
  const events = useMemo(() => data?.events ?? [], [data])

  const picks = useMemo(() => {
    let r = rank(events, { city, when: 'week' }).filter((e) => e.kind === 'event')
    if (r.length < 5) r = rank(events, { city, when: 'month' }).filter((e) => e.kind === 'event')
    return diversePicks(r, 5, 2)
  }, [events, city])

  const week = useMemo(
    () =>
      applyFilters(events, { city, when: 'week' })
        .filter((e) => e.kind === 'event')
        .sort((a, b) => a.start.localeCompare(b.start)),
    [events, city],
  )

  if (error) return <LoadError message={error} />
  if (!data) return <Spinner />

  return (
    <div>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 pt-5 md:flex-row md:items-center md:justify-between md:px-8">
        <CityTabs />
        <WhenLinks events={events} />
      </div>

      {picks.length ? <Wall picks={picks} /> : <Empty />}

      {week.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1400px] px-4 md:mt-20 md:px-8">
          <SectionHead title="This week" blurb={city === 'all' ? 'Everything we’re tracking, in order.' : `Everything in ${cityById(city).name}, in order.`} to="/explore?when=week" toLabel="Full calendar" />
          <div className="border-t-[1.5px] border-ink">
            {week.slice(0, 10).map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      {CATEGORIES.filter((c) => c.id !== 'dining').map((c) => (
        <CategoryRow key={c.id} category={c.id} events={events} />
      ))}

      <Restaurants />
    </div>
  )
}

/** The poster wall: one big flyer, four small. */
function Wall({ picks }: { picks: WGEvent[] }) {
  const [lead, ...rest] = picks
  return (
    <section className="mx-auto mt-5 max-w-[1400px] px-4 md:px-8">
      <div className="rise grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Link to={`/e/${lead.id}`} className="group col-span-2 row-span-2 block">
          <Flyer event={lead} className="aspect-[3/4] h-full w-full sm:aspect-[4/5] lg:aspect-auto" />
        </Link>
        {rest.map((e) => (
          <Link key={e.id} to={`/e/${e.id}`} className="group block">
            <Flyer event={e} className="aspect-[3/4] transition-transform duration-300 group-hover:-translate-y-1" />
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[14px] text-ink-2">
        <span className="font-bold">This week’s wall:</span> {picks.map((e) => e.title).join(' / ')}
      </p>
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
            {w.label} <span className="tabular-nums opacity-60">{n}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function Row({ title, blurb, to, toLabel, children }: { title: string; blurb?: string; to?: string; toLabel?: string; children: ReactNode }) {
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

function CategoryRow({ category, events }: { category: CategoryId; events: WGEvent[] }) {
  const { city } = useStore()
  const c = CATEGORIES.find((x) => x.id === category)!
  const items = rank(applyFilters(events, { city, category, when: 'month' }), { city }).slice(0, 10)
  if (!items.length) return null
  return (
    <Row title={c.title} blurb={c.blurb} to={`/explore?cat=${category}`}>
      {items.map((e) => (
        <EventCard key={e.id} e={e} className="w-[68vw] shrink-0 snap-start sm:w-[260px]" />
      ))}
    </Row>
  )
}

function Restaurants() {
  const { city } = useStore()
  const places = city === 'all' ? PLACES : PLACES.filter((p) => p.city === city)
  return (
    <Row title="Restaurants" blurb="Places we’d send a friend, and what to order." to="/table" toLabel="All restaurants">
      {places.slice(0, 10).map((p) => (
        <PlaceCard key={p.id} p={p} className="w-[68vw] shrink-0 snap-start sm:w-[260px]" />
      ))}
    </Row>
  )
}

function Empty() {
  const { setCity } = useStore()
  return (
    <div className="mx-auto mt-6 max-w-[1400px] px-4 md:px-8">
      <div className="border-[1.5px] border-ink py-16 text-center">
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
