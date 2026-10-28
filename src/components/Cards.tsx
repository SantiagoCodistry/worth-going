import { Link } from 'react-router-dom'
import type { Person, WGEvent } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'
import { dayParts, timeLabel, whenLine } from '../lib/dates.ts'
import { Flyer, NOT_BILLED, Photo, hash } from './Poster.tsx'
import { PreviewTag, SaveButton } from './bits.tsx'

/** "Fareed Zakaria, Patrick Deneen": who's on. */
export function whoLine(people?: Person[]) {
  if (!people?.length) return null
  const billed = people.filter((p) => !NOT_BILLED.test(p.role))
  const names = (billed.length ? billed : people).map((p) => p.name)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} + ${names.length - 3} more` : names.join(', ')
}

/** One plain line under the flyer: what it is, or who the speaker is. */
function caption(e: WGEvent) {
  const names = e.people?.filter((p) => !NOT_BILLED.test(p.role)) ?? []
  if (e.category === 'ideas' && names.length === 1) return names[0].role
  return e.subtitle ?? (names.length ? `With ${whoLine(e.people)}` : null)
}

export function EventCard({ e, className = '' }: { e: WGEvent; className?: string }) {
  const cap = caption(e)
  return (
    <Link to={`/e/${e.id}`} className={`group block ${className}`}>
      <Flyer event={e} className="aspect-[3/4] transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]" />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold leading-snug">
            <span className="link-underline">{e.title}</span>
          </h3>
          {cap && <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{cap}</p>}
          <p className="mt-1 text-[13.5px] text-mute">
            {cityById(e.city).short}
            {e.price ? ` · ${e.price}` : e.isFree ? ' · Free' : ''}
          </p>
          <PreviewTag e={e} className="mt-1" />
        </div>
        <SaveButton id={e.id} className="-mr-1.5 h-8 w-8 shrink-0 justify-center text-ink-2 hover:text-ink" />
      </div>
    </Link>
  )
}

/** A line in the printed listings: date, what, who, where. */
export function EventRow({ e, showDate = true }: { e: WGEvent; showDate?: boolean }) {
  const p = dayParts(e.start)
  const t = timeLabel(e)
  const who = whoLine(e.people)
  return (
    <Link
      to={`/e/${e.id}`}
      className="group grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b-[1.5px] border-ink py-3 transition-colors hover:bg-[var(--riso-yellow)] md:grid-cols-[150px_64px_1fr_auto] md:gap-6 md:py-3.5"
    >
      <div className="hidden md:block">
        {showDate && e.kind !== 'exhibition' ? (
          <p className="stamp text-[13px]">
            {p.weekday} {p.day} {p.month}
          </p>
        ) : null}
        <p className="stamp mt-1 text-[13px] text-mute">{e.kind === 'exhibition' ? whenLine(e) : (t ?? 'Time TBA')}</p>
      </div>
      <Flyer event={e} compact className="aspect-square w-14 md:w-16" />
      <div className="min-w-0">
        <p className="stamp text-[12px] md:hidden">
          {e.kind === 'exhibition' ? whenLine(e) : `${p.weekday} ${p.day} ${p.month} · ${t ?? 'TBA'}`}
        </p>
        <h3 className="mt-0.5 truncate text-[16px] font-bold md:text-[18px]">{e.title}</h3>
        <p className="truncate text-[14px] text-ink-2">
          {who && who !== e.title ? `${who} · ` : ''}
          {e.venue.name}, {cityById(e.city).short}
          {e.isFree ? ' · Free' : ''}
        </p>
      </div>
      <SaveButton id={e.id} className="h-9 w-9 justify-center" />
    </Link>
  )
}

const AVATAR_INKS = ['var(--riso-yellow)', 'var(--riso-pink)', 'var(--riso-orange)']

export function Avatar({ p, size = 56 }: { p: Person; size?: number }) {
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className="flyer stamp relative inline-flex shrink-0 items-center justify-center rounded-full text-[14px]"
      style={{ width: size, height: size, background: AVATAR_INKS[Math.floor(hash(p.name) * AVATAR_INKS.length)] }}
    >
      {initials}
      {p.image && <Photo src={p.image.url} className="duotone absolute inset-0 h-full w-full object-cover" />}
    </span>
  )
}
