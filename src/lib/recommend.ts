// Ranking and selection. Today it uses only public signals (editorial
// score, timing, variety). It is shaped for the future private concierge:
// pass `busy` intervals from a calendar and `interests` from a profile, and
// the same function returns what realistically fits someone's week.
import type { CategoryId, CityFilter, WGEvent } from '../shared/types.ts'
import { sortTime } from '../shared/time.ts'
import { overlaps, type When, whenRange } from './dates.ts'

export interface Interval {
  start: string
  end: string
}

export interface RecommendationContext {
  city: CityFilter
  when?: When
  /** Future: weights per category from a personal profile. */
  interests?: Partial<Record<CategoryId, number>>
  /** Future: commitments from the user's calendar (classes, swim practice, meetings). */
  busy?: Interval[]
}

export interface Filters {
  city: CityFilter
  category?: CategoryId | 'all'
  when?: When
  q?: string
  free?: boolean
}

export function applyFilters(events: WGEvent[], f: Filters): WGEvent[] {
  const range = whenRange(f.when ?? 'all')
  const q = f.q?.trim().toLowerCase()
  return events.filter((e) => {
    if (f.city !== 'all' && e.city !== f.city) return false
    if (f.category && f.category !== 'all' && e.category !== f.category) return false
    if (f.free && !e.isFree) return false
    if (!overlaps(e, range)) return false
    if (q) {
      const hay = `${e.title} ${e.subtitle ?? ''} ${e.venue.name} ${e.venue.neighborhood ?? ''} ${e.description} ${e.tags.join(' ')}`.toLowerCase()
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })
}

function conflicts(e: WGEvent, busy: Interval[] = []) {
  if (e.kind === 'exhibition' || e.timeTBA) return false
  const s = sortTime(e.start)
  const end = e.end ? sortTime(e.end) : s + 2 * 3600000
  return busy.some((b) => sortTime(b.start) < end && sortTime(b.end) > s)
}

export function rank(events: WGEvent[], ctx: RecommendationContext): WGEvent[] {
  const now = Date.now()
  return applyFilters(events, { city: ctx.city, when: ctx.when })
    .filter((e) => !conflicts(e, ctx.busy))
    .map((e) => {
      const days = Math.max(0, (sortTime(e.start) - now) / 86400000)
      // Sooner is better, gently — a great show in ten days still beats a dull one tonight.
      const soon = e.kind === 'exhibition' ? 0 : Math.max(0, 10 - days)
      const interest = (ctx.interests?.[e.category] ?? 1) * (e.score ?? 0)
      return { e, s: interest + soon }
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e)
}

/** Top picks with variety: at most `perCategory` from any one category. */
export function diversePicks(ranked: WGEvent[], n: number, perCategory = 2): WGEvent[] {
  const out: WGEvent[] = []
  const counts = new Map<CategoryId, number>()
  for (const e of ranked) {
    const c = counts.get(e.category) ?? 0
    if (c >= perCategory) continue
    out.push(e)
    counts.set(e.category, c + 1)
    if (out.length === n) break
  }
  // Top up if variety rules left gaps.
  for (const e of ranked) {
    if (out.length >= n) break
    if (!out.includes(e)) out.push(e)
  }
  return out
}
