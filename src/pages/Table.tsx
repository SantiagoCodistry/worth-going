import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Place } from '../shared/types.ts'
import { CITIES, cityById } from '../shared/taxonomy.ts'
import { PLACES } from '../data/places.ts'
import { useStore } from '../lib/store.tsx'
import { CityTabs } from '../components/Layout.tsx'
import { Photo } from '../components/Poster.tsx'
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
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ background: 'var(--c-dining)' }}>
      {!img && (
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="display text-[26px]">{p.name}</p>
        </div>
      )}
      {img && <Photo src={img.url} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]" />}
    </div>
  )
}

export function PlaceCard({ p, className = '' }: { p: Place; className?: string }) {
  return (
    <Link to={`/table/${p.id}`} className={`group block ${className}`}>
      <div className="relative">
        <PlaceImage p={p} className="aspect-[4/5]" />
        <span className="absolute left-3 top-3 rounded-full bg-bg/80 px-2.5 py-1 text-[12.5px] font-semibold backdrop-blur">{p.price}</span>
        <SaveButton id={`place:${p.id}`} className="absolute right-3 top-3 h-8 w-8 justify-center rounded-full bg-bg/80 backdrop-blur" />
      </div>
      <div className="pt-3">
        <h3 className="text-[17px] font-semibold leading-snug">
          <span className="link-underline">{p.name}</span>
        </h3>
        <p className="mt-0.5 text-[14px] text-ink-2">{p.dek}</p>
        <p className="mt-1 text-[14px] text-mute">
          {p.cuisine} · {p.neighborhood}, {cityById(p.city).short}
        </p>
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
        <h1 className="display text-[40px] md:text-[64px]">Restaurants</h1>
        <p className="mt-3 max-w-xl text-[17px] text-ink-2">Places we’d send a friend, and what to order. Nobody pays to be here.</p>
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
          <h2 className="display mb-5 text-[26px]">{c.name}</h2>
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
        <Link to="/table" className="text-[14px] font-semibold text-mute hover:text-ink">
          ← Restaurants
        </Link>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <PlaceImage p={p} className="aspect-[4/3]" />
        <div>
          <p className="text-[14px] font-semibold text-accent">
            {p.cuisine} · {p.neighborhood}, {cityById(p.city).short}
          </p>
          <h1 className="display mt-2 text-[40px] md:text-[60px]">{p.name}</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-2">{p.why}</p>
          {p.order && (
            <div className="mt-6 rounded-lg bg-bg-2 p-5">
              <p className="text-[13px] font-semibold text-mute">What to order</p>
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
          <h2 className="display mb-5 text-[26px]">More in {cityById(p.city).name}</h2>
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
