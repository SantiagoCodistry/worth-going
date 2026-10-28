// Minimal RFC 5545 reader: enough for public event calendars.
// Handles line folding, escaped text, TZID / UTC / floating / all-day dates.
// Recurring rules are not expanded — public event feeds almost always list
// each occurrence as its own VEVENT.
import { nyToUtc } from '../../src/shared/time.ts'

export interface IcsEvent {
  uid?: string
  summary: string
  description?: string
  location?: string
  url?: string
  start: string
  end?: string
  allDay: boolean
  categories: string[]
  image?: string
  geo?: { lat: number; lng: number }
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

const unescape = (v: string) =>
  v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim()

/** Parse an ICS date value. Non-UTC, non-date values are treated as New York time. */
function parseDate(value: string, params: string): { iso: string; allDay: boolean } {
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(value)) {
    return { iso: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, allDay: true }
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if (!m) throw new Error(`Unrecognised ICS date ${value}`)
  const [, y, mo, d, h, mi, s = '00', z] = m
  if (z) return { iso: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString(), allDay: false }
  const tz = params.match(/TZID=([^;:]+)/i)?.[1]
  if (tz && !/New_York|Eastern/i.test(tz)) {
    // Uncommon for our cities; fall back to interpreting via Intl.
    const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi)
    const offset = tzOffsetMinutes(tz, new Date(asUtc))
    return { iso: new Date(asUtc - offset * 60000).toISOString(), allDay: false }
  }
  return { iso: nyToUtc(+y, +mo, +d, +h, +mi).toISOString(), allDay: false }
}

function tzOffsetMinutes(tz: string, d: Date): number {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    const name = f.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/)
    if (!m) return 0
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0))
  } catch {
    return 0
  }
}

export function parseIcs(text: string): IcsEvent[] {
  const out: IcsEvent[] = []
  let cur: Record<string, { v: string; p: string }[]> | null = null
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') cur = {}
    else if (line === 'END:VEVENT' && cur) {
      try {
        const first = (k: string) => cur![k]?.[0]
        const dtstart = first('DTSTART')
        const summary = first('SUMMARY')
        if (dtstart && summary) {
          const s = parseDate(dtstart.v, dtstart.p)
          const dtend = first('DTEND')
          let end = dtend ? parseDate(dtend.v, dtend.p).iso : undefined
          // All-day DTEND is exclusive in ICS; store the inclusive last day.
          if (end && s.allDay) {
            const d = new Date(end + 'T00:00:00Z')
            d.setUTCDate(d.getUTCDate() - 1)
            end = d.toISOString().slice(0, 10)
            if (end === s.iso) end = undefined
          }
          const attach = cur['ATTACH']?.find((a) => /image|\.(jpe?g|png|webp)/i.test(a.p + a.v))?.v
          out.push({
            uid: first('UID')?.v,
            summary: unescape(summary.v),
            description: first('DESCRIPTION') ? unescape(first('DESCRIPTION')!.v) : undefined,
            location: first('LOCATION') ? unescape(first('LOCATION')!.v) : undefined,
            url: first('URL')?.v,
            start: s.iso,
            end,
            allDay: s.allDay,
            categories: (cur['CATEGORIES'] ?? []).flatMap((c) => unescape(c.v).split(',')).map((c) => c.trim()),
            image: attach ?? first('X-WP-IMAGE-URL')?.v,
            geo: parseGeo(first('GEO')?.v),
          })
        }
      } catch {
        // Skip malformed entries rather than failing the whole feed.
      }
      cur = null
    } else if (cur) {
      const idx = line.indexOf(':')
      if (idx < 0) continue
      const [name, ...params] = line.slice(0, idx).split(';')
      ;(cur[name.toUpperCase()] ??= []).push({ v: line.slice(idx + 1), p: params.join(';') })
    }
  }
  return out
}

/** GEO:lat;lng */
function parseGeo(v?: string): { lat: number; lng: number } | undefined {
  const [lat, lng] = (v ?? '').split(/[;,]/).map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { lat, lng } : undefined
}
