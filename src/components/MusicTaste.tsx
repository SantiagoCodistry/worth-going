import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyFilters } from '../lib/recommend.ts'
import { artistAt, connectSpotify, spotifyEnabled, type Artist } from '../lib/spotify.ts'
import { useStore } from '../lib/store.tsx'

/** Your artists, from Spotify or typed in, and how many upcoming shows match. */
export function MusicTaste() {
  const { profile, setProfile, data } = useStore()
  const artists = profile.artists ?? []
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const fromSpotify = artists.some((a) => a.from === 'spotify')

  const matches = useMemo(
    () => applyFilters(data?.events ?? [], { city: 'all', when: 'all' }).filter((e) => artistAt(e, artists)),
    [data, artists],
  )

  const save = (list: Artist[]) => setProfile({ ...profile, artists: list })
  const add = () => {
    const n = name.trim()
    if (!n || artists.some((a) => a.name.toLowerCase() === n.toLowerCase())) return setName('')
    save([{ name: n, genres: [], from: 'you' }, ...artists])
    setName('')
  }

  return (
    <section className="mt-12">
      <h2 className="display border-t-[3px] border-ink pt-3 text-[32px] md:text-[40px]">Music you listen to</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        Shows by these artists go to the top of For you{matches.length ? `. ${matches.length} upcoming ${matches.length === 1 ? 'show matches' : 'shows match'}.` : '.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {spotifyEnabled && (
          <button
            className="btn btn-accent"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              connectSpotify().catch(() => setBusy(false))
            }}
          >
            {fromSpotify ? 'Refresh from Spotify' : 'Connect Spotify'}
          </button>
        )}
        <form
          className="flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault()
            add()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add an artist or comedian"
            aria-label="Add an artist"
            className="w-56 border-[1.5px] border-ink bg-card px-3 py-2 text-[15px] outline-none"
          />
          <button className="btn btn-quiet">Add</button>
        </form>
      </div>
      {spotifyEnabled && !fromSpotify && (
        <p className="mt-2 text-[13px] text-mute">Read-only: we read your top and followed artists once, keep their names and genres, and nothing else.</p>
      )}

      {artists.length > 0 && (
        <>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {artists.slice(0, 60).map((a) => (
              <li key={a.name}>
                <button
                  onClick={() => save(artists.filter((x) => x !== a))}
                  title="Remove"
                  className={`rounded-[2px] px-2 py-1 text-[13px] font-semibold ${matches.some((e) => artistAt(e, [a])) ? 'bg-[var(--riso-yellow)]' : 'bg-bg-2'}`}
                >
                  {a.name} ×
                </button>
              </li>
            ))}
            {artists.length > 60 && <li className="px-2 py-1 text-[13px] text-mute">and {artists.length - 60} more</li>}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-[14px]">
            {matches.length > 0 && (
              <Link to="/explore?cat=music&when=all&mine=1" className="font-semibold underline underline-offset-2">
                See the {matches.length} {matches.length === 1 ? 'show' : 'shows'}
              </Link>
            )}
            <button className="text-mute underline" onClick={() => save([])}>
              Clear all
            </button>
          </div>
        </>
      )}
    </section>
  )
}
