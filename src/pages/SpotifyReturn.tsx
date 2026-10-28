import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { finishSpotify } from '../lib/spotify.ts'
import { useStore } from '../lib/store.tsx'

/** Spotify sends you back here after you approve. */
export function SpotifyReturn() {
  const [params] = useSearchParams()
  const { profile, setProfile } = useStore()
  const nav = useNavigate()
  const [error, setError] = useState(params.get('error') ? 'You didn’t connect Spotify.' : '')
  const started = useRef(false)

  useEffect(() => {
    const code = params.get('code')
    if (!code || started.current) return
    started.current = true
    finishSpotify(code)
      .then((found) => {
        const typed = (profile.artists ?? []).filter((a) => a.from === 'you')
        setProfile({ ...profile, artists: [...typed, ...found.filter((f) => !typed.some((t) => t.name.toLowerCase() === f.name.toLowerCase()))] })
        nav('/you#music', { replace: true })
      })
      .catch((e: Error) => setError(e.message))
  }, [params, profile, setProfile, nav])

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      {error ? (
        <>
          <p className="text-[20px] font-bold">Spotify didn’t connect.</p>
          <p className="mt-3 text-ink-2">{error}</p>
          <Link to="/you" className="btn btn-quiet mt-6">
            Back to your taste
          </Link>
        </>
      ) : (
        <p className="text-[18px] font-semibold">Reading your artists from Spotify…</p>
      )}
    </div>
  )
}
