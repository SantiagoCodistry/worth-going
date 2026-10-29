// The printed sheet around every page: masthead, footer, and the shared bits
// (misregistered type, photos with riso poster fallbacks).
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Pick } from '../shared/edition.ts'
import { dateParts, timeOf } from '../lib/edition.ts'

/** Ink text with a pink pass printed slightly out of register behind it. */
export function Misreg({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className={`misreg ${className}`} data-text={children}>
      {children}
    </span>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <Misreg className={`display whitespace-nowrap ${className}`}>Worth Going</Misreg>
}

export function Masthead({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-ink">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 px-4 md:h-16 md:px-8">
        <Link to="/" aria-label="Worth Going, this week">
          <Wordmark className="text-[28px] md:text-[34px]" />
        </Link>
        <nav className="flex items-center gap-5" aria-label="Site">
          {right}
          <NavLink to="/editions" className={({ isActive }) => `caps ${isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}>
            Archive
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 border-t-[3px] border-ink">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:px-8">
        <div>
          <Wordmark className="text-[56px] md:text-[88px]" />
          <p className="mt-3 max-w-md text-[14px] text-ink-2">
            Ten things worth leaving the house for, around Princeton, New York and Philadelphia. Chosen by hand, every Thursday.
          </p>
        </div>
        <div className="space-y-3 text-[13px] text-mute md:pt-3">
          <p>
            Every pick links to its organizer or ticket seller. Dates, prices and availability can change, so check the listing
            before you go. Worth Going doesn’t sell tickets and isn’t affiliated with the venues or sites it links to.
          </p>
          <p>Photos are credited to their owners. Wikimedia content is used under CC BY-SA.</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t hairline px-4 py-5 text-[13px] text-mute md:px-8">
        <span>© {new Date().getFullYear()} Worth Going</span>
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/editions" className="hover:text-ink">Past editions</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <a href="https://codistry.com" target="_blank" rel="noreferrer" className="font-semibold text-ink hover:text-pink">
            Built with Codistry
          </a>
        </span>
      </div>
    </footer>
  )
}

// Two-colour riso sheets for picks without a photo: paper, ink and a second pass.
const SHEETS = [
  { bg: 'var(--pink)', fg: 'var(--ink)', dot: 'var(--ink)', num: 'var(--ink)', off: 'var(--paper)' },
  { bg: 'var(--ink)', fg: 'var(--paper)', dot: 'var(--pink)', num: 'var(--paper)', off: 'var(--pink)' },
  { bg: 'var(--yellow)', fg: 'var(--ink)', dot: 'var(--pink)', num: 'var(--ink)', off: 'var(--pink)' },
]
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Wikimedia thumbs come in a few standard widths; offer them so phones don't download the big one. */
function srcSet(url: string): string | undefined {
  const m = url.match(/^(.*\/thumb\/.+\/)(\d+)px-([^/]+)$/)
  if (!m) return undefined
  return [500, 960, 1280].map((w) => `${m[1]}${w}px-${m[3]} ${w}w`).join(', ')
}
const SIZES = { hero: '(min-width: 768px) 58vw, 100vw', text: '(min-width: 768px) 40vw, 100vw' }

/** The pick's photo, or an art-directed riso poster when there isn't one (or it won't load). */
export function PickImage({ pick, className = '', sizes = 'text' }: { pick: Pick; className?: string; sizes?: 'hero' | 'text' }) {
  const [failed, setFailed] = useState(false)
  const img = pick.image
  // Organizer flyers (Luma covers and the like) carry their own text: show them whole, over a blurred copy.
  const flyer = !!img && !/wikimedia|ticketmaster/i.test(img.credit ?? '') && !!img.w && !!img.h && img.w / img.h > 1.5
  const common = {
    alt: '',
    loading: sizes === 'hero' ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
    referrerPolicy: 'no-referrer' as const,
    onError: () => setFailed(true),
  }
  if (img && !failed)
    return (
      <figure>
        <div className={`relative overflow-hidden ${flyer ? 'bg-ink' : 'bg-paper-2'} ${className}`}>
          {flyer && <img src={img.url} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />}
          <img
            {...common}
            src={img.url}
            srcSet={srcSet(img.url)}
            sizes={SIZES[sizes]}
            className={`absolute inset-0 h-full w-full ${flyer ? 'object-contain' : 'object-cover object-[50%_30%]'}`}
          />
        </div>
        <Credit pick={pick} />
      </figure>
    )
  return <Poster pick={pick} className={className} />
}

/** A poster for the night: the day in huge misregistered numerals, the weekday, the kind and where. */
function Poster({ pick, className }: { pick: Pick; className: string }) {
  const sheet = SHEETS[hash(pick.id) % SHEETS.length]
  const { day, weekday, month } = dateParts(pick)
  const time = timeOf(pick)
  const area = { nyc: 'New York', philly: 'Philadelphia', princeton: 'Princeton' }[pick.city]
  return (
    <div
      className={`relative overflow-hidden [container-type:size] ${className}`}
      style={{ background: sheet.bg, color: sheet.fg, ['--dot' as string]: sheet.dot }}
      role="img"
      aria-label={`${pick.kind}, ${pick.exhibition ? 'on view' : `${weekday} ${month} ${day}`}, ${pick.venue.name}`}
    >
      <div className="halftone absolute inset-0" aria-hidden />
      <div className="absolute inset-0 flex flex-col p-[6cqw]">
        <div className="flex items-start justify-between gap-[3cqw] border-b-[0.5cqw] pb-[2.5cqw]" style={{ borderColor: sheet.fg }}>
          <p className="stamp text-[3.8cqw]">{pick.kind}</p>
          <p className="stamp shrink-0 text-[3.8cqw]">{area}</p>
        </div>
        <div className="flex flex-1 items-center gap-[3cqw]">
          {!pick.exhibition && <p className="stamp self-start pt-[8cqw] text-[6cqw] [writing-mode:vertical-rl]">{month}</p>}
          {pick.exhibition ? (
            <p className="display text-[min(30cqw,24cqh)]">On view</p>
          ) : (
            <p className="numeral relative text-[min(64cqw,44cqh)]" style={{ color: sheet.num }}>
              <span aria-hidden className="absolute left-[2.2cqw] top-[1.8cqw]" style={{ color: sheet.off }}>
                {day}
              </span>
              <span className="relative">{day}</span>
            </p>
          )}
        </div>
        <div className="border-t-[0.5cqw] pt-[2.5cqw]" style={{ borderColor: sheet.fg }}>
          {!pick.exhibition && (
            <>
              <p className="stamp text-[4cqw]">
                {month} {day}
                {time ? ` · ${time}` : ''}
              </p>
              <p className="display mt-[1.5cqw] text-[min(14cqw,11cqh)]">{weekday}</p>
            </>
          )}
          <p className="stamp mt-[2.5cqw] line-clamp-2 text-[3.8cqw] leading-[1.25]">{pick.venue.name}</p>
        </div>
      </div>
    </div>
  )
}

function Credit({ pick }: { pick: Pick }) {
  if (!pick.image?.credit) return null
  return (
    <figcaption className="mt-1.5 text-[11px] text-mute">
      Photo:{' '}
      {pick.image.link ? (
        <a href={pick.image.link} target="_blank" rel="noreferrer" className="link">
          {pick.image.credit}
        </a>
      ) : (
        pick.image.credit
      )}
    </figcaption>
  )
}

export function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="stamp animate-pulse text-[13px] text-mute">Printing this week’s sheet…</span>
    </div>
  )
}

export function Problem({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="display text-[44px]">Didn’t print.</p>
      <p className="mt-3 text-ink-2">{message}</p>
      <Link to="/" className="btn mt-6">
        This week’s ten
      </Link>
    </div>
  )
}
