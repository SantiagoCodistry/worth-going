// Timezone helpers. Every city we cover is in America/New_York, so all
// "local" maths happens there regardless of the viewer's own timezone.
import { TIMEZONE } from './taxonomy.ts'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const isDateOnly = (s: string) => DATE_ONLY.test(s)

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function nyParts(d: Date) {
  const p: Record<string, number> = {}
  for (const { type, value } of partsFmt.formatToParts(d)) {
    if (type !== 'literal') p[type] = Number(value)
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

/** Offset of New York from UTC at a given instant, in minutes (e.g. -240). */
function nyOffsetMinutes(d: Date) {
  const p = nyParts(d)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - d.getTime()) / 60000)
}

/** New York wall-clock time → UTC instant. Month is 1-based. */
export function nyToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  let t = guess - nyOffsetMinutes(new Date(guess)) * 60000
  // Second pass settles DST boundaries.
  t = guess - nyOffsetMinutes(new Date(t)) * 60000
  return new Date(t)
}

/** "2026-11-05 16:30" (New York) → ISO instant. */
export function nyIso(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (!m) throw new Error(`Bad local time: ${local}`)
  if (!m[4]) return `${m[1]}-${m[2]}-${m[3]}`
  return nyToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]).toISOString()
}

/** The New York calendar date (YYYY-MM-DD) of an instant or local date. */
export function nyDateKey(value: string | Date): string {
  if (typeof value === 'string' && isDateOnly(value)) return value
  const p = nyParts(typeof value === 'string' ? new Date(value) : value)
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
