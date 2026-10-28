import { Link } from 'react-router-dom'
import type { Person, WGEvent } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'
import { dayParts, timeLabel, whenLine } from '../lib/dates.ts'
import { Cover, NOT_BILLED, Photo } from './Poster.tsx'
import { PreviewTag, SaveButton } from './bits.tsx'

export function DateChip({ e, className = '' }: { e: WGEvent; className?: string }) {
  const p = dayParts(e.start)
  const label = e.kind === 'exhibition' ? (e.end ? `Until ${dayParts(e.end).month} ${dayParts(e.end).day}` : 'On now') : `${p.weekday} ${p.month} ${p.day}`
  return (
    <span className={`inline-flex items-center rounded-full bg-bg/80 px-2.5 py-1 text-[12.5px] font-semibold backdrop-blur ${className}`}>
      {label}
    </span>
  )
}

/** "Fareed Zakaria, Patrick Deneen" — the line that tells you who's on. */
export function whoLine(people?: Person[]) {
  if (!people?.length) return null
  const billed = people.filter((p) => !NOT_BILLED.test(p.role))
  const names = (billed.length ? billed : people).map((p) => p.name)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ')
}

/** Photo card, used in rows and grids. */
export function EventCard({ e, className = '' }: { e: WGEvent; className?: string }) {
  const who = whoLine(e.people)
  const lead = e.people?.[0]
  return (
    <Link to={`/e/${e.id}`} className={`group block ${className}`}>
      <div className="relative">
        <Cover event={e} className="aspect-[4/5]" />
        <DateChip e={e} className="absolute left-3 top-3" />
        <SaveButton id={e.id} className="absolute right-3 top-3 h-8 w-8 justify-center rounded-full bg-bg/80 backdrop-blur" />
      </div>
      <div className="pt-3">
        <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">
          <span className="link-underline">{e.title}</span>
        </h3>
        {who && who !== e.title && <p className="mt-0.5 text-[14px] text-ink-2">{e.category === 'ideas' && lead && e.people!.length === 1 ? lead.role : `With ${who}`}</p>}
        <p className="mt-1 text-[14px] text-mute">
          {e.venue.name} · {cityById(e.city).short}
          {e.isFree && <span className="text-accent"> · Free</span>}
        </p>
        <PreviewTag e={e} className="mt-1.5" />
      </div>
    </Link>
  )
}

/** Compact row for the calendar. */
export function EventRow({ e, showDate = true }: { e: WGEvent; showDate?: boolean }) {
  const p = dayParts(e.start)
  const t = timeLabel(e)
  const who = whoLine(e.people)
  return (
    <Link to={`/e/${e.id}`} className="group grid grid-cols-[72px_1fr_auto] items-center gap-4 border-b rule py-3.5 md:grid-cols-[96px_1fr_auto] md:gap-5">
      <div className="relative aspect-square overflow-hidden rounded-md">
        <Cover event={e} size="sm" className="absolute inset-0 !rounded-md [&_.display]:text-[11px] [&_.display]:leading-tight [&_p]:hidden [&>div]:p-2" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-accent">
          {showDate && e.kind !== 'exhibition' ? `${p.weekday} ${p.month} ${p.day} · ` : ''}
          {e.kind === 'exhibition' ? whenLine(e) : (t ?? 'Time TBA')}
        </p>
        <h3 className="mt-0.5 truncate text-[16px] font-semibold md:text-[17px]">
          <span className="link-underline">{e.title}</span>
        </h3>
        <p className="mt-0.5 truncate text-[14px] text-mute">
          {who && who !== e.title ? `${who} · ` : ''}
          {e.venue.name}, {cityById(e.city).short}
          {e.isFree && <span className="text-accent"> · Free</span>}
        </p>
      </div>
      <SaveButton id={e.id} className="h-9 w-9 justify-center text-ink-2 hover:text-ink" />
    </Link>
  )
}

export function Avatar({ p, size = 56 }: { p: Person; size?: number }) {
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card text-[15px] font-semibold text-ink-2" style={{ width: size, height: size }}>
      {initials}
      {p.image && <Photo src={p.image.url} className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  )
}
