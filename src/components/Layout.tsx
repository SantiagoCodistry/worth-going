import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { CityFilter } from '../shared/types.ts'
import { CITIES } from '../shared/taxonomy.ts'
import { useStore } from '../lib/store.tsx'

const NAV = [
  { to: '/', label: 'For you', end: true },
  { to: '/explore', label: 'Calendar' },
  { to: '/table', label: 'Eat' },
  { to: '/saved', label: 'Saved' },
  { to: '/you', label: 'Your taste' },
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
  const { city, setCity } = useStore()
  const opts: { id: CityFilter; label: string }[] = [{ id: 'all', label: 'All cities' }, ...CITIES.map((c) => ({ id: c.id, label: c.short }))]
  return (
    <div role="tablist" aria-label="City" className={`no-scrollbar flex gap-1.5 overflow-x-auto ${className}`}>
      {opts.map((o) => (
        <button key={o.id} role="tab" aria-selected={city === o.id} onClick={() => setCity(o.id)} className="chip">
          {o.label}
        </button>
      ))}
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
          <SearchBox className="hidden w-72 lg:flex" />
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
            {n.label}
            {n.to === '/saved' && saved.length > 0 && <span className="absolute right-[14%] top-3 h-1.5 w-1.5 rounded-full bg-[var(--riso-pink)]" />}
          </NavLink>
        ))}
      </nav>
    </div>
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
          <p className="mt-3 max-w-sm text-[14px] text-ink-2">Events in New York, Philadelphia and Princeton. Every listing links to its source.</p>
        </div>
        <ul className="space-y-1.5 text-[14px] font-semibold">
          <li><Link className="hover:underline" to="/explore?when=weekend">This weekend</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=unusual">Unusual</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=ideas">Talks</Link></li>
          <li><Link className="hover:underline" to="/explore?cat=startups">Startups</Link></li>
          <li><Link className="hover:underline" to="/about">About and sources</Link></li>
        </ul>
        <div className="text-[14px] text-ink-2">
          {updated && <p>Updated {updated} ET.</p>}
          <p className="mt-2">Check times and tickets with the organizer before you go.</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 pb-10 text-[13px] text-mute md:px-8">
        <span>© {new Date().getFullYear()} Worth Going</span>
        <a href="https://codistry.com" target="_blank" rel="noreferrer" className="hover:text-ink">
          Built with Codistry
        </a>
      </div>
    </footer>
  )
}
