// Timezone helpers. "Local" maths happens in the event's city timezone
// (New York for most, Mexico City for CDMX), whatever the viewer's own is.
import { TIMEZONE } from './taxonomy.ts'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const isDateOnly = (s: string) => DATE_ONLY.test(s)

const partsFmts = new Map<string, Intl.DateTimeFormat>()
const partsFmt = (tz: string) => {
  let f = partsFmts.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    partsFmts.set(tz, f)
  }
  return f
}

function zoneParts(d: Date, tz = TIMEZONE) {
  const p: Record<string, number> = {}
  for (const { type, value } of partsFmt(tz).formatToParts(d)) {
    if (type !== 'literal') p[type] = Number(value)
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

/** Offset of a timezone from UTC at a given instant, in minutes (e.g. -240 for New York in summer). */
function offsetMinutes(d: Date, tz = TIMEZONE) {
  const p = zoneParts(d, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - d.getTime()) / 60000)
}

/** Wall-clock time in a timezone → UTC instant. Month is 1-based. */
export function zonedToUtc(tz: string, year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  let t = guess - offsetMinutes(new Date(guess), tz) * 60000
  // Second pass settles DST boundaries.
  t = guess - offsetMinutes(new Date(t), tz) * 60000
  return new Date(t)
}

/** New York wall-clock time → UTC instant. Month is 1-based. */
export function nyToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return zonedToUtc(TIMEZONE, year, month, day, hour, minute)
}

/** "2026-11-05 16:30" (New York) → ISO instant. */
export function nyIso(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (!m) throw new Error(`Bad local time: ${local}`)
  if (!m[4]) return `${m[1]}-${m[2]}-${m[3]}`
  return nyToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]).toISOString()
}

/** The calendar date (YYYY-MM-DD) of an instant or local date, in a timezone (New York by default). */
export function nyDateKey(value: string | Date, tz = TIMEZONE): string {
  if (typeof value === 'string' && isDateOnly(value)) return value
  const p = zoneParts(typeof value === 'string' ? new Date(value) : value, tz)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Shift a YYYY-MM-DD key by whole days. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD key. */
export function weekday(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Comparable timestamp; date-only values sort at New York midnight. */
export function sortTime(value: string): number {
  if (isDateOnly(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return nyToUtc(y, m, d).getTime()
  }
  return new Date(value).getTime()
}
