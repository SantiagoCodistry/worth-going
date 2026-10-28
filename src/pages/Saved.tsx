import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sortTime } from '../shared/time.ts'
import type { Place, WGEvent } from '../shared/types.ts'
import { PLACES } from '../data/places.ts'
import { useStore } from '../lib/store.tsx'
import { appUrl, copy, listPath, listText, shareOrCopy } from '../lib/share.ts'
import { EventCard } from '../components/Cards.tsx'
import { Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

export function Saved() {
  const { data, saved, byId, places: log } = useStore()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [by, setBy] = useState('')
  const [status, setStatus] = useState('')
  if (!data) return <Spinner />

  const events = saved
    .filter((id) => !id.startsWith('place:'))
    .map(byId)
    .filter((e): e is WGEvent => !!e)
    .sort((a, b) => sortTime(a.start) - sortTime(b.start))
  // Restaurants you bookmarked or marked "want to go".
  const placeIds = new Set([...saved.filter((id) => id.startsWith('place:')).map((id) => id.slice(6)), ...Object.keys(log).filter((id) => log[id].status === 'want')])
  const places = PLACES.filter((p) => placeIds.has(p.id))
  const expired = saved.filter((id) => !id.startsWith('place:') && !byId(id)).length

  const startPicking = () => {
    setPicked(new Set([...events.map((e) => e.id), ...places.map((p) => `place:${p.id}`)]))
    setPicking(true)
    setStatus('')
  }
  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const chosenEvents = events.filter((e) => picked.has(e.id))
  const chosenPlaces = places.filter((p) => picked.has(`place:${p.id}`))
  const url = appUrl(listPath({ events: chosenEvents.map((e) => e.id), places: chosenPlaces.map((p) => p.id), title, by }))
  const name = title.trim() || 'Worth going'
  const flash = (s: string) => {
    setStatus(s)
    setTimeout(() => setStatus(''), 2500)
  }

  const pick = (key: string, card: ReactNode) =>
    picking ? (
      <div key={key} className="relative">
        <label className={`absolute inset-0 z-10 cursor-pointer rounded-[3px] ${picked.has(key) ? 'ring-[3px] ring-[var(--riso-pink)]' : 'bg-bg/60'}`}>
          <input type="checkbox" checked={picked.has(key)} onChange={() => toggle(key)} className="absolute left-3 top-12 h-6 w-6 accent-[var(--riso-pink)]" aria-label="Include in list" />
        </label>
        {card}
      </div>
    ) : (
      <div key={key}>{card}</div>
    )

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="flex flex-col gap-4 pt-10 md:flex-row md:items-end md:justify-between md:pt-16">
        <div>
          <h1 className="display text-[72px] md:text-[128px]">Saved</h1>
          <p className="mt-2 text-[16px] text-ink-2 md:text-[17px]">Events you bookmarked and restaurants you want to try.</p>
        </div>
        {(events.length > 0 || places.length > 0) && !picking && (
          <button onClick={startPicking} className="btn btn-accent self-start md:self-auto">
            Share a list with friends
          </button>
        )}
      </section>

      {picking && (
        <div className="sticky top-16 z-30 mt-6 border-[1.5px] border-ink bg-[var(--riso-yellow)] p-4">
          <p className="label">Make a list to share</p>
          <p className="mt-1 text-[14px]">Untick anything you don’t want in it. Friends who open the link see the same events and restaurants and can save them.</p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="List name, e.g. Friday in the city" className="w-full border-[1.5px] border-ink bg-card px-3 py-2 text-[15px] outline-none md:w-80" />
            <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Your name (optional)" className="w-full border-[1.5px] border-ink bg-card px-3 py-2 text-[15px] outline-none md:w-52" />
            <div className="flex flex-wrap gap-2">
              <button
                disabled={picked.size === 0}
                className="btn btn-accent"
                onClick={async () => {
                  const r = await shareOrCopy({ title: name, text: `${name}: ${picked.size} things worth going to`, url })
                  if (r !== 'shared') flash(r === 'copied' ? 'Link copied' : 'Couldn’t copy. Select the link below.')
                }}
              >
                Share link · {picked.size}
              </button>
              <button
                disabled={picked.size === 0}
                className="btn btn-quiet bg-card"
                onClick={async () => flash((await copy(listText(name, chosenEvents, chosenPlaces, url))) === 'copied' ? 'List copied as text' : 'Couldn’t copy')}
              >
                Copy as text
              </button>
              <button className="btn btn-quiet bg-card" onClick={() => setPicking(false)}>
                Done
              </button>
            </div>
          </div>
          {status && <p className="mt-2 text-[14px] font-semibold">{status}</p>}
          {picked.size > 0 && (
            <p className="mt-2 truncate text-[12.5px] text-ink-2">
              <Link to={`/${listPath({ events: chosenEvents.map((e) => e.id), places: chosenPlaces.map((p) => p.id), title, by })}`} className="underline">
                Preview the list
              </Link>{' '}
              · {url}
            </p>
          )}
        </div>
      )}

      {events.length === 0 && places.length === 0 && (
        <div className="mt-8 border-[1.5px] border-ink py-16 text-center">
          <p className="text-[18px] font-medium">Nothing saved yet.</p>
          <p className="mt-2 text-mute">Tap the bookmark on any event, or “Want to go” on a restaurant, to keep it here.</p>
          <Link to="/" className="btn btn-quiet mt-5">
            Browse this week
          </Link>
        </div>
      )}

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Events · {events.length}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:gap-x-5 lg:grid-cols-4">{events.map((e) => pick(e.id, <EventCard e={e} />))}</div>
        </section>
      )}

      {places.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Restaurants · {places.length}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{places.map((p: Place) => pick(`place:${p.id}`, <PlaceCard p={p} />))}</div>
        </section>
      )}

      {expired > 0 && (
        <p className="mt-10 text-[14px] text-mute">
          {expired} saved {expired === 1 ? 'event has' : 'events have'} already happened and {expired === 1 ? 'is' : 'are'} hidden.
        </p>
      )}
    </div>
  )
}
