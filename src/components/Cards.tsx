import { Link } from 'react-router-dom'
import type { Person, WGEvent } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'
import { dayParts, timeLabel, whenLine } from '../lib/dates.ts'
import { Flyer, NOT_BILLED, Photo, formatOf, hash } from './Poster.tsx'
import { PreviewTag, SaveButton } from './bits.tsx'

/** "Fareed Zakaria, Patrick Deneen": who's on. */
export function whoLine(people?: Person[]) {
  if (!people?.length) return null
  const billed = people.filter((p) => !NOT_BILLED.test(p.role))
  const names = (billed.length ? billed : people).map((p) => p.name)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} + ${names.length - 3} more` : names.join(', ')
}

/** "Marc Maron: comedian; hosted WTF…" for the people who headline. */
function Billing({ e, max = 2 }: { e: WGEvent; max?: number }) {
  const billed = e.people?.filter((p) => !NOT_BILLED.test(p.role)) ?? []
  if (!billed.length) return e.subtitle ? <p className="mt-1 text-[14px] leading-snug text-ink-2">{e.subtitle}</p> : null
  return (
    <ul className="mt-1 space-y-1">
      {billed.slice(0, max).map((p) => (
        <li key={p.name} className="text-[14px] leading-snug text-ink-2">
          {p.name !== e.title && <span className="font-semibold text-ink">{p.name}: </span>}
          {p.role}
        </li>
      ))}
      {billed.length > max && <li className="text-[13.5px] text-mute">+ {billed.length - max} more</li>}
    </ul>
  )
}

export function EventCard({ e, className = '' }: { e: WGEvent; className?: string }) {
  return (
    <Link to={`/e/${e.id}`} className={`group block ${className}`}>
      <Flyer event={e} className="aspect-[3/4] transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]" />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label text-[11px] text-mute">{formatOf(e)}</p>
          <h3 className="mt-0.5 text-[16px] font-bold leading-snug">
            <span className="link-underline">{e.title}</span>
          </h3>
          <Billing e={e} />
          <p className="mt-1.5 text-[13.5px] text-mute">
            {e.venue.name}, {cityById(e.city).short}
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
  const billed = e.people?.filter((x) => !NOT_BILLED.test(x.role)) ?? []
  const lead = billed.length === 1 ? billed[0] : undefined
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
          <span className="font-semibold">{formatOf(e)}</span>
          {lead ? ` · ${lead.name === e.title ? '' : lead.name + ', '}${lead.role}` : who && who !== e.title ? ` · ${who}` : ''}
        </p>
        <p className="truncate text-[13.5px] text-mute">
          {e.venue.name}, {cityById(e.city).short}
          {e.price ? ` · ${e.price}` : e.isFree ? ' · Free' : ''}
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
