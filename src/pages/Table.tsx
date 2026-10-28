import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Place } from '../shared/types.ts'
import { CITIES, cityById } from '../shared/taxonomy.ts'
import { PLACES } from '../data/places.ts'
import { useStore } from '../lib/store.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Photo, inkFor } from '../components/Poster.tsx'
import { SaveButton } from '../components/bits.tsx'

const GOOD_FOR: Record<string, string> = {
  cheap: 'Cheap',
  date: 'Date night',
  group: 'Groups',
  solo: 'On your own',
  late: 'Late',
  splurge: 'Splurge',
  new: 'New',
}

const mapsUrl = (p: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address ?? `${p.neighborhood}, ${cityById(p.city).name}`}`)}`

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

export function PlaceCard({ p, className = '' }: { p: Place; className?: string }) {
  return (
    <Link to={`/table/${p.id}`} className={`group block ${className}`}>
      <div className="relative">
        <PlaceImage p={p} className="aspect-[4/3] rounded-[3px]" />
        <span className="stamp absolute left-2 top-2 rounded-[2px] bg-bg px-2 py-1 text-[11px]">{p.price}</span>
        <SaveButton id={`place:${p.id}`} className="absolute right-2 top-2 h-8 w-8 justify-center rounded-full bg-bg/90" />
      </div>
      <div className="pt-3">
        <p className="label text-[11px] text-mute">
          {p.cuisine} · {p.neighborhood}
        </p>
        <h3 className="mt-1 text-[17px] font-bold leading-snug">
          <span className="link-underline">{p.name}</span>
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

export function Table() {
  const { city, profile } = useStore()
  const [good, setGood] = useState<string>('any')
  const list = PLACES.filter((p) => (city === 'all' || p.city === city) && (good === 'any' || p.goodFor.includes(good)))
  const order = [profile.home, ...CITIES.map((c) => c.id).filter((c) => c !== profile.home)]
  const groups = order.map((id) => ({ c: cityById(id), items: list.filter((p) => p.city === id) })).filter((g) => g.items.length)

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-8 md:pt-12">
        <h1 className="display text-[56px] md:text-[96px]">Where to eat</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-2">
          Places current reviewers rate highly, from $6 lunches to big nights out. Each one links to the review it came from.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <CityTabs />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {['any', ...Object.keys(GOOD_FOR)].map((g) => (
              <button key={g} onClick={() => setGood(g)} aria-pressed={good === g} className="chip">
                {g === 'any' ? 'Anything' : GOOD_FOR[g]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {groups.map(({ c, items }) => (
        <section key={c.id} className="mt-12">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">{c.name}</h2>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <PlaceCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="py-20 text-center text-mute">Nothing matches. Try another filter or city.</p>}
      <p className="mt-12 text-[13px] text-mute">Hours and prices change. Check before you go.</p>
    </div>
  )
}

export function PlacePage() {
  const { id } = useParams()
  const p = PLACES.find((x) => x.id === id)
  if (!p) return <p className="py-24 text-center text-mute">We couldn’t find that restaurant.</p>
  const others = PLACES.filter((x) => x.city === p.city && x.id !== p.id).slice(0, 4)

  return (
    <article className="mx-auto max-w-[1400px] px-4 md:px-8">
      <div className="pt-6">
        <Link to="/table" className="label hover:underline">
          ← Where to eat
        </Link>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
        <PlaceImage p={p} className="aspect-[4/3] rounded-[3px]" />
        <div>
          <p className="label">
            {p.cuisine} · {p.neighborhood}, {cityById(p.city).short} · {p.price}
          </p>
          <h1 className="display mt-2 text-[56px] md:text-[88px]">{p.name}</h1>
          <p className="mt-4 text-[19px] leading-relaxed">{p.dek}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{p.why}</p>
          {p.order && (
            <div className="mt-6 rounded-[3px] bg-[var(--riso-yellow)] p-5">
              <p className="label">What to order</p>
              <p className="mt-1 text-[17px] font-semibold">{p.order}</p>
            </div>
          )}
          {p.know && <p className="mt-4 text-[15px] text-ink-2">{p.know}</p>}
          <p className="mt-6 flex flex-wrap gap-1">
            {p.goodFor.map((g) => (
              <span key={g} className="rounded-[2px] bg-bg-2 px-2 py-1 text-[13px] font-semibold">
                {GOOD_FOR[g] ?? g}
              </span>
            ))}
          </p>
          {p.address && <p className="mt-4 text-[15px]">{p.address}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={mapsUrl(p)} target="_blank" rel="noreferrer" className="btn btn-accent">
              Directions ↗
            </a>
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="btn btn-quiet">
                Website ↗
              </a>
            )}
            <SaveButton id={`place:${p.id}`} label className="btn btn-quiet" />
          </div>
          {p.source && (
            <p className="mt-6 text-[13px] text-mute">
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
