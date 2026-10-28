// Curation rules: classify, filter out noise, explain, and rank.
// Everything here is deterministic and auditable — no invented facts. The
// "why" lines only restate what the feed says plus well-established facts
// about the venue from VENUES below.
import type { CategoryId, WGEvent } from '../../src/shared/types.ts'

const RULES: [CategoryId, RegExp][] = [
  ['startups', /\b(startup|start-up|founder|venture|vc\b|pitch|accelerator|entrepreneur|demo day|fundrais|investor|angel|seed round|hackathon|tech meetup|networking)\b/i],
  ['comedy', /\b(comedy|comedian|stand-?up|improv|sketch)\b/i],
  ['sports', /\b(vs\.?|versus|game|match|football|basketball|hockey|baseball|soccer|lacrosse|regatta|marathon|tip-?off|kickoff)\b/i],
  ['music', /\b(concert|jazz|quartet|quintet|trio|orchestra|symphony|choir|chorus|recital|band|dj\b|live music|album|tour|opera|philharmonic|ensemble|songwriter)\b/i],
  ['art', /\b(exhibition|exhibit|gallery|museum|architecture|installation|opening reception|artist talk|curator|photograph|sculpture|dance|ballet|film screening|screening|theater|theatre)\b/i],
  ['ideas', /\b(lecture|talk|conversation|panel|reading|author|book launch|symposium|keynote|colloquium|in conversation|discussion|speaker|forum|debate)\b/i],
  ['unusual', /\b(parade|festival|night market|walking tour|tour of|ghost|observatory|stargazing|flea|fair|workshop|tasting|ball\b|haunted)\b/i],
]

export function categorize(text: string, fallback: CategoryId): CategoryId {
  for (const [cat, re] of RULES) if (re.test(text)) return cat
  return fallback
}

/** Listings we never surface: internal, administrative or online-only. */
const NOISE =
  /\b(dissertation|thesis defen[cs]e|fpo\b|office hours|deadline|cancel+ed|postponed|staff meeting|lab meeting|faculty meeting|orientation|registration|info(rmation)? session|training|webinar|zoom only|virtual only|online only|study break|blood drive|commencement rehearsal|members only|private event|closed to the public|internal)\b/i

export const isNoise = (e: Pick<WGEvent, 'title' | 'description'>) =>
  NOISE.test(e.title) || /\b(closed to the public|princeton (university )?id required|by invitation only)\b/i.test(e.description)

interface VenueNote {
  match: RegExp
  note: string
  weight: number
}

// Facts here should be common knowledge and easy to verify.
const VENUES: VenueNote[] = [
  { match: /village vanguard/i, weight: 25, note: 'The Village Vanguard has presented jazz since 1935. John Coltrane, Bill Evans and Sonny Rollins all recorded live albums there.' },
  { match: /smalls/i, weight: 15, note: 'Smalls is a small basement jazz club in the West Village with sets that run late.' },
  { match: /carnegie hall/i, weight: 20, note: 'Carnegie Hall opened in 1891 and is known for its acoustics.' },
  { match: /madison square garden|\bmsg\b/i, weight: 10, note: 'Madison Square Garden is home to the Knicks and the Rangers.' },
  { match: /mccosh/i, weight: 10, note: 'McCosh 50 is Princeton’s largest lecture hall.' },
  { match: /richardson auditorium|alexander hall/i, weight: 15, note: 'Richardson Auditorium, inside Alexander Hall, is a small hall well suited to chamber music.' },
  { match: /mccarter/i, weight: 12, note: 'McCarter Theatre Center is Princeton’s main performing arts venue.' },
  { match: /institute for advanced study|\bias\b/i, weight: 15, note: 'The Institute for Advanced Study, Einstein’s academic home, opens some of its lectures to the public.' },
  { match: /princeton university art museum/i, weight: 15, note: 'The Princeton University Art Museum opened its new building in October 2025. Admission is free.' },
  { match: /union transfer/i, weight: 10, note: 'Union Transfer is a mid-size music venue in a former train baggage depot.' },
  { match: /marian anderson hall|kimmel/i, weight: 12, note: 'Marian Anderson Hall is the home of the Philadelphia Orchestra.' },
  { match: /free library/i, weight: 10, note: 'The Free Library’s author events are usually inexpensive.' },
  { match: /92ny|92nd street y/i, weight: 15, note: '92NY has hosted writers, artists and public figures for generations.' },
  { match: /metropolitan museum|the met\b/i, weight: 15, note: 'New York State residents can pay what they wish for admission to The Met.' },
  { match: /philadelphia art museum|philadelphia museum of art/i, weight: 15, note: 'The Philadelphia Art Museum is at the top of the steps on the Benjamin Franklin Parkway.' },
  { match: /lincoln financial field/i, weight: 8, note: 'Lincoln Financial Field is home to the Eagles.' },
  { match: /princeton stadium|jadwin/i, weight: 6, note: 'Ivy League tickets are inexpensive and the seats are close to the action.' },
]

export function venueNote(text: string): VenueNote | undefined {
  return VENUES.find((v) => v.match.test(text))
}

/** Only facts: a note about the venue, and whether it is free. Empty when we have neither. */
export function whyFor(e: WGEvent): string {
  const parts: string[] = []
  if (e.isFree) parts.push(e.category === 'ideas' ? 'Free and open to the public.' : 'Free.')
  const v = venueNote(`${e.venue.name} ${e.venue.address ?? ''}`)
  if (v) parts.push(v.note)
  return parts.join(' ')
}

const CATEGORY_WEIGHT: Record<CategoryId, number> = {
  music: 12, ideas: 12, art: 10, startups: 10, unusual: 12, comedy: 12, sports: 6, dining: 0,
}

export function score(e: WGEvent): number {
  let s = CATEGORY_WEIGHT[e.category]
  if (e.pick) s += 40
  s += venueNote(`${e.venue.name} ${e.venue.address ?? ''}`)?.weight ?? 0
  if (e.isFree) s += 8
  if (e.image) s += 6
  if (e.description.length > 160) s += 4
  if (e.timeTBA) s -= 3
  if (e.kind === 'exhibition') s -= 4
  return s
}
