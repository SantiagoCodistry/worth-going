// Event pictures. Real photos are shown as they are: no tint, no texture.
// When ingest found no photo that passed its checks, the cover is set in
// type on a single ink colour, like a plain gig flyer: what it is, and who.
import { useState } from 'react'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { categoryById } from '../shared/taxonomy.ts'
import { dayParts, endKey, startKey, timeLabel } from '../lib/dates.ts'

/** Roles that support rather than headline: "…, co-host", "Fidelity, moderator". */
export const NOT_BILLED = /moderator$|(^|,\s*)(co-)?host$/i

/** "Stand-up comedy", "Book talk": what kind of thing this is. */
export function formatOf(e: WGEvent): string {
  return e.format ?? categoryById(e.category).label
}

export function billed(e: WGEvent) {
  return e.people?.filter((p) => !NOT_BILLED.test(p.role)) ?? []
}

/** The names that sell the event, or its title. */
export function headliners(e: WGEvent): string[] {
  const b = billed(e).map((p) => p.name)
  return b.length ? b.slice(0, 3) : [e.title]
}

/** One plain sentence saying what this is. */
export function summaryOf(e: WGEvent): string {
  const clean = e.description
    .replace(/^Get up-to-date information at:\s*\S+\s*(Address:\s*(Check event page for more details\.?)?)?/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  const first = clean.match(/^.{20,220}?[.!?](\s|$)/)?.[0]?.trim() ?? clean.slice(0, 180)
  if (!first || first.toLowerCase() === e.title.toLowerCase()) return `${formatOf(e)} at ${e.venue.name}.`
  return first.length < clean.length && !/[.!?]$/.test(first) ? `${first}…` : first
}

const INK: Record<CategoryId, string> = {
  unusual: 'var(--riso-pink)',
  comedy: 'var(--riso-orange)',
  ideas: 'var(--riso-yellow)',
  music: 'var(--riso-blue)',
  startups: 'var(--riso-green)',
  art: 'var(--riso-teal)',
  sports: 'var(--riso-federal)',
  dining: 'var(--riso-orange)',
}
const DARK = new Set<CategoryId>(['music', 'startups', 'art', 'sports'])

export const inkFor = (c: CategoryId) => ({ bg: INK[c], fg: DARK.has(c) ? '#f7f5ef' : 'var(--ink)' })

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
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

/** Typographic cover for listings without a usable photo. */
export function TypeCover({ e, className = '' }: { e: WGEvent; className?: string }) {
  const ink = inkFor(e.category)
  const names = headliners(e)
  const longest = Math.max(...names.flatMap((n) => n.split(/\s+/)).map((w) => w.length), 5)
  const total = names.join(' ').length
  const size = Math.min(names.length > 1 ? 13 : 17, 120 / longest, total > 40 ? 9.5 : 99)
  return (
    <div className={`@container relative overflow-hidden ${className}`} style={{ background: ink.bg, color: ink.fg }}>
      <div className="absolute inset-0 flex flex-col justify-end p-[6cqw]">
        <p className="label mb-[2.5cqw] text-[4.2cqw]">{formatOf(e)}</p>
        <div className="display line-clamp-4" style={{ fontSize: `${size}cqw` }}>
          {names.map((n) => (
            <span key={n} className="block">
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Photo when there is one, typographic cover otherwise. */
export function Cover({ e, className = '' }: { e: WGEvent; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (e.image && !failed)
    return (
      <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
        <Photo
          src={e.image.url}
          alt=""
          onFail={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
        />
      </div>
    )
  return <TypeCover e={e} className={className} />
}

/** Small square used in lists: the photo, or the day of the month on the category colour. */
export function Thumb({ e, className = '' }: { e: WGEvent; className?: string }) {
  const [failed, setFailed] = useState(false)
  const ink = inkFor(e.category)
  const p = dayParts(e.start)
  if (e.image && !failed)
    return (
      <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
        <Photo src={e.image.url} onFail={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    )
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ background: ink.bg, color: ink.fg }}>
      <span className="stamp text-[22px] leading-none">{e.kind === 'exhibition' ? 'ON' : p.day}</span>
      <span className="stamp mt-1 text-[11px]">{e.kind === 'exhibition' ? 'NOW' : p.month}</span>
    </div>
  )
}

/** "THU 12 NOV · 7 PM" */
export function dateStamp(e: WGEvent) {
  const p = dayParts(e.start)
  if (e.kind === 'exhibition') return e.end ? `Until ${dayParts(e.end).month} ${dayParts(e.end).day}` : 'On now'
  const t = timeLabel(e)
  const range = e.end && endKey(e) !== startKey(e) ? `–${dayParts(e.end).day}` : ''
  return `${p.weekday} ${p.day}${range} ${p.month}${t ? ` · ${t}` : ''}`
}
