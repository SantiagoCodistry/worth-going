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
  date: 'Date night',
  group: 'Groups',
  solo: 'On your own',
  late: 'Late night',
  cheap: 'Under $20',
  parents: 'Visiting parents',
}

function PlaceImage({ p, className = '' }: { p: Place; className?: string }) {
  const { data } = useStore()
  const img = data?.placeImages?.[p.id]
  const ink = inkFor('dining', p.id)
  const size = Math.min(17, 150 / Math.max(...p.name.split(/\s+/).map((w) => w.length), 4))
  return (
    <div className={`flyer ${className}`} style={{ background: ink.bg, color: ink.type }}>
     <div className="absolute inset-0 flex flex-col p-[5.5cqw]">
      <div className="stamp relative z-10 flex justify-between text-[5cqw]">
        <span>{p.cuisine}</span>
        <span>{p.price}</span>
      </div>
      <div className="relative my-[4cqw] flex-1 overflow-hidden">
        {img ? (
          <Photo src={img.url} className="duotone absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="ink flex h-full items-end justify-center" style={{ color: ink.ink }}>
            <div className="halftone aspect-square h-full max-w-full rounded-full" />
          </div>
        )}
      </div>
      <p className="display relative z-10" style={{ fontSize: `${size}cqw` }}>
        {p.name}
      </p>
      <p className="stamp relative z-10 mt-[3cqw] text-[3.8cqw]">
        {p.neighborhood}, {cityById(p.city).short}
      </p>
     </div>
    </div>
  )
}

export function PlaceCard({ p, className = '' }: { p: Place; className?: string }) {
  return (
    <Link to={`/table/${p.id}`} className={`group block ${className}`}>
      <PlaceImage p={p} className="aspect-[3/4] transition-transform duration-300 group-hover:-translate-y-1" />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold leading-snug">
            <span className="link-underline">{p.name}</span>
          </h3>
          <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{p.dek}</p>
        </div>
        <SaveButton id={`place:${p.id}`} className="-mr-1.5 h-8 w-8 shrink-0 justify-center" />
      </div>
    </Link>
  )
}

export function Table() {
  const { city } = useStore()
  const [good, setGood] = useState<string>('any')
  const list = PLACES.filter((p) => (city === 'all' || p.city === city) && (good === 'any' || p.goodFor.includes(good)))
  const groups = CITIES.map((c) => ({ c, items: list.filter((p) => p.city === c.id) })).filter((g) => g.items.length)

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-10 md:pt-14">
        <h1 className="display text-[72px] md:text-[128px]">Restaurants</h1>
        <p className="mt-3 max-w-xl text-[17px] text-ink-2">Where we’d eat in New York, Philadelphia and Princeton, and what to order. Nobody paid to be listed.</p>
        <div className="mt-6 flex flex-col gap-2">
          <CityTabs />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {['any', ...Object.keys(GOOD_FOR)].map((g) => (
              <button key={g} onClick={() => setGood(g)} aria-pressed={good === g} className="chip">
                {g === 'any' ? 'Any occasion' : GOOD_FOR[g]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {groups.map(({ c, items }) => (
        <section key={c.id} className="mt-12">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">{c.name}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {items.map((p) => (
              <PlaceCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="py-20 text-center text-mute">Nothing matches. Try another occasion or city.</p>}
      <p className="mt-12 text-[13px] text-mute">Hours and reservation policies change. Check the restaurant’s site before you go.</p>
    </div>
  )
}

export function PlacePage() {
  const { id } = useParams()
  const p = PLACES.find((x) => x.id === id)
  if (!p) return <p className="py-24 text-center text-mute">We couldn’t find that restaurant.</p>
  const others = PLACES.filter((x) => x.city === p.city && x.id !== p.id).slice(0, 4)
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}`)}`

  return (
    <article className="mx-auto max-w-[1400px] px-4 md:px-8">
      <div className="pt-6">
        <Link to="/table" className="label hover:underline">
          ← Restaurants
        </Link>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <PlaceImage p={p} className="aspect-[4/3]" />
        <div>
          <p className="label">
            {p.cuisine} · {p.neighborhood}, {cityById(p.city).short}
          </p>
          <h1 className="display mt-2 text-[64px] md:text-[104px]">{p.name}</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-2">{p.why}</p>
          {p.order && (
            <div className="mt-6 border-[1.5px] border-ink bg-[var(--riso-yellow)] p-5">
              <p className="label">What to order</p>
              <p className="mt-1 text-[17px] font-semibold">{p.order}</p>
            </div>
          )}
          {p.know && <p className="mt-4 text-[15px] text-ink-2">{p.know}</p>}
          <dl className="mt-6 space-y-1 text-[15px]">
            <div className="flex gap-3"><dt className="w-20 text-mute">Address</dt><dd>{p.address}</dd></div>
            <div className="flex gap-3"><dt className="w-20 text-mute">Price</dt><dd>{p.price}</dd></div>
            <div className="flex gap-3"><dt className="w-20 text-mute">Good for</dt><dd>{p.goodFor.map((g) => GOOD_FOR[g] ?? g).join(', ')}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={p.website} target="_blank" rel="noreferrer" className="btn btn-accent">
              Website ↗
            </a>
            <a href={maps} target="_blank" rel="noreferrer" className="btn btn-quiet">
              Directions
            </a>
            <SaveButton id={`place:${p.id}`} label className="btn btn-quiet" />
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-20">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">More in {cityById(p.city).name}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {others.map((x) => (
              <PlaceCard key={x.id} p={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
