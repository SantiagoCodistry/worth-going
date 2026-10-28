// Run with `npm test`. Uses Node's built-in test runner — no extra deps.
// Network-free: adapters are exercised against fixtures with a stubbed fetch.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { WGEvent } from '../src/shared/types.ts'
import { nyIso, nyDateKey } from '../src/shared/time.ts'
import { endKey, overlaps, whenRange } from '../src/lib/dates.ts'
import { googleCalendarUrl, icsFile } from '../src/lib/calendar.ts'
import { applyFilters } from '../src/lib/recommend.ts'
import { parseIcs } from '../ingest/lib/ics.ts'
import { categorize, isNoise } from '../ingest/lib/enrich.ts'
import { fromJsonLd, fromTribe } from '../ingest/adapters/feeds.ts'

const ev = (over: Partial<WGEvent>): WGEvent => ({
  id: 'x',
  title: 'Test',
  kind: 'event',
  city: 'nyc',
  category: 'music',
  tags: [],
  start: '2026-11-05T21:30:00.000Z',
  venue: { name: 'Somewhere' },
  description: '',
  sourceName: 'Test',
  sourceUrl: 'https://example.org',
  provenance: 'live',
  sourceId: 't',
  checkedAt: '2026-10-28T00:00:00Z',
  ...over,
})

test('New York local time converts across the DST change', () => {
  assert.equal(nyIso('2026-10-31 19:00'), '2026-10-31T23:00:00.000Z') // EDT
  assert.equal(nyIso('2026-11-05 16:30'), '2026-11-05T21:30:00.000Z') // EST
  assert.equal(nyIso('2026-11-05'), '2026-11-05')
  // 11:30 pm in New York is already the next day in UTC.
  assert.equal(nyDateKey('2026-11-06T04:30:00.000Z'), '2026-11-05')
})

test('date ranges: weekend from a Wednesday, today, and 30 days', () => {
  assert.deepEqual(whenRange('weekend', '2026-10-28'), ['2026-10-30', '2026-11-01'])
  assert.deepEqual(whenRange('weekend', '2026-10-31'), ['2026-10-31', '2026-11-01'])
  assert.deepEqual(whenRange('weekend', '2026-11-01'), ['2026-11-01', '2026-11-01'])
  assert.deepEqual(whenRange('week', '2026-10-28'), ['2026-10-28', '2026-11-03'])
  assert.deepEqual(whenRange('month', '2026-10-28'), ['2026-10-28', '2026-11-26'])
})

test('exhibitions overlap any range they span; open-ended ones stay on', () => {
  const show = ev({ kind: 'exhibition', start: '2026-10-10', end: '2027-01-31' })
  assert.ok(overlaps(show, ['2026-10-28', '2026-10-28']))
  assert.ok(!overlaps(show, ['2027-02-01', '2027-02-02']))
  assert.equal(endKey(ev({ kind: 'exhibition', start: '2026-10-04' })), '9999-12-31')
})

test('filters: city, category, free, keyword', () => {
  const list = [
    ev({ id: 'a', title: 'Jazz at the Vanguard', venue: { name: 'Village Vanguard' }, start: nyIso('2026-11-02 20:00') }),
    ev({ id: 'b', city: 'princeton', category: 'ideas', isFree: true, title: 'Public lecture', start: nyIso('2026-11-03 16:30') }),
  ]
  assert.deepEqual(applyFilters(list, { city: 'princeton' }).map((e) => e.id), ['b'])
  assert.deepEqual(applyFilters(list, { city: 'all', free: true }).map((e) => e.id), ['b'])
  assert.deepEqual(applyFilters(list, { city: 'all', q: 'vanguard' }).map((e) => e.id), ['a'])
  assert.deepEqual(applyFilters(list, { city: 'all', category: 'ideas' }).map((e) => e.id), ['b'])
})

