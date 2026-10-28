import { Link } from 'react-router-dom'
import { sortTime } from '../shared/time.ts'
import { PLACES } from '../data/places.ts'
import { useStore } from '../lib/store.tsx'
import { EventCard } from '../components/Cards.tsx'
import { Spinner } from '../components/bits.tsx'
import { PlaceCard } from './Table.tsx'

export function Saved() {
  const { data, saved, byId } = useStore()
  if (!data) return <Spinner />

  const events = saved
    .filter((id) => !id.startsWith('place:'))
    .map(byId)
    .filter((e) => !!e)
    .sort((a, b) => sortTime(a.start) - sortTime(b.start))
  const places = saved
    .filter((id) => id.startsWith('place:'))
    .map((id) => PLACES.find((p) => `place:${p.id}` === id))
    .filter((p) => !!p)
  const expired = saved.filter((id) => !id.startsWith('place:') && !byId(id)).length

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="pt-10 md:pt-16">
        <h1 className="display text-[72px] md:text-[128px]">Saved</h1>
        <p className="mt-2 text-[16px] text-ink-2 md:text-[17px]">Saved on this device. No account needed.</p>
      </section>

      {events.length === 0 && places.length === 0 && (
        <div className="mt-8 border-[1.5px] border-ink py-16 text-center">
          <p className="text-[18px] font-medium">Nothing saved yet.</p>
          <p className="mt-2 text-mute">Tap the bookmark on any event or restaurant to keep it here.</p>
          <Link to="/" className="btn btn-quiet mt-5">
            Browse this week
          </Link>
        </div>
      )}

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Events · {events.length}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:gap-x-5 lg:grid-cols-4">
            {events.map((e) => (
              <EventCard key={e!.id} e={e!} />
            ))}
          </div>
        </section>
      )}

      {places.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px]">Restaurants · {places.length}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p) => (
              <PlaceCard key={p!.id} p={p!} />
            ))}
          </div>
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
