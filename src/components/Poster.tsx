// Flyers. Every listing is set like a risograph gig poster: one or two
// fluorescent inks on paper, the names on the bill in condensed type, a
// stamped date, and the event photo printed as a duotone. Photos come from
// the event's own page or Wikipedia (see ingest/lib/media.ts); without one,
// a halftone shape takes the photo's place.
import { useState } from 'react'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { dayParts, timeLabel } from '../lib/dates.ts'
import { categoryById } from '../shared/taxonomy.ts'

/** Roles that support rather than headline: "…, co-host", "Fidelity, moderator". */
export const NOT_BILLED = /moderator$|(^|,\s*)(co-)?host$/i

/** "Stand-up comedy", "Book talk": what kind of thing this is. */
export function formatOf(e: WGEvent): string {
  return e.format ?? categoryById(e.category).label
}

/** The names that sell the event. */
export function headliners(e: WGEvent): string[] {
  const billed = e.people?.filter((p) => !NOT_BILLED.test(p.role)).map((p) => p.name) ?? []
  return billed.length ? billed.slice(0, 3) : [e.title]
}

type Ink = { bg: string; ink: string; type: string; dark: boolean }
const I = (bg: string, ink: string, dark = false): Ink => ({
  bg: `var(--riso-${bg})`,
  ink: `var(--riso-${ink})`,
  type: dark ? 'var(--bg)' : 'var(--riso-black)',
  dark,
})

// Ink pairs per category: paper colour + second ink.
const INKS: Record<CategoryId, Ink[]> = {
  unusual: [I('pink', 'blue'), I('orange', 'federal'), I('yellow', 'pink'), I('green', 'pink', true)],
  comedy: [I('orange', 'pink'), I('pink', 'yellow'), I('yellow', 'orange')],
  ideas: [I('yellow', 'blue'), I('federal', 'pink', true), I('teal', 'yellow', true), I('orange', 'blue'), I('pink', 'federal')],
  music: [I('blue', 'pink', true), I('pink', 'federal'), I('orange', 'blue'), I('federal', 'yellow', true), I('green', 'yellow', true)],
  startups: [I('green', 'yellow', true), I('yellow', 'green'), I('federal', 'orange', true)],
  art: [I('orange', 'teal'), I('teal', 'yellow', true), I('pink', 'teal'), I('yellow', 'orange')],
  sports: [I('green', 'pink', true), I('blue', 'yellow', true)],
  dining: [I('orange', 'pink'), I('yellow', 'orange'), I('pink', 'orange')],
}

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

export const inkFor = (category: CategoryId, seed: string) => {
  const list = INKS[category]
  return list[Math.floor(hash(seed) * list.length)]
}

export function Photo({ src, alt = '', className = '', onFail }: { src?: string; alt?: string; className?: string; onFail?: () => void }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setOk(false)
        onFail?.()
      }}
      className={className}
    />
  )
}

/** Halftone stand-in for a photo: a circle, half-moon or slab, varied per event. */
function Halftone({ seed, color }: { seed: string; color: string }) {
  const r = hash(seed + 'shape')
  const shape =
    r < 0.34 ? 'rounded-full aspect-square h-full max-w-full' : r < 0.67 ? 'rounded-t-full h-full w-[85%] self-end' : 'h-[70%] w-full self-center -rotate-6'
  return (
    <div className="ink flex h-full w-full items-end justify-center" style={{ color }}>
      <div className={`halftone ${shape}`} />
    </div>
  )
}

/** Font size in container units so the longest word fits the flyer width. */
function fit(lines: string[], max: number) {
  const longest = Math.max(...lines.flatMap((l) => l.split(/\s+/)).map((w) => w.length), 4)
  return Math.min(max, 170 / longest)
}

export function Flyer({ event: e, className = '', compact = false }: { event: WGEvent; className?: string; compact?: boolean }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const ink = inkFor(e.category, e.id)
  const names = headliners(e)
  const billed = e.people?.filter((x) => !NOT_BILLED.test(x.role)) ?? []
  const lead = billed.length === 1 ? billed[0] : undefined
  const p = dayParts(e.start)
  const t = timeLabel(e)
  const hasPhoto = !!e.image && !photoFailed
  const size = fit(names, names.length > 1 ? 15 : 19)

  const date =
    e.kind === 'exhibition'
      ? e.end
        ? `Until ${dayParts(e.end).month} ${dayParts(e.end).day}`
        : 'On now'
      : `${p.weekday} ${p.day} ${p.month}`

  if (compact) {
    return (
      <div className={`flyer ${className}`} style={{ background: ink.bg, color: ink.type }}>
        {hasPhoto && <Photo src={e.image!.url} onFail={() => setPhotoFailed(true)} className="duotone absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 flex flex-col justify-between p-[10cqw]">
          <span className="stamp relative text-[30cqw] leading-[0.9]">{e.kind === 'exhibition' ? 'On' : p.day}</span>
          <span className="stamp relative text-[18cqw]">{e.kind === 'exhibition' ? 'Now' : p.month}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flyer ${className}`} style={{ background: ink.bg, color: ink.type }}>
     <div className="absolute inset-0 flex flex-col p-[5.5cqw]">
      <div className="stamp relative z-10 flex items-start justify-between gap-2 text-[5.2cqw]">
        <span>{date}</span>
        {t && e.kind !== 'exhibition' && <span>{t}</span>}
      </div>
      <p className="label relative z-10 mt-[2cqw] text-[4.2cqw] tracking-[0.06em]">{formatOf(e)}</p>

      <div className="relative my-[4cqw] flex min-h-0 flex-1 overflow-hidden">
        {hasPhoto ? (
          <Photo
            src={e.image!.url}
            onFail={() => setPhotoFailed(true)}
            className="duotone absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <Halftone seed={e.id} color={ink.ink} />
        )}
      </div>

      <div className="relative z-10">
        <div className="display relative" style={{ fontSize: `${size}cqw` }}>
          {/* Misregistered second ink, like a riso pass that didn't quite line up */}
          <div aria-hidden className="ink absolute left-[0.5cqw] top-[0.5cqw]" style={{ color: ink.ink }}>
            {names.map((n) => (
              <span key={n} className="block">
                {n}
              </span>
            ))}
          </div>
          <div className="relative">
            {names.map((n) => (
              <span key={n} className="block">
                {n}
              </span>
            ))}
          </div>
        </div>
        {lead && <p className="relative mt-[2.5cqw] text-[4.4cqw] font-semibold leading-snug">{lead.role}</p>}
        <p className="stamp mt-[3cqw] truncate text-[3.8cqw] opacity-90">{e.venue.name}</p>
      </div>
     </div>
    </div>
  )
}

/** Kept for older imports. */
export const Cover = Flyer
