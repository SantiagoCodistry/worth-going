// Drafts next week's edition for an editor to finish: npm run draft -- 2026-11-05
//
// Lists the strongest upcoming listings per area for the Thursday-to-Wednesday
// week, with their ids, so picking ten is a matter of deleting lines and
// writing one sentence each. Writes editions/<date>.draft.ts (never the real
// edition file), so nothing is published until you rename it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Dataset, WGEvent } from '../src/shared/types.ts'
import { addDays, nyDateKey, sortTime, weekday } from '../src/shared/time.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(resolve(root, 'public/data/events.json'), 'utf8')) as Dataset

// Next Thursday unless a date is given.
let date = process.argv[2]
if (!date) {
  const today = nyDateKey(new Date())
  date = addDays(today, ((4 - weekday(today) + 7) % 7) || 7)
}
const end = addDays(date, 6)
const inWeek = (e: WGEvent) => {
  const s = nyDateKey(e.start)
  const last = e.end ? nyDateKey(e.end) : s
  return e.kind === 'exhibition' ? s <= end && last >= date : s >= date && s <= end
}
// Good candidates: a real time, a real venue, a link, and someone or something identifiable.
const solid = (e: WGEvent) =>
  !e.unconfirmed &&
  (e.kind === 'exhibition' || (!e.timeTBA && e.start.length > 10)) &&
  !/address shared|register|tba|online/i.test(e.venue.name) &&
  (e.provenance === 'preview' || e.people?.some((p) => p.wiki) || (e.score ?? 0) >= 30)

const lines: string[] = []
for (const city of ['nyc', 'princeton', 'philly'] as const) {
  const list = data.events
    .filter((e) => e.city === city && inWeek(e) && solid(e))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || sortTime(a.start) - sortTime(b.start))
    .slice(0, 25)
  lines.push(`    // ——— ${city}: ${list.length} candidates (delete what isn't worth going to) ———`)
  for (const e of list) {
    const who = e.people?.find((p) => p.wiki)
    lines.push(`    // ${nyDateKey(e.start)} ${e.title} @ ${e.venue.name}${who ? ` — ${who.role}` : ''}${e.image ? '' : ' (no photo: add wiki:)'}`)
    lines.push(`    { event: ${JSON.stringify(e.id)}, why: 'TODO: one sentence on why it’s worth going.' },`)
  }
}

const indexFile = resolve(root, 'public/data/editions/index.json')
const number = (existsSync(indexFile) ? (JSON.parse(readFileSync(indexFile, 'utf8'))[0]?.number ?? 0) : 0) + 1
const out = resolve(root, 'editions', `${date}.draft.ts`)
writeFileSync(
  out,
  `// DRAFT of edition ${number} (${date} – ${end}). Keep the best, write one sentence each,
// order them best first, then rename this file to ${date}.ts and run npm run edition.
import type { EditionSource } from '../src/shared/edition.ts'

const edition: EditionSource = {
  date: '${date}',
  number: ${number},
  picks: [
${lines.join('\n')}
  ],
  // Ten restaurant ids per area from src/data/places.ts, best first.
  places: {
    nyc: [],
    philly: [],
    princeton: [],
  },
}

export default edition
`,
)
console.log(`Wrote ${out}`)
