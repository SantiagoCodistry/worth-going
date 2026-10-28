// "Add to calendar" without any account: a Google Calendar template link and
// a standards-compliant .ics download (Apple Calendar, Outlook, etc.).
import type { WGEvent } from '../shared/types.ts'
import { addDays, isDateOnly, nyDateKey } from '../shared/time.ts'

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const compact = (key: string) => key.replace(/-/g, '')

/** Start/end in ICS/Google format. Timed events default to two hours. */
function span(e: WGEvent): { allDay: boolean; start: string; end: string } {
  if (e.timeTBA || isDateOnly(e.start) || e.kind === 'exhibition') {
    const s = nyDateKey(e.start)
    // For exhibitions, put a single day on the calendar — today's visit.
    const last = e.kind === 'exhibition' ? s : e.end ? nyDateKey(e.end) : s
    return { allDay: true, start: compact(s), end: compact(addDays(last, 1)) }
  }
  const end = e.end && !isDateOnly(e.end) ? e.end : new Date(new Date(e.start).getTime() + 2 * 3600000).toISOString()
  return { allDay: false, start: stamp(e.start), end: stamp(end) }
}

const where = (e: WGEvent) => [e.venue.name, e.venue.address].filter(Boolean).join(', ')
const details = (e: WGEvent) =>
  [e.why, e.description, e.note ? `Note: ${e.note}` : '', `Source: ${e.sourceUrl}`].filter(Boolean).join('\n\n')

export function googleCalendarUrl(e: WGEvent): string {
  const s = span(e)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${s.start}/${s.end}`,
    details: details(e),
    location: where(e),
    ctz: 'America/New_York',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

/** Fold lines at 75 octets as RFC 5545 requires. */
const fold = (line: string) => line.match(/.{1,73}/g)!.join('\r\n ')

export function icsFile(e: WGEvent): string {
  const s = span(e)
  const dt = (k: 'DTSTART' | 'DTEND', v: string) => (s.allDay ? `${k};VALUE=DATE:${v}` : `${k}:${v}`)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Worth Going//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@worthgoing`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    dt('DTSTART', s.start),
    dt('DTEND', s.end),
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(where(e))}`,
    `DESCRIPTION:${esc(details(e))}`,
    `URL:${e.sourceUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n')
}

export function downloadIcs(e: WGEvent) {
  const blob = new Blob([icsFile(e)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${e.id.slice(0, 60)}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
