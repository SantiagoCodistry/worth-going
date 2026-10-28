// The printed sheet around every page: masthead, footer, and the shared bits
// (misregistered type, photos with flyer fallbacks).
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Pick } from '../shared/edition.ts'

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

const FLYER = [
  { bg: 'var(--pink)', fg: 'var(--ink)' },
  { bg: 'var(--ink)', fg: 'var(--paper)' },
  { bg: 'var(--yellow)', fg: 'var(--ink)' },
]
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** The pick's photo, or a one-colour riso flyer with its name when there isn't one (or it won't load). */
export function PickImage({ pick, className = '', sizes = 'text' }: { pick: Pick; className?: string; sizes?: 'hero' | 'text' }) {
  const [failed, setFailed] = useState(false)
  // Organizer flyers (Luma covers and the like) carry their own text: show them whole, over a blurred copy.
  const flyer = !!pick.image && !/wikimedia|ticketmaster/i.test(pick.image.credit ?? '') && !!pick.image.w && !!pick.image.h && pick.image.w / pick.image.h > 1.5
  if (pick.image && !failed && flyer)
    return (
      <figure>
        <div className={`relative overflow-hidden bg-ink ${className}`}>
          <img src={pick.image.url} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />
          <img
            src={pick.image.url}
            alt=""
            loading={sizes === 'hero' ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
        <Credit pick={pick} />
      </figure>
    )
  if (pick.image && !failed)
    return (
      <figure>
        <div className={`relative overflow-hidden bg-paper-2 ${className}`}>
          <img
          src={pick.image.url}
          alt=""
          loading={sizes === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <Credit pick={pick} />
      </figure>
    )
  const ink = FLYER[hash(pick.id) % FLYER.length]
  const name = pick.people?.[0]?.name && pick.people[0].name.length < pick.title.length ? pick.people[0].name : pick.title
  const long = name.length > 26
  return (
    <div className={`@container relative overflow-hidden ${className}`} style={{ background: ink.bg, color: ink.fg }}>
      <div className="absolute inset-0 flex flex-col justify-between p-[6cqw]">
        <p className="stamp text-[3.6cqw]">{pick.kind}</p>
        <p className={`display ${long ? 'text-[11cqw]' : 'text-[16cqw]'}`}>{name}</p>
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
