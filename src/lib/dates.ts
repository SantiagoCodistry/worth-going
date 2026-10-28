import type { WGEvent } from '../shared/types.ts'
import { TIMEZONE } from '../shared/taxonomy.ts'
import { addDays, isDateOnly, nyDateKey, weekday } from '../shared/time.ts'

export type When = 'today' | 'weekend' | 'week' | 'month' | 'all'

export const WHEN_OPTIONS: { id: When; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'Next 7 days' },
  { id: 'month', label: 'Next 30 days' },
  { id: 'all', label: 'Everything' },
]

export const todayKey = () => nyDateKey(new Date())

/** Inclusive [from, to] date keys for a `When` filter, in New York time. */
export function whenRange(when: When, today = todayKey()): [string, string] {
  switch (when) {
    case 'today':
      return [today, today]
    case 'weekend': {
      const wd = weekday(today)
      if (wd === 6) return [today, addDays(today, 1)]
      if (wd === 0) return [today, today]
      return [addDays(today, 5 - wd), addDays(today, 7 - wd)]
    }
    case 'week':
      return [today, addDays(today, 6)]
    case 'month':
      return [today, addDays(today, 29)]
    default:
      return [today, addDays(today, 3650)]
  }
}

export const startKey = (e: WGEvent) => nyDateKey(e.start)
/** Open-ended exhibitions (no published closing date) are treated as ongoing. */
export const endKey = (e: WGEvent) => (e.end ? nyDateKey(e.end) : e.kind === 'exhibition' ? '9999-12-31' : startKey(e))

export function overlaps(e: WGEvent, [from, to]: [string, string]) {
  return startKey(e) <= to && endKey(e) >= from
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, ...opts })
const fmtUtc = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts })

/** Date objects for display. Date-only keys are formatted at UTC noon. */
function asDate(value: string): { d: Date; f: typeof fmt } {
  return isDateOnly(value) ? { d: new Date(value + 'T12:00:00Z'), f: fmtUtc } : { d: new Date(value), f: fmt }
}

export function dayParts(value: string) {
  const { d, f } = asDate(value)
  return {
    weekday: f({ weekday: 'short' }).format(d),
    weekdayLong: f({ weekday: 'long' }).format(d),
    day: f({ day: 'numeric' }).format(d),
    month: f({ month: 'short' }).format(d),
    monthLong: f({ month: 'long' }).format(d),
  }
}

export function timeLabel(e: WGEvent): string | null {
  if (e.timeTBA || isDateOnly(e.start)) return null
  return fmt({ hour: 'numeric', minute: '2-digit' })
    .format(new Date(e.start))
    .replace(':00', '')
    .replace(' AM', ' am')
    .replace(' PM', ' pm')
}

/** "Tonight", "Tomorrow", "Sat", or "Nov 14". */
export function relativeDay(value: string, today = todayKey()): string {
  const key = nyDateKey(value)
  if (key === today) return 'Today'
  if (key === addDays(today, 1)) return 'Tomorrow'
  const p = dayParts(value)
  if (key > today && key <= addDays(today, 6)) return p.weekdayLong
  return `${p.weekday}, ${p.month} ${p.day}`
}

export function whenLine(e: WGEvent, today = todayKey()): string {
  if (e.kind === 'exhibition') return exhibitionLine(e, today)
  const day = relativeDay(e.start, today)
  const t = timeLabel(e)
  const isTonight = day === 'Today' && t && /pm/.test(t) && parseInt(t) >= 5 && !t.startsWith('12')
  const label = isTonight ? 'Tonight' : day
  if (e.end && endKey(e) !== startKey(e)) {
    const ep = dayParts(e.end)
    return `${label} – ${ep.month} ${ep.day}`
  }
  return t ? `${label} · ${t}` : `${label} · Time TBA`
}

export function exhibitionLine(e: WGEvent, today = todayKey()): string {
  if (startKey(e) > today) {
    const p = dayParts(e.start)
    return `Opens ${p.month} ${p.day}`
  }
  if (!e.end) return 'On view now'
  const p = dayParts(e.end)
  return `On view through ${p.month} ${p.day}`
}

export function fullDate(e: WGEvent): string {
  const p = dayParts(e.start)
  let s = `${p.weekdayLong}, ${p.monthLong} ${p.day}`
  if (e.end && endKey(e) !== startKey(e)) {
    const q = dayParts(e.end)
    s += ` – ${q.weekdayLong}, ${q.monthLong} ${q.day}`
  }
  return s
}

export function mastheadDate(now = new Date()) {
  return fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)
}

/** Day of the year. */
export function issueNumber(today = todayKey()) {
  const [y] = today.split('-').map(Number)
  return Math.round((Date.parse(today) - Date.UTC(y, 0, 1)) / 86400000) + 1
}
