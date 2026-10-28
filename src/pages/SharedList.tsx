import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { sortTime } from '../shared/time.ts'
import type { WGEvent } from '../shared/types.ts'
import { PLACES } from '../data/places.ts'
import { useStore } from '../lib/store.tsx'
import { appUrl, listPath, parseList } from '../lib/share.ts'
import { EventCard } from '../components/Cards.tsx'
import { ShareButton, Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

/** A list someone shared: everything is in the link, so it opens for anyone. */
export function SharedList() {
  const [params] = useSearchParams()
  const { data, byId, saved, toggleSaved, places: log, logPlace } = useStore()
  const [added, setAdded] = useState(false)
  if (!data) return <Spinner />

  const list = parseList(params)
  const events = list.events
    .map(byId)
    .filter((e): e is WGEvent => !!e)
    .sort((a, b) => sortTime(a.start) - sortTime(b.start))
  const gone = list.events.length - events.length
  const places = list.places.map((id) => PLACES.find((p) => p.id === id)).filter((p) => !!p)
  const title = list.title || 'A list worth going to'

  const saveAll = () => {
    for (const e of events) if (!saved.includes(e.id)) toggleSaved(e.id)
    for (const p of places) if (!log[p!.id]) logPlace(p!.id, { status: 'want' })
    setAdded(true)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-10 md:pt-16">
        <p className="label text-[12px]">{list.by ? `Shared by ${list.by}` : 'Shared list'}</p>
        <h1 className="display mt-2 text-[56px] md:text-[104px]">{title}</h1>
        <p className="mt-2 text-[16px] text-ink-2">
          {[events.length && `${events.length} ${events.length === 1 ? 'event' : 'events'}`, places.length && `${places.length} ${places.length === 1 ? 'restaurant' : 'restaurants'}`]
            .filter(Boolean)
            .join(' and ') || 'Nothing in this list is still listed.'}
        </p>
        {(events.length > 0 || places.length > 0) && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={saveAll} className="btn btn-accent" disabled={added}>
              {added ? 'Added to your Saved' : 'Save all to my list'}
            </button>
            <ShareButton title={title} url={appUrl(listPath(list))} label="Pass it on" />
            {added && (
              <Link to="/saved" className="btn btn-quiet">
                Open Saved
              </Link>
            )}
          </div>
        )}
      </section>

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Events</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:gap-x-5 lg:grid-cols-4">
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      {places.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Restaurants</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p) => (
              <PlaceCard key={p!.id} p={p!} />
            ))}
          </div>
        </section>
      )}

      {gone > 0 && (
        <p className="mt-10 text-[14px] text-mute">
          {gone} {gone === 1 ? 'event in this list has' : 'events in this list have'} already happened or {gone === 1 ? 'is' : 'are'} no longer listed.
        </p>
      )}
    </div>
  )
}
