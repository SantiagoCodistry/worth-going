import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyFilters } from '../lib/recommend.ts'
import { KIND_LABEL, TEAMS, favoriteAt, type Favorite, type FavoriteKind } from '../lib/favorites.ts'
import { connectSpotify, spotifyEnabled } from '../lib/spotify.ts'
import { useStore } from '../lib/store.tsx'

const PLACEHOLDER: Record<FavoriteKind, string> = {
  artist: 'e.g. Geese, Mark Normand',
  team: 'e.g. Knicks',
  venue: 'e.g. The Met, Mütter Museum',
  person: 'e.g. Jerome Powell, a writer or a scientist',
}
const NOT_VENUES = /address|private|register|tba|online|zoom|see listing/i

/** Artists, teams, venues and people you follow, and how many upcoming events match. */
export function Favorites() {
  const { profile, setProfile, data } = useStore()
  const favs = profile.favorites ?? []
  const [kind, setKind] = useState<FavoriteKind>('artist')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const fromSpotify = favs.some((a) => a.from === 'spotify')

  const upcoming = useMemo(() => applyFilters(data?.events ?? [], { city: 'all', when: 'all' }), [data])
  const matches = useMemo(() => upcoming.filter((e) => favoriteAt(e, favs)), [upcoming, favs])

  // One-tap picks: teams we carry, and the venues with the most talks and exhibitions.
  const venuePicks = useMemo(() => {
    const count = new Map<string, number>()
    for (const e of upcoming)
      if ((e.category === 'art' || e.category === 'ideas' || e.kind === 'exhibition') && !NOT_VENUES.test(e.venue.name))
        count.set(e.venue.name, (count.get(e.venue.name) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
  }, [upcoming])
  const picks = kind === 'team' ? TEAMS : kind === 'venue' ? venuePicks : []

  const has = (n: string) => favs.some((f) => f.name.toLowerCase() === n.toLowerCase())
  const save = (list: Favorite[]) => setProfile({ ...profile, favorites: list })
  const add = (n: string, k = kind) => {
    const v = n.trim()
    if (v && !has(v)) save([{ name: v, kind: k, from: 'you' }, ...favs])
    setName('')
  }
  const countFor = (f: Favorite) => matches.filter((e) => favoriteAt(e, [f])).length

  return (
    <section className="mt-12">
      <h2 className="display border-t-[3px] border-ink pt-3 text-[32px] md:text-[40px]">Favorites</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        Artists, teams, museums and people you follow. Anything with them goes to the top of For you
        {matches.length ? `; ${matches.length} upcoming ${matches.length === 1 ? 'event matches' : 'events match'}.` : '.'}
      </p>

      {spotifyEnabled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-accent"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              connectSpotify().catch(() => setBusy(false))
            }}
          >
            {fromSpotify ? 'Refresh from Spotify' : 'Add artists from Spotify'}
          </button>
          <span className="text-[13px] text-mute">Read-only. We keep artist names and genres, nothing else.</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Kind of favorite">
        {(Object.keys(KIND_LABEL) as FavoriteKind[]).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className="chip">
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault()
          add(name)
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={PLACEHOLDER[kind]}
          aria-label={`Add to ${KIND_LABEL[kind]}`}
          className="w-full max-w-sm border-[1.5px] border-ink bg-card px-3 py-2 text-[15px] outline-none"
        />
        <button className="btn btn-quiet">Add</button>
      </form>
      {picks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {picks.map((n) => (
            <button key={n} onClick={() => add(n)} disabled={has(n)} className="rounded-[2px] border border-ink px-2 py-1 text-[13px] font-semibold hover:bg-[var(--riso-yellow)] disabled:opacity-40">
              + {n}
            </button>
          ))}
        </div>
      )}

      {favs.length > 0 && (
        <div className="mt-6 space-y-4">
          {(Object.keys(KIND_LABEL) as FavoriteKind[]).map((k) => {
            const list = favs.filter((f) => f.kind === k)
            if (!list.length) return null
            return (
              <div key={k}>
                <p className="label text-[11px] text-mute">{KIND_LABEL[k]}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {list.slice(0, 80).map((f) => {
                    const n = countFor(f)
                    return (
                      <li key={f.name}>
                        <button
                          onClick={() => save(favs.filter((x) => x !== f))}
                          title="Remove"
                          className={`rounded-[2px] px-2 py-1 text-[13px] font-semibold ${n ? 'bg-[var(--riso-yellow)]' : 'bg-bg-2'}`}
                        >
                          {f.name}
                          {n ? ` · ${n}` : ''} ×
                        </button>
                      </li>
                    )
                  })}
                  {list.length > 80 && <li className="px-2 py-1 text-[13px] text-mute">and {list.length - 80} more</li>}
                </ul>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-3 text-[14px]">
            {matches.length > 0 && (
              <Link to="/explore?when=all&mine=1" className="font-semibold underline underline-offset-2">
                See all {matches.length}
              </Link>
            )}
            <button className="text-mute underline" onClick={() => save([])}>
              Clear all
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