test('Google Calendar link and .ics use correct times', () => {
  const e = ev({ title: 'Talk, with commas', start: nyIso('2026-11-05 16:30') })
  const url = new URL(googleCalendarUrl(e))
  assert.equal(url.searchParams.get('dates'), '20261105T213000Z/20261105T233000Z')
  const ics = icsFile(e)
  assert.match(ics, /DTSTART:20261105T213000Z/)
  assert.match(ics, /SUMMARY:Talk\\, with commas/)
  const allDay = icsFile(ev({ start: '2026-11-01', timeTBA: true }))
  assert.match(allDay, /DTSTART;VALUE=DATE:20261101/)
  assert.match(allDay, /DTEND;VALUE=DATE:20261102/)
})

test('ICS parser: folding, escapes, TZID, UTC and all-day', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:1',
    'SUMMARY:A very long title that is folded across',
    '  two lines\\, with a comma',
    'DTSTART;TZID=America/New_York:20261105T163000',
    'DTEND;TZID=America/New_York:20261105T180000',
    'LOCATION:McCosh 50\\, Princeton University',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:UTC one',
    'DTSTART:20261110T010000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:All day',
    'DTSTART;VALUE=DATE:20261121',
    'DTEND;VALUE=DATE:20261122',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const [a, b, c] = parseIcs(ics)
  assert.equal(a.summary, 'A very long title that is folded across two lines, with a comma')
  assert.equal(a.start, '2026-11-05T21:30:00.000Z')
  assert.equal(a.location, 'McCosh 50, Princeton University')
  assert.equal(b.start, '2026-11-10T01:00:00.000Z')
  assert.equal(c.start, '2026-11-21')
  assert.equal(c.allDay, true)
  assert.equal(c.end, undefined) // single-day: exclusive DTEND collapses
})

test('curation rules', () => {
  assert.equal(categorize('Founder pitch night with seed investors', '', 'ideas'), 'startups')
  assert.equal(categorize('Brad Mehldau Trio', '', 'ideas'), 'music')
  assert.equal(categorize('Book talk: author in conversation', '', 'music'), 'ideas')
  // Title wins over a description that mentions a band.
  assert.equal(categorize('Hometown Halloween Parade', 'with a marching band', 'ideas'), 'unusual')
  assert.equal(categorize('The Original Asbury Park Ghost Tours', 'a tour of', 'music'), 'unusual')
  const v = { name: 'Somewhere' }
  assert.ok(isNoise({ title: 'FPO: Jane Doe dissertation defense', description: '', venue: v }))
  assert.ok(isNoise({ title: 'Gratitude Yoga Class', description: '', venue: v }))
  assert.ok(isNoise({ title: 'Saucony x 212 Athletic Shakeout Run', description: '', venue: v }))
  assert.ok(!isNoise({ title: 'Public lecture on democracy', description: 'Open to all.', venue: v }))
})

const ctx = { from: new Date('2026-10-28T12:00:00Z'), to: new Date('2026-12-12T12:00:00Z') }
const defaults = { city: 'nyc' as const, category: 'music' as const, sourceName: 'Fixture', homepage: 'https://example.org' }

function stubFetch(body: string) {
  const orig = globalThis.fetch
  globalThis.fetch = (async () => new Response(body, { status: 200 })) as typeof fetch
  return () => (globalThis.fetch = orig)
}

test('JSON-LD adapter reads schema.org events from a venue page', async () => {
  const restore = stubFetch(`<html><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"MusicEvent","name":"Late set","startDate":"2026-11-07T22:30:00-05:00",
     "location":{"@type":"Place","name":"Smalls","address":{"streetAddress":"183 W 10th St","addressLocality":"New York"}},
     "offers":{"price":"25","url":"https://tickets.example"},"url":"https://example.org/late-set","image":["https://img.example/a.jpg"]},
     {"@type":"Event","name":"Long gone","startDate":"2025-01-01"}]}
  </script></html>`)
  try {
    const out = await fromJsonLd('https://example.org', defaults, ctx)
    assert.equal(out.length, 1)
    assert.equal(out[0].start, '2026-11-08T03:30:00.000Z')
    assert.equal(out[0].venue.name, 'Smalls')
    assert.equal(out[0].price, '$25')
    assert.equal(out[0].image?.url, 'https://img.example/a.jpg')
  } finally {
    restore()
  }
})

