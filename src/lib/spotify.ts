// Spotify, read-only: your top and followed artists, used to pick concerts.
// Browser-only OAuth with PKCE, so no server and no client secret. The access
// token is used once to read artists and then thrown away; only artist names
// and genres are kept (in your taste profile).
// Turned on by VITE_SPOTIFY_CLIENT_ID at build time (see README → Spotify).
/// <reference types="vite/client" />
import type { Favorite } from './favorites.ts'
import { appUrl } from './share.ts'

const CLIENT_ID = import.meta.env?.VITE_SPOTIFY_CLIENT_ID as string | undefined
export const spotifyEnabled = !!CLIENT_ID
const SCOPES = 'user-top-read user-follow-read'
const VERIFIER = 'wg.spotify.verifier'


const redirectUri = () => appUrl('spotify')

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function connectSpotify() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)))
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  sessionStorage.setItem(VERIFIER, verifier)
  const q = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${q}`)
}

/** Finish sign-in on the /spotify page and read your artists. */
export async function finishSpotify(code: string): Promise<Favorite[]> {
  const verifier = sessionStorage.getItem(VERIFIER)
  if (!verifier) throw new Error('The sign-in started in another tab or expired. Try again.')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: CLIENT_ID!, code_verifier: verifier }),
  })
  sessionStorage.removeItem(VERIFIER)
  if (!res.ok) throw new Error(`Spotify said no (${res.status}).`)
  const { access_token: token } = (await res.json()) as { access_token: string }
  const get = async <T,>(path: string): Promise<T> => {
    const r = await fetch(`https://api.spotify.com/v1/${path}`, { headers: { authorization: `Bearer ${token}` } })
    if (r.status === 403) throw new Error('This Spotify account isn’t on the app’s allowed list yet.')
    if (!r.ok) throw new Error(`Couldn’t read your artists (${r.status}).`)
    return r.json() as Promise<T>
  }
  type A = { name: string; genres: string[] }
  const [medium, long, short, followed] = await Promise.all([
    get<{ items: A[] }>('me/top/artists?limit=50&time_range=medium_term'),
    get<{ items: A[] }>('me/top/artists?limit=50&time_range=long_term'),
    get<{ items: A[] }>('me/top/artists?limit=30&time_range=short_term'),
    get<{ artists: { items: A[] } }>('me/following?type=artist&limit=50'),
  ])
  const seen = new Map<string, Favorite>()
  for (const a of [...short.items, ...medium.items, ...long.items, ...followed.artists.items])
    if (!seen.has(a.name.toLowerCase())) seen.set(a.name.toLowerCase(), { name: a.name, kind: 'artist', genres: a.genres.slice(0, 4), from: 'spotify' })
  return [...seen.values()].slice(0, 150)
}
