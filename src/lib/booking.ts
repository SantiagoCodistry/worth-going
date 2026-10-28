// Where and how to book a restaurant: the hand-checked entry first, then a link
// found on the restaurant's own site. Shared by the page and the edition build.
import type { Place } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'

const RESY_CITY: Record<string, string> = { nyc: 'new-york-ny', philly: 'philadelphia-pa', princeton: 'princeton-nj', nj: 'new-jersey' }

export function reservation(p: Place, found?: { platform: string; url: string }): { platform: string; url: string } | null {
  const b = p.book
  if (b && b.via !== 'Walk-in') {
    if (b.url) return { platform: b.via, url: b.url }
    if (found?.platform === b.via) return found
    if (b.via === 'Resy') return { platform: 'Resy', url: `https://resy.com/cities/${RESY_CITY[p.city]}/search?query=${encodeURIComponent(p.name)}` }
  }
  return b?.via === 'Walk-in' ? null : (found ?? null)
}

export const mapsUrl = (p: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address ?? `${p.neighborhood}, ${cityById(p.city).name}`}`)}`
