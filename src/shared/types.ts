// Data model shared by the web app and the ingestion pipeline (ingest/).
// Keep this file dependency-free so both runtimes can import it.

export type CityId = 'nyc' | 'philly' | 'princeton'
export type CityFilter = CityId | 'all'

export type CategoryId =
  | 'startups'
  | 'ideas'
  | 'music'
  | 'sports'
  | 'dining'
  | 'art'
  | 'unusual'
  | 'comedy'

/**
 * Where a listing came from.
 * - `live`: fetched automatically from a public feed by `npm run ingest`.
 * - `preview`: researched by hand for the launch preview. Real events with a
 *   real source link, but not re-verified automatically — always labelled.
 */
export type Provenance = 'live' | 'preview'

export interface Venue {
  name: string
  address?: string
  neighborhood?: string
}

/** Someone appearing at an event: a speaker, performer or host. */
export interface Person {
  name: string
  /** Who they are, in one plain line. */
  role: string
  /** English Wikipedia page title, used to fetch a portrait and link a bio. */
  wiki?: string
  image?: { url: string; credit?: string; link?: string }
}

export interface WGEvent {
  id: string
  title: string
  /** Performer line, speaker, matchup detail, etc. */
  subtitle?: string
  /** `exhibition` = runs over a date range rather than at one time. */
  kind: 'event' | 'exhibition'
  city: CityId
  category: CategoryId
  tags: string[]
  /**
   * ISO 8601 instant (`2026-11-05T21:30:00.000Z`) or a local date
   * (`2026-11-05`) when the source gives no time. All local dates are
   * interpreted in America/New_York — every city we cover shares it.
   */
  start: string
  end?: string
  /** True when the source publishes a date but no reliable time. */
  timeTBA?: boolean
  venue: Venue
  description: string
  /** Editorial "why it's worth going". */
  why?: string
  price?: string
  isFree?: boolean
  /** Who's on: speakers for talks, artists for shows, hosts and guests. */
  people?: Person[]
  image?: { url: string; credit?: string; link?: string }
  sourceName: string
  sourceUrl: string
  ticketUrl?: string
  provenance: Provenance
  sourceId: string
  /** When this record was fetched or last checked by hand. */
  checkedAt: string
  /** Caveats worth showing, e.g. sources disagree on the start time. */
  note?: string
  /** Hand-picked by the editors. */
  pick?: boolean
  /** Computed by ingest/lib/score.ts. Higher = more worth going. */
  score?: number
}

/** Restaurants are destinations, not scheduled events. */
export interface Place {
  id: string
  name: string
  city: CityId
  neighborhood: string
  address: string
  cuisine: string
  /** `$`–`$$$$`, a rough guide only. */
  price: string
  /** One line, set in the card. */
  dek: string
  why: string
  order?: string
  /** Practical notes: reservations, lines, cash. */
  know?: string
  website: string
  /** Good for: 'date', 'group', 'solo', 'late', 'cheap', 'parents' … */
  goodFor: string[]
}

export interface SourceStatus {
  id: string
  name: string
  city?: CityId | 'multi'
  kind: string
  homepage: string
  ok: boolean
  count: number
  error?: string
  ms: number
}

export interface Dataset {
  generatedAt: string
  events: WGEvent[]
  /** Restaurant id → photo from the restaurant’s own site. */
  placeImages?: Record<string, { url: string; credit?: string; link?: string }>
  sources: SourceStatus[]
}
