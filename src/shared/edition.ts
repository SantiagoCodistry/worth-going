// A weekly edition: the ten things worth leaving the house for, chosen by hand.
//
// Editors write a small source file per week (editions/YYYY-MM-DD.ts). The
// build step (npm run edition) fills in verified details and photos from the
// listings data and freezes the result in public/data/editions/, so past
// editions keep working after their events drop out of the live feeds.
import type { CategoryId, CityId, Person, Venue } from './types.ts'

/** The three areas the edition covers. */
export type EditionCity = Extract<CityId, 'princeton' | 'nyc' | 'philly'>

/** What an editor writes. */
export type PickSource =
  | {
      /** An id from public/data/events.json (a live feed or a hand-researched listing). */
      event: string
      /** One sentence: why it's worth going. */
      why: string
      /** Optional corrections from the editor's own check. */
      title?: string
      /** A specific label, e.g. "Fado concert" instead of "Music". */
      kind?: string
      link?: string
      price?: string
      city?: EditionCity
      /** A Wikipedia page whose photo to use when the listing has none. */
      wiki?: string
    }
  | ({ event?: undefined } & Pick)

export interface EditionSource {
  /** The Thursday it comes out, YYYY-MM-DD. */
  date: string
  number: number
  /** Ordered best first. The top ten overall, and per city, come from this pool. */
  picks: PickSource[]
  /** Ten restaurant ids (src/data/places.ts) per area, best first. */
  places: Record<EditionCity, string[]>
}

/** What the page shows (frozen at build time). */
export interface Pick {
  id: string
  city: EditionCity
  category: CategoryId
  /** "Stand-up comedy", "Art exhibition" … */
  kind: string
  title: string
  why: string
  /** ISO instant or YYYY-MM-DD. */
  start: string
  end?: string
  timeTBA?: boolean
  exhibition?: boolean
  venue: Venue
  price?: string
  isFree?: boolean
  /** The original page: tickets, registration or the organizer's listing. */
  link: string
  sourceName: string
  people?: Person[]
  image?: { url: string; credit?: string; link?: string; w?: number; h?: number }
}

export interface PlacePick {
  id: string
  city: EditionCity
  name: string
  neighborhood: string
  cuisine: string
  price: string
  why: string
  order?: string
  address?: string
  book?: { via: string; url: string }
  map: string
  image?: { url: string; credit?: string; link?: string }
}

export interface Edition {
  date: string
  number: number
  /** Thursday to the following Wednesday, inclusive. */
  weekOf: [string, string]
  picks: Pick[]
  places: PlacePick[]
  builtAt: string
}

export interface EditionIndexEntry {
  date: string
  number: number
  weekOf: [string, string]
  /** Titles of the overall top three, for the archive list. */
  top: string[]
}