test('The Events Calendar adapter maps WordPress REST events', async () => {
  const restore = stubFetch(
    JSON.stringify({
      events: [
        {
          id: 42,
          title: 'Founders &amp; Funders Breakfast',
          description: '<p>Meet early-stage investors.</p>',
          url: 'https://example.org/e/42',
          all_day: false,
          start_date: '2026-11-12 08:30:00',
          end_date: '2026-11-12 10:00:00',
          utc_start_date: '2026-11-12 13:30:00',
          utc_end_date: '2026-11-12 15:00:00',
          cost: 'Free',
          image: false,
          venue: { venue: 'Columbia Startup Lab', address: '76 Ninth Ave', city: 'New York' },
          categories: [{ name: 'Networking' }],
        },
      ],
    }),
  )
  try {
    const [e] = await fromTribe('https://example.org', { ...defaults, category: 'ideas' }, ctx)
    assert.equal(e.title, 'Founders & Funders Breakfast')
    assert.equal(e.start, '2026-11-12T13:30:00Z')
    assert.equal(e.category, 'startups')
    assert.equal(e.isFree, true)
    assert.equal(e.venue.address, '76 Ninth Ave, New York')
  } finally {
    restore()
  }
})

import { clashes, fit, DEFAULT_PROFILE } from '../src/lib/profile.ts'
import { dimensions } from '../ingest/lib/media.ts'

test('busy blocks hide events that start during them', () => {
  const swim = { id: 's', label: 'Swim practice', days: [1, 2, 3, 4, 5], from: '06:00', to: '08:00' }
  const tue7am = ev({ start: nyIso('2026-11-10 07:00') })
  const tue730pm = ev({ start: nyIso('2026-11-10 19:30') })
  const sat7am = ev({ start: nyIso('2026-11-14 07:00') })
  assert.equal(clashes(tue7am, [swim])?.label, 'Swim practice')
  assert.equal(clashes(tue730pm, [swim]), undefined)
  assert.equal(clashes(sat7am, [swim]), undefined)
  assert.equal(clashes(ev({ start: '2026-11-10', timeTBA: true }), [swim]), undefined)
})

test('taste ranking boosts loved categories and the home city', () => {
  const comedy = ev({ category: 'comedy', score: 20, city: 'nyc' })
  const classical = ev({ category: 'music', tags: ['classical'], score: 20, city: 'nyc' })
  const local = ev({ category: 'comedy', score: 20, city: 'princeton' })
  const p = DEFAULT_PROFILE
  assert.ok(fit(comedy, p).score > fit(classical, p).score)
  assert.ok(fit(local, p).score > fit(comedy, p).score)
  assert.ok(fit(comedy, p).reasons.includes('Comedy'))
})

test('image size reader handles PNG and JPEG headers', () => {
  const png = new Uint8Array(24)
  png.set([0x89, 0x50, 0x4e, 0x47])
  new DataView(png.buffer).setUint32(16, 1200)
  new DataView(png.buffer).setUint32(20, 800)
  assert.deepEqual(dimensions(png), { w: 1200, h: 800 })
  // SOI, then a SOF0 segment: length 17, precision 8, height 600, width 900
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(dimensions(jpg), { w: 900, h: 600 })
})

test('account sync merges browser and account state without dropping anything', async () => {
  const { mergeState } = await import('../src/lib/account.ts')
  const m = mergeState(
    { saved: ['a', 'b'], profile: null, places: { x: { status: 'want' } } },
    { saved: ['b', 'c'], profile: { home: 'nyc', levels: {}, busy: [], budget: 'any' }, places: { y: { status: 'been', verdict: 'loved' } } },
  )
  assert.deepEqual(m.saved, ['a', 'b', 'c'])
  assert.equal(m.profile?.home, 'nyc')
  assert.deepEqual(Object.keys(m.places).sort(), ['x', 'y'])
})
