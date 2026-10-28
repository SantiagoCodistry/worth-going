import type { CategoryId, CityId, WGEvent } from '../../src/shared/types.ts'

/** What every adapter receives: a window of dates to cover. */
export interface FetchContext {
  /** ISO instant — now. */
  from: Date
  /** ISO instant — end of the window (default: 45 days out). */
  to: Date
}

/** Adapters return events missing only the fields the runner fills in. */
export type Draft = Omit<WGEvent, 'score' | 'why' | 'checkedAt' | 'provenance' | 'sourceId'> & { why?: string }

export interface Source {
  id: string
  name: string
  /** Human-facing page for the source — shown on the Sources page. */
  homepage: string
  city: CityId | 'multi'
  kind: 'ics' | 'tribe' | 'jsonld' | 'luma' | 'mlb' | 'nhl' | 'nba' | 'espn' | 'ticketmaster'
  /** Category to use when keyword rules don't match. */
  category: CategoryId
  enabled?: boolean
  fetch(ctx: FetchContext): Promise<Draft[]>
}
