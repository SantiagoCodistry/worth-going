// Favorites: artists, comedians, teams, museums and venues, and speakers you
// follow. Shows that involve one go to the top of For you. Typed in on Your
// taste, or read from Spotify (artists only).
import type { WGEvent } from '../shared/types.ts'

export type FavoriteKind = 'artist' | 'team' | 'venue' | 'person'

export interface Favorite {
  name: string
  kind: FavoriteKind
  /** Spotify genres, for a softer match on music you might like. */
  genres?: string[]
  from: 'spotify' | 'you'
}

export const KIND_LABEL: Record<FavoriteKind, string> = {
  artist: 'Artists and comedians',
  team: 'Teams',
  venue: 'Museums and venues',
  person: 'Speakers and people',
}

/** Teams with schedules on the site, for one-tap picks. */
export const TEAMS = [
  'New York Knicks', 'Brooklyn Nets', 'Philadelphia 76ers', 'New York Rangers', 'Philadelphia Flyers',
  'New York Yankees', 'New York Mets', 'Philadelphia Phillies', 'Philadelphia Eagles', 'Princeton Tigers',
]

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()

const words = (hay: string, needle: string) => needle.length >= 3 && (` ${hay} `).includes(` ${needle} `)

/** The favorite this event involves, if any. */
export function favoriteAt(e: WGEvent, favs: Favorite[]): Favorite | undefined {
  if (!favs.length) return undefined
  const title = norm(e.title)
  const people = (e.people ?? []).map((p) => norm(p.name))
  const venue = norm(e.venue.name)
  return favs.find((f) => {
    const n = norm(f.name)
    switch (f.kind) {
      case 'artist':
        // Spotify artists only count for shows; typed-in names count anywhere.
        if (f.from === 'spotify' && e.category !== 'music' && e.category !== 'comedy') return false
        return people.includes(n) || title === n || (n.length >= 5 && words(title, n))
      case 'team': {
        if (e.category !== 'sports') return false
        // "New York Knicks" also matches "Knicks"; "Princeton Tigers" matches "Princeton Tigers vs. …".
        const nick = n.split(' ').pop()!
        return words(title, n) || (nick.length >= 4 && words(title, nick))
      }
      case 'venue':
        return words(venue, n) || venue === n || words(title, n)
      case 'person':
        return people.includes(n) || words(title, n)
    }
  })
}

export function reasonFor(f: Favorite): string {
  if (f.from === 'spotify') return `You listen to ${f.name}`
  if (f.kind === 'team') return `Your team: ${f.name}`
  if (f.kind === 'venue') return `You follow ${f.name}`
  return `You like ${f.name}`
}

/** Genres you listen to most, for a softer boost. */
export function topGenres(favs: Favorite[], n = 12): string[] {
  const count = new Map<string, number>()
  for (const a of favs) for (const g of a.genres ?? []) count.set(g, (count.get(g) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g)
}
