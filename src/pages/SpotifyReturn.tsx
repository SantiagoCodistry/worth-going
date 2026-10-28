// Spotify sends you back here after you approve read-only access.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { finishSpotify } from '../lib/spotify.ts'
import { usePrefs } from '../lib/prefs.tsx'
import { Masthead } from '../components/Sheet.tsx'

export function SpotifyReturn() {
  const [params] = useSearchParams()
  const { taste, setTaste } = usePrefs()
  const nav = useNavigate()
  const [error, setError] = useState(params.get('error') ? 'You didn’t connect Spotify.' : '')
  const started = useRef(false)

  useEffect(() => {
    const code = params.get('code')
    if (!code || started.current) return
    started.current = true
    finishSpotify(code)
      .then((artists) => {
        setTaste({ ...taste, artists })
        nav('/', { replace: true })
      })
      .catch((e: Error) => setError(e.message))
  }, [params, taste, setTaste, nav])

  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        {error ? (
          <>
            <p className="display text-[44px]">Spotify didn’t connect.</p>
            <p className="mt-3 text-ink-2">{error}</p>
            <Link to="/" className="btn mt-6">
              Back to this week
            </Link>
          </>
        ) : (
          <p className="stamp text-[13px]">Reading your artists…</p>
        )}
      </div>
    </>
  )
}
