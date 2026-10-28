// Your taste: what you're into, where you're based, and when you're busy.
// Stored on this device only. The ranking in recommend.ts reads it.
import type { CityId, WGEvent } from '../shared/types.ts'
import { TIMEZONE } from '../shared/taxonomy.ts'

export type Level = 0 | 1 | 2 // not for me, sometimes, love it

export interface Interest {
  id: string
  label: string
  /** Does this event belong to the interest? */
  match: (e: WGEvent) => boolean
}

const has = (e: WGEvent, re: RegExp) => re.test(`${e.format ?? ''} ${e.tags.join(' ')} ${e.title}`)

export const INTERESTS: Interest[] = [
  { id: 'startups', label: 'Startups and founders', match: (e) => e.category === 'startups' },
  { id: 'talks', label: 'Big-name speakers and debates', match: (e) => e.category === 'ideas' },
  { id: 'comedy', label: 'Comedy', match: (e) => e.category === 'comedy' },
  { id: 'unusual', label: 'Odd one-off things', match: (e) => e.category === 'unusual' },
  { id: 'live', label: 'Rock, indie and rap shows', match: (e) => e.category === 'music' && !has(e, /classical|jazz|piano|violin|recital|orchestra|cabaret/i) },
  { id: 'jazz', label: 'Jazz', match: (e) => has(e, /jazz/i) },
  { id: 'classical', label: 'Classical music', match: (e) => has(e, /classical|piano|violin|recital|orchestra/i) },
  { id: 'art', label: 'Art and exhibitions', match: (e) => e.category === 'art' },
  { id: 'sports', label: 'Sports', match: (e) => e.category === 'sports' },
]

export interface BusyBlock {
  id: string
  label: string
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  from: string // "06:30"
  to: string // "08:00"
}

export interface Profile {
  home: CityId
  levels: Record<string, Level>
  busy: BusyBlock[]
  /** Prefer free and cheap things. */
  budget: 'any' | 'cheap'
}

/** Starting point, from what we know so far. Everything is editable on the Your taste page. */
export const DEFAULT_PROFILE: Profile = {
  home: 'princeton',
  levels: { startups: 2, talks: 2, comedy: 2, unusual: 2, live: 1, jazz: 1, classical: 0, art: 1, sports: 1 },
  busy: [],
  budget: 'any',
}

const fmtParts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>

/** Does a timed event start inside one of your busy blocks (or within 30 minutes after)? */
export function clashes(e: WGEvent, busy: BusyBlock[]): BusyBlock | undefined {
  if (e.kind === 'exhibition' || e.timeTBA || e.start.length === 10 || !busy.length) return undefined
  const parts = Object.fromEntries(fmtParts.formatToParts(new Date(e.start)).map((p) => [p.type, p.value]))
  const day = DAY[parts.weekday]
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  return busy.find((b) => b.days.includes(day) && minutes >= toMin(b.from) - 30 && minutes < toMin(b.to))
}

export interface Fit {
  score: number
  reasons: string[]
  clash?: BusyBlock
  hidden: boolean
}

/** How well an event fits this profile. */
export function fit(e: WGEvent, p: Profile): Fit {
  const matched = INTERESTS.filter((i) => i.match(e))
  const levels = matched.map((i) => p.levels[i.id] ?? 1)
  const best = levels.length ? Math.max(...levels) : 1
  const worst = levels.length ? Math.min(...levels) : 1
  let score = (e.score ?? 0) * (best === 2 ? 1.6 : best === 1 ? 1 : 0.25)
  const reasons = matched.filter((i) => p.levels[i.id] === 2).map((i) => i.label)
  if (e.city === p.home) {
    score += 10
    reasons.push(`In ${p.home === 'nyc' ? 'New York' : p.home === 'philly' ? 'Philadelphia' : 'Princeton'}`)
  }
  if (p.budget === 'cheap' && e.isFree) score += 10
  const clash = clashes(e, p.busy)
  if (clash) score -= 50
  return { score, reasons, clash, hidden: worst === 0 && best === 0 }
}
