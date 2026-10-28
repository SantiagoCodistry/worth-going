import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { CityFilter } from '../shared/types.ts'
import { CITIES } from '../shared/taxonomy.ts'
import { useStore } from '../lib/store.tsx'
import { accountsEnabled } from '../lib/account.ts'
import { CONTACT_URL } from '../pages/Legal.tsx'
import { NearMePanel } from './NearMe.tsx'
import { radiusLabel } from '../lib/geo.ts'

const NAV: { to: string; label: string; short?: string; end?: boolean }[] = [
  { to: '/', label: 'For you', end: true },
  { to: '/explore', label: 'Calendar' },
  { to: '/table', label: 'Eat' },
  { to: '/saved', label: 'Saved' },
  { to: '/you', label: 'Your taste', short: 'Taste' },
]

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display relative inline-block whitespace-nowrap text-[34px] leading-none ${className}`}>
      <span aria-hidden className="absolute left-[0.04em] top-[0.04em] text-[var(--riso-pink)] mix-blend-multiply">
        Worth Going
      </span>
      <span className="relative">Worth Going</span>
    </span>
  )
}

export function CityTabs({ className = '' }: { className?: string }) {
  const { city, setCity, near } = useStore()
  const [open, setOpen] = useState(false)
  const opts: { id: CityFilter; label: string }[] = [{ id: 'all', label: 'All cities' }, ...CITIES.map((c) => ({ id: c.id, label: c.short }))]
  return (
    <div className={`min-w-0 ${className}`}>
      <div role="tablist" aria-label="Where" className="no-scrollbar flex gap-1.5 overflow-x-auto">
        <button
          role="tab"
          aria-selected={city === 'near'}
          aria-expanded={open}
          onClick={() => {
            if (near && city !== 'near') setCity('near')
            else setOpen((o) => !o)
          }}
          className="chip whitespace-nowrap"
        >
          <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden className="mr-1 inline -translate-y-px">
            <path d="M5.5 12.5s4.5-4.3 4.5-7.5a4.5 4.5 0 10-9 0c0 3.2 4.5 7.5 4.5 7.5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="5.5" cy="5" r="1.5" fill="currentColor" />
          </svg>
          {near && city === 'near' ? `${near.label} · ${radiusLabel(near)}` : 'Near me'}
        </button>
        {near && city === 'near' && (
          <button className="chip" onClick={() => setOpen((o) => !o)} aria-label="Change location or radius">
            Change
          </button>
        )}
        {opts.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={city === o.id}
            onClick={() => {
              setCity(o.id)
              setOpen(false)
            }}
            className="chip"
          >
            {o.label}
          </button>
        ))}
      </div>
      {open && (
        <div className="mt-2 max-w-2xl">
          <NearMePanel onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

function SearchBox({ className = '' }: { className?: string }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  return (
    <form
      role="search"
      onSubmit={(ev) => {
        ev.preventDefault()
        nav(`/explore?q=${encodeURIComponent(q)}&when=all`)
      }}
      className={`flex items-center gap-2 border-[1.5px] border-ink px-3 focus-within:bg-card ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="text-mute">
        <circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people, venues, events"
        aria-label="Search"
        className="w-full bg-transparent py-2 text-[14px] outline-none placeholder:text-mute"
      />
    </form>
  )
}

export function Layout() {
  const { saved } = useStore()
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [loc.pathname])

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-bg">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
          <Link to="/" aria-label="Worth Going home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `label px-3 py-2 text-[13px] ${isActive ? 'bg-ink text-bg' : 'hover:bg-[var(--riso-yellow)]'}`}
              >
                {n.label}
                {n.to === '/saved' && saved.length > 0 && <span className="ml-1.5">({saved.length})</span>}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <SearchBox className="hidden w-72 lg:flex" />
            <AccountLink />
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <Footer />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-[1.5px] border-ink bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `label relative py-3.5 text-center text-[11.5px] ${isActive ? 'bg-ink text-bg' : ''}`}
          >
            {n.short ?? n.label}
            {n.to === '/saved' && saved.length > 0 && <span className="absolute right-[14%] top-3 h-1.5 w-1.5 rounded-full bg-[var(--riso-pink)]" />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function AccountLink() {
  const { session } = useStore()
  if (!accountsEnabled) return null
  const name = session?.user.email?.split('@')[0]
  return (
    <NavLink to="/account" className={({ isActive }) => `label max-w-[9rem] truncate border-[1.5px] border-ink px-3 py-1.5 text-[12px] ${isActive ? 'bg-ink text-bg' : 'hover:bg-[var(--riso-yellow)]'}`}>
      {name ?? 'Sign in'}
    </NavLink>
  )
}

function Footer() {
  const { data } = useStore()
  const updated = data
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(data.generatedAt))
    : ''
  return (
    <footer className="mt-28 border-t-[3px] border-ink">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-10 md:grid-cols-[1.6fr_1fr_1fr] md:px-8">
        <div>
          <Wordmark className="text-[64px] md:text-[96px]" />
          <p className="mt-3 max-w-sm text-[14px] text-ink-2">Events and restaurants from New York to Philadelphia, by way of Princeton. Every listing links to its source.</p>
        </div>
        <ul className="space-y-1.5 text-[14px] font-semibold">
          <li><Link className="hover:underline" to="/explore?when=weekend">This weekend</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=unusual">Unusual</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=ideas">Talks</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=startups">Startups</Link></li>
          <li><Link className="hover:underline" to="/about">About and sources</Link></li>
          <li><Link className="hover:underline" to="/account">{accountsEnabled ? 'Account' : 'Your data'}</Link></li>
        </ul>
        <div className="text-[14px] text-ink-2">
          {updated && <p>Updated {updated} ET.</p>}
          <p className="mt-2">Check times and tickets with the organizer before you go.</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] space-y-3 border-t border-rule px-4 py-6 text-[12.5px] leading-relaxed text-mute md:px-8">
        <p>
          Listings, prices and availability come from third parties and can change. Prices are the latest we fetched and usually
          exclude fees. Confirm with the organizer or seller before you buy or travel. Worth Going doesn’t sell tickets or take
          reservations and isn’t affiliated with the venues, artists, teams, restaurants or platforms it links to, including
          Ticketmaster, Resy, OpenTable, Tock and SevenRooms. Trademarks belong to their owners.
        </p>
        <p>
          {data?.sources.some((x) => x.id === 'ticketmaster' && x.count > 0) && 'Event data in part from the Ticketmaster Discovery API. '}
          Photos are credited to their owners; Wikipedia and Wikimedia
          Commons content is used under CC BY-SA. Maps and geocoding © OpenStreetMap contributors (ODbL). Your saved items are
          stored in this browser{accountsEnabled ? ', and in your account if you sign in' : ''}. No ads, no tracking.
        </p>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pb-10 text-[13px] text-mute md:px-8">
        <span>© {new Date().getFullYear()} Worth Going</span>
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="hover:text-ink">Contact</a>
          <a href="https://codistry.com" target="_blank" rel="noreferrer" className="hover:text-ink">
            Built with Codistry
          </a>
        </span>
      </div>
    </footer>
  )
}
