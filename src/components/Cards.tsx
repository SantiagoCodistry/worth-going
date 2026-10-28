import { Link } from 'react-router-dom'
import type { Person, WGEvent } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'
import { timeLabel, whenLine } from '../lib/dates.ts'
import { Cover, Photo, Thumb, billed, dateStamp, formatOf, hash, summaryOf } from './Poster.tsx'
import { PreviewTag, SaveButton } from './bits.tsx'

/** "Fareed Zakaria, Patrick Deneen": who's on. */
export function whoLine(people?: Person[]) {
  if (!people?.length) return null
  const names = people.map((p) => p.name)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} + ${names.length - 3} more` : names.join(', ')
}

/** The line that tells you who's on and who they are. */
export function Who({ e, className = '' }: { e: WGEvent; className?: string }) {
  const b = billed(e)
  if (!b.length) return null
  if (b.length === 1) {
    const p = b[0]
    return (
      <p className={`text-[14px] leading-snug text-ink-2 ${className}`}>
        {p.name !== e.title && <span className="font-semibold text-ink">{p.name}</span>}
        {p.name !== e.title && ' · '}
        {p.role}
      </p>
    )
  }
  return (
    <p className={`text-[14px] leading-snug text-ink-2 ${className}`}>
      <span className="font-semibold text-ink">With </span>
      {whoLine(b)}
    </p>
  )
}

export function Reasons({ reasons, className = '' }: { reasons?: string[]; className?: string }) {
  if (!reasons?.length) return null
  return (
    <p className={`flex flex-wrap gap-1 ${className}`}>
      {reasons.slice(0, 2).map((r) => (
        <span key={r} className="rounded-[2px] bg-[var(--riso-yellow)] px-1.5 py-0.5 text-[11.5px] font-semibold text-ink">
          {r}
        </span>
      ))}
    </p>
  )
}

export function EventCard({ e, reasons, className = '' }: { e: WGEvent; reasons?: string[]; className?: string }) {
  return (
    <Link to={`/e/${e.id}`} className={`group block ${className}`}>
      <div className="relative">
        <Cover e={e} className="aspect-[4/3] rounded-[3px]" />
        <span className="stamp absolute left-2 top-2 rounded-[2px] bg-bg px-2 py-1 text-[11px]">{dateStamp(e)}</span>
        <SaveButton id={e.id} className="absolute right-2 top-2 h-8 w-8 justify-center rounded-full bg-bg/90" />
      </div>
      <div className="pt-3">
        <p className="label text-[11px] text-mute">
          {formatOf(e)} · {cityById(e.city).short}
        </p>
        <h3 className="mt-1 text-[17px] font-bold leading-snug">
          <span className="link-underline">{e.title}</span>
        </h3>
        <Who e={e} className="mt-1" />
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-ink-2">{summaryOf(e)}</p>
        <p className="mt-1.5 text-[13px] text-mute">
          {e.venue.name}
          {e.price ? ` · ${e.price}` : e.isFree ? ' · Free' : ''}
        </p>
        <Reasons reasons={reasons} className="mt-2" />
        <PreviewTag e={e} className="mt-1.5" />
      </div>
    </Link>
  )
}

/** A line in a list: thumbnail, what, who, when, where. */
export function EventRow({ e, showDate = true }: { e: WGEvent; showDate?: boolean }) {
  const t = timeLabel(e)
  return (
    <Link
      to={`/e/${e.id}`}
      className="group grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-rule py-3 transition-colors hover:bg-bg-2 md:grid-cols-[80px_1fr_auto] md:gap-5"
    >
      <Thumb e={e} className="aspect-square w-16 rounded-[3px] md:w-20" />
      <div className="min-w-0">
        <p className="label text-[11px] text-mute">
          {showDate ? dateStamp(e) : e.kind === 'exhibition' ? whenLine(e) : (t ?? 'Time TBA')} · {formatOf(e)}
        </p>
        <h3 className="mt-0.5 truncate text-[16px] font-bold md:text-[17px]">{e.title}</h3>
        <Who e={e} className="truncate" />
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
      className="stamp relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px]"
      style={{ width: size, height: size, background: AVATAR_INKS[Math.floor(hash(p.name) * AVATAR_INKS.length)] }}
    >
      {initials}
      {p.image && <Photo src={p.image.url} className="absolute inset-0 h-full w-full object-cover object-top" />}
    </span>
  )
}
