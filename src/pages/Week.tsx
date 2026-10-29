// The whole product: this week's ten, ten places to eat, and a reason to come back on Thursday.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Edition, EditionIndexEntry, Pick, PlacePick } from '../shared/edition.ts'
import {
  CITY_LABEL,
  INTERESTS,
  formatMiles,
  locate,
  showMiles,
  milesTo,
  nearestArea,
  calendarUrl,
  currentDate,
  editionDateLabel,
  isPast,
  loadEdition,
  loadIndex,
  placesFor,
  shortDay,
  thursdayReminderIcs,
  timeOf,
  topTen,
  weekLabel,
  whenOf,
  type CityChoice,
  type Ranked,
} from '../lib/edition.ts'
import { SHORTLIST_MAX, usePrefs } from '../lib/prefs.tsx'
import { appUrl, shareOrCopy } from '../lib/share.ts'
import { connectSpotify, spotifyEnabled } from '../lib/spotify.ts'
import { addDays } from '../shared/time.ts'
import { Footer, Masthead, Misreg, PickImage, Loading, Problem } from '../components/Sheet.tsx'

const NEWSLETTER = import.meta.env.VITE_BUTTONDOWN_USER as string | undefined

export function Week() {
  const { date: wanted } = useParams()
  const [index, setIndex] = useState<EditionIndexEntry[] | null>(null)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setEdition(null)
    loadIndex()
      .then((idx) => {
        if (!live) return
        setIndex(idx)
        const date = wanted ?? currentDate(idx)
        if (!date) throw new Error('No editions yet.')
        return loadEdition(date).then((e) => live && setEdition(e))
      })
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [wanted])

  if (error) return <Problem message={error} />
  if (!edition || !index) return <Loading />
  const latest = currentDate(index) === edition.date
  return <Sheet edition={edition} latest={latest} />
}

function Sheet({ edition, latest }: { edition: Edition; latest: boolean }) {
  const { city, setCity, here, taste, shortlist } = usePrefs()
  const ten = useMemo(() => topTen(edition, city, taste, here), [edition, city, taste, here])
  const places = useMemo(() => placesFor(edition, city, here), [edition, city, here])
  const nearest = city === 'near' && here ? nearestArea(here) : null
  const personal = taste.interests.length > 0 || taste.artists.length > 0
  const [lead, ...rest] = ten
  const mine = shortlist(edition.date)

  // Shared links to one event (#pick-…) land on it once the sheet has printed.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [edition.date])

  return (
    <>
      <Masthead right={<span className="caps hidden text-mute sm:inline">No. {edition.number}</span>} />

      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        {/* ——— Headline ——— */}
        <section className="pt-8 md:pt-14">
          <Dateline edition={edition} latest={latest} />
          <h1 className="display mt-6 text-[17vw] md:mt-8 leading-[0.84] sm:text-[13vw] lg:text-[164px]">
            <Misreg>10</Misreg> things worth leaving the house for.
          </h1>
          <div className="mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[34rem] text-[17px] leading-relaxed text-ink-2 md:text-[18px]">
              Chosen by hand from what’s on around Princeton, New York and Philadelphia{' '}
              {latest ? `this week. New every Thursday.` : `for the week of ${weekLabel(edition.weekOf)}.`}
            </p>
            <CityTabs />
          </div>
          {nearest && (
            <p className="mt-4 text-[15px] text-ink-2">
              {nearest.miles > 45 ? (
                <>
                  <span className="bg-yellow px-1 font-semibold text-ink">You’re about {Math.round(nearest.miles)} miles from {CITY_LABEL[nearest.city]}</span>, the nearest
                  area Worth Going covers. Here’s its list, in case you’re heading that way.
                </>
              ) : (
                <>
                  Showing <strong className="text-ink">{CITY_LABEL[nearest.city]}</strong>, the area you’re in, with what’s closest to you nudged up and distances on each.
                </>
              )}
            </p>
          )}
          <Personalize personal={personal} />
        </section>

        {/* ——— Number one ——— */}
        {lead ? <Lead r={lead} date={edition.date} /> : <p className="py-24 text-center text-ink-2">Nothing in {CITY_LABEL[nearest?.city ?? city]} this week.</p>}

        {/* ——— Two to ten ——— */}
        {rest.length > 0 && (
          <div className="mt-20 flex items-end justify-between gap-4 border-b-[3px] border-ink pb-3 md:mt-28">
            <h2 className="display text-[44px] md:text-[72px]">
              And {rest.length === 9 ? 'nine' : rest.length} more
            </h2>
            <p className="stamp pb-1 text-[12px] md:text-[13px]">
              Nos. 2–{rest.length + 1}
            </p>
          </div>
        )}
        {rest.length > 0 && (
          <ol aria-label="Numbers two to ten">
            {rest.map((r, i) => (
              <Entry key={r.pick.id} r={r} n={i + 2} date={edition.date} />
            ))}
          </ol>
        )}
        {ten.length > 0 && ten.length < 10 && (
          <p className="mt-6 text-[15px] text-ink-2">
            That’s all {ten.length} we’d recommend in {CITY_LABEL[nearest?.city ?? city]} this week.{' '}
            <button className="link font-semibold" onClick={() => setCity('all')}>
              See all ten
            </button>
          </p>
        )}

        {/* ——— Ten places to eat ——— */}
        <Eat places={places} city={city} />

        {/* ——— Come back on Thursday ——— */}
        <NextWeek edition={edition} />
      </main>

      <Footer />
      <ShortlistBar edition={edition} ids={mine} />
    </>
  )
}

/** The edition's date, big enough to tell at a glance that the list is current, and a way to pass it on. */
function Dateline({ edition, latest }: { edition: Edition; latest: boolean }) {
  const [note, setNote] = useState('')
  const [from, to] = edition.weekOf
  const day = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...o }).format(new Date(`${d}T12:00:00Z`))
  const share = async () => {
    const r = await shareOrCopy({
      title: `Worth Going No. ${edition.number}`,
      text: `10 things worth leaving the house for, ${weekLabel(edition.weekOf)}: ${edition.picks.slice(0, 3).map((p) => p.title).join(', ')}…`,
      url: appUrl(latest ? '' : `edition/${edition.date}`),
    })
    setNote(r === 'copied' ? 'Link copied.' : r === 'failed' ? 'Couldn’t copy the link.' : '')
    if (r !== 'shared') setTimeout(() => setNote(''), 2500)
  }
  return (
    <div className="flex flex-col gap-4 border-y-[3px] border-ink py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`stamp px-2 py-1.5 text-[12px] ${latest ? 'bg-pink text-ink' : 'bg-yellow text-ink'}`}>{latest ? 'This week' : 'Past edition'}</span>
        <p className="display text-[30px] md:text-[40px]">
          <time dateTime={from}>{day(from, { weekday: 'short', month: 'short', day: 'numeric' })}</time>
          <span className="px-2 text-pink">–</span>
          <time dateTime={to}>{day(to, { weekday: 'short', month: 'short', day: 'numeric' })}</time>
          <span className="ml-2 text-mute">{day(to, { year: 'numeric' })}</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="stamp text-[12px] leading-snug text-ink-2">
          No. {edition.number}
          <span className="block text-mute">Out {day(edition.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </p>
        <div className="relative">
          <button className="btn whitespace-nowrap" onClick={share}>
            Share this week
          </button>
          {note && (
            <span role="status" className="absolute right-0 top-full mt-1 whitespace-nowrap text-[13px] font-semibold text-ink-2">
              {note}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const LOCATE_ERROR: Record<string, string> = {
  denied: 'Location is off for this site. Turn it on in your browser’s settings, or pick an area.',
  unavailable: 'Couldn’t find your location just now. Pick an area instead.',
  unsupported: 'This browser can’t share its location. Pick an area instead.',
}

/** Areas, plus Near me: asks for your location only when you tap it. */
function CityTabs() {
  const { city, setCity, setHere } = usePrefs()
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')
  const nearMe = async () => {
    setError('')
    setFinding(true)
    try {
      setHere(await locate())
      setCity('near')
    } catch (e) {
      setError(LOCATE_ERROR[String(e)] ?? LOCATE_ERROR.unavailable)
    } finally {
      setFinding(false)
    }
  }
  return (
    <div className="min-w-0">
      <div role="tablist" aria-label="Area" className="flex flex-wrap gap-1.5">
        {(Object.keys(CITY_LABEL) as CityChoice[]).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={city === c}
            onClick={() => (c === 'near' ? nearMe() : (setError(''), setCity(c)))}
            className={`flex min-h-[44px] shrink-0 items-center gap-1.5 border border-ink px-3.5 text-[15px] font-semibold transition-colors ${city === c ? 'bg-ink text-paper' : 'hover:bg-yellow'}`}
          >
            {c === 'near' && (
              <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden>
                <path d="M5.5 12.3s4.4-4.2 4.4-7.4a4.4 4.4 0 10-8.8 0c0 3.2 4.4 7.4 4.4 7.4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="5.5" cy="5" r="1.4" fill="currentColor" />
              </svg>
            )}
            {c === 'near' && finding ? 'Finding you…' : CITY_LABEL[c]}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-[13px] font-semibold text-ink-2" role="status">
          {error}
        </p>
      )}
    </div>
  )
}

/** "Make it yours": pick what you're into, or bring your Spotify artists. Optional and quiet. */
function Personalize({ personal }: { personal: boolean }) {
  const { taste, setTaste } = usePrefs()
  const [open, setOpen] = useState(false)
  const toggle = (id: string) =>
    setTaste({ ...taste, interests: taste.interests.includes(id) ? taste.interests.filter((x) => x !== id) : [...taste.interests, id] })
  return (
    <div className="mt-6 border-t hairline pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
        {personal ? (
          <>
            <span className="font-semibold">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pink align-middle" />
              Ordered for you
              {taste.artists.length > 0 && ` · ${taste.artists.length} Spotify artists`}
            </span>
            <button className="link text-ink-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Done' : 'Change'}
            </button>
            <button className="link text-ink-2" onClick={() => setTaste({ interests: [], artists: [] })}>
              Back to the editor’s order
            </button>
          </>
        ) : (
          <button className="link font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Done' : 'Make it yours: tell us what you’re into'}
          </button>
        )}
      </div>
      {open && (
        <div className="rise mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Interests">
            {INTERESTS.map((i) => {
              const on = taste.interests.includes(i.id)
              return (
                <button
                  key={i.id}
                  aria-pressed={on}
                  onClick={() => toggle(i.id)}
                  className={`border border-ink px-3 py-1.5 text-[14px] font-semibold ${on ? 'bg-pink' : 'hover:bg-yellow'}`}
                >
                  {on ? '✓ ' : ''}
                  {i.label}
                </button>
              )
            })}
          </div>
          {spotifyEnabled && (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn" onClick={() => connectSpotify()}>
                {taste.artists.length ? 'Refresh from Spotify' : 'Use my Spotify artists'}
              </button>
              <span className="text-[13px] text-mute">Read-only. Shows by artists you play move to the top.</span>
            </div>
          )}
          <p className="text-[13px] text-mute">The editor still picks every entry; this only changes the order. Saved in this browser.</p>
        </div>
      )}
    </div>
  )
}

function linkLabel(p: Pick) {
  if (p.isFree || /free/i.test(p.price ?? '')) return 'Details'
  return /ticket|tock|axs|seetickets|dice\.fm|eventbrite|luma|etix|tix/i.test(p.link) ? 'Tickets' : 'Details'
}

/** Anchor for linking straight to one pick. */
export const anchorFor = (p: Pick) => `pick-${p.id.replace(/[^a-z0-9-]/gi, '-').slice(0, 60)}`

/** The date, boxed like a stamp on a flyer: what people check first. */
function DateStamp({ p, size = 'md' }: { p: Pick; size?: 'md' | 'lg' }) {
  const t = timeOf(p)
  return (
    <p className={`stamp inline-flex items-center gap-2 border-[1.5px] border-ink px-2.5 py-1.5 ${size === 'lg' ? 'text-[14px] md:text-[15px]' : 'text-[13px]'}`}>
      <span>{shortDay(p)}</span>
      {t && (
        <>
          <span className="h-3 w-px bg-ink" aria-hidden />
          <span>{t}</span>
        </>
      )}
    </p>
  )
}

/** Kind, area and (for Near me) distance. */
function Kicker({ p }: { p: Pick }) {
  const { city, here } = usePrefs()
  const mi = city === 'near' ? milesTo(here, p.venue) : null
  return (
    <p className="caps flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-2">
      <span>{p.kind}</span>
      <span className="text-mute" aria-hidden>/</span>
      <span>{CITY_LABEL[p.city]}</span>
      {showMiles(mi) && (
        <>
          <span className="text-mute" aria-hidden>/</span>
          <span className="text-pink">{formatMiles(mi)}</span>
        </>
      )}
      {isPast(p) && <span className="bg-paper-2 px-1.5 py-0.5 text-mute">Happened</span>}
    </p>
  )
}

function Why({ p, size }: { p: Pick; size: 'lead' | 'entry' }) {
  return (
    <div>
      <p className="caps text-pink">Why it’s worth going</p>
      <p className={`serif mt-2 text-ink ${size === 'lead' ? 'text-[23px] md:text-[28px]' : 'text-[20px] md:text-[23px]'}`}>{p.why}</p>
    </div>
  )
}

function Meta({ p }: { p: Pick }) {
  const address = p.venue.address?.replace(/, (New York|Princeton|Philadelphia|Brooklyn)( \(NYC\))?$/, '').replace(/, USA$/, '')
  return (
    <dl className="grid grid-cols-[4.25rem_1fr] gap-x-4 gap-y-2 border-t hairline pt-4 text-[15px] leading-snug">
      <dt className="caps pt-[2px] text-mute">When</dt>
      <dd>{whenOf(p)}</dd>
      <dt className="caps pt-[2px] text-mute">Where</dt>
      <dd>
        <span className="font-semibold">{p.venue.name}</span>
        {address && address !== p.venue.name && <span className="block text-ink-2">{address}</span>}
      </dd>
      {(p.price || p.isFree) && (
        <>
          <dt className="caps pt-[2px] text-mute">Price</dt>
          <dd>{p.price ?? 'Free'}</dd>
        </>
      )}
    </dl>
  )
}

const IconShare = () => (
  <svg width="14" height="15" viewBox="0 0 14 15" aria-hidden>
    <path d="M7 1v9M3.5 4.5L7 1l3.5 3.5M1.5 8.5v5h11v-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)
const IconCal = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
    <rect x="1" y="2.5" width="12" height="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1 6h12M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

/** Tickets, my three, share, calendar: one row on desktop, a tidy 2×2 grid of big targets on phones. */
function Actions({ p, date }: { p: Pick; date: string }) {
  const { shortlist, toggleShortlist } = usePrefs()
  const [note, setNote] = useState('')
  const on = shortlist(date).includes(p.id)
  const share = async () => {
    const r = await shareOrCopy({
      title: p.title,
      text: `${p.title}: ${shortDay(p)}${timeOf(p) ? `, ${timeOf(p)}` : ''} at ${p.venue.name}. From Worth Going’s ten this week.`,
      url: appUrl(`edition/${date}#${anchorFor(p)}`),
    })
    setNote(r === 'copied' ? 'Link copied.' : r === 'failed' ? 'Couldn’t copy the link.' : '')
    if (r !== 'shared') setTimeout(() => setNote(''), 2500)
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <a href={p.link} target="_blank" rel="noreferrer" className="btn btn-solid">
          {linkLabel(p)} <span aria-hidden>↗</span>
        </a>
        <button
          className={`btn ${on ? 'border-pink bg-pink text-ink hover:border-ink' : ''}`}
          aria-pressed={on}
          onClick={() => {
            const r = toggleShortlist(date, p.id)
            setNote(r === 'full' ? `You’ve picked ${SHORTLIST_MAX}. Remove one first.` : '')
          }}
        >
          <span aria-hidden>{on ? '★' : '☆'}</span> {on ? 'In my three' : 'My three'}
        </button>
        <button className="btn" onClick={share} aria-label={`Share ${p.title}`}>
          <IconShare /> Share
        </button>
        {!p.exhibition ? (
          <a href={calendarUrl(p)} target="_blank" rel="noreferrer" className="btn" aria-label={`Add ${p.title} to Google Calendar`}>
            <IconCal /> Calendar
          </a>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
      <p className="mt-2 min-h-[1.25rem] text-[13px] font-semibold text-ink-2" role="status">
        {note}
      </p>
    </div>
  )
}

function Lead({ r, date }: { r: Ranked; date: string }) {
  const p = r.pick
  return (
    <article id={anchorFor(p)} className="rise mt-10 grid scroll-mt-6 gap-7 md:mt-14 lg:grid-cols-12 lg:gap-x-12" aria-label="Number one">
      <div className="lg:col-span-7">
        <PickImage pick={p} sizes="hero" className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-[5/6]" />
      </div>
      <div className="flex flex-col lg:col-span-5 lg:pt-1">
        <div className="flex items-end gap-5">
          <span className="numeral text-[150px] md:text-[190px]" aria-hidden>
            <Misreg>1</Misreg>
          </span>
          <div className="space-y-2.5 pb-2">
            <p className="stamp text-[12px] text-pink">This week’s number one</p>
            <DateStamp p={p} size="lg" />
          </div>
        </div>
        {r.reason && <p className="mt-4 self-start bg-yellow px-1.5 py-0.5 text-[13px] font-semibold">{r.reason}</p>}
        <div className="mt-6">
          <Kicker p={p} />
        </div>
        <h2 className="display mt-3 text-[58px] md:text-[84px]">{p.title}</h2>
        <div className="mt-6">
          <Why p={p} size="lead" />
        </div>
        <div className="mt-7">
          <Meta p={p} />
        </div>
        <div className="mt-6">
          <Actions p={p} date={date} />
        </div>
      </div>
    </article>
  )
}

/** Two to ten: #1's layout at a smaller scale, so the list reads as one piece. */
function Entry({ r, n, date }: { r: Ranked; n: number; date: string }) {
  const p = r.pick
  return (
    <li id={anchorFor(p)} className={`scroll-mt-6 border-b hairline py-10 md:py-14 ${isPast(p) ? 'opacity-55' : ''}`}>
      <article className="grid gap-y-5 md:grid-cols-12 md:gap-x-10" aria-label={`Number ${n}: ${p.title}`}>
        <div className="flex items-end gap-4 md:hidden">
          <span className="numeral text-[88px]" aria-hidden>
            <Misreg>{String(n)}</Misreg>
          </span>
          <div className="pb-1.5">
            <DateStamp p={p} />
          </div>
        </div>
        <div className="md:col-span-5">
          <PickImage pick={p} className="aspect-[4/3] md:aspect-[4/5]" />
        </div>
        <div className="min-w-0 md:col-span-7">
          <div className="hidden items-end gap-5 md:flex">
            <span className="numeral text-[124px]" aria-hidden>
              <Misreg>{String(n)}</Misreg>
            </span>
            <div className="pb-2">
              <DateStamp p={p} />
            </div>
          </div>
          {r.reason && <p className="mt-4 inline-block bg-yellow px-1.5 py-0.5 text-[13px] font-semibold">{r.reason}</p>}
          <div className="md:mt-6">
            <Kicker p={p} />
          </div>
          <h3 className="display mt-2.5 text-[46px] md:text-[62px]">{p.title}</h3>
          <div className="mt-5 max-w-[36rem]">
            <Why p={p} size="entry" />
          </div>
          <div className="mt-6 max-w-[36rem]">
            <Meta p={p} />
          </div>
          <div className="mt-6">
            <Actions p={p} date={date} />
          </div>
        </div>
      </article>
    </li>
  )
}

function Eat({ places, city }: { places: PlacePick[]; city: CityChoice }) {
  const { here } = usePrefs()
  if (!places.length) return null
  const area = city === 'near' && here ? nearestArea(here).city : city
  return (
    <section className="mt-24 md:mt-32" aria-labelledby="eat">
      <div className="flex flex-col gap-2 border-t-[3px] border-ink pt-4 md:flex-row md:items-end md:justify-between">
        <h2 id="eat" className="display text-[56px] md:text-[96px]">
          And <Misreg>10</Misreg> places to eat
        </h2>
        <p className="stamp text-[12px] text-ink-2 md:pb-3">{area === 'all' ? 'New York · Philadelphia · Princeton' : city === 'near' ? `Closest to you in ${CITY_LABEL[area]}` : CITY_LABEL[area]}</p>
      </div>
      <ol className="mt-6 grid gap-x-12 md:grid-cols-2">
        {places.map((pl, i) => (
          <li key={pl.id} className="grid grid-cols-[3rem_1fr] gap-x-3 border-b hairline py-6">
            <span className="numeral text-[44px] text-ink" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="display text-[30px] md:text-[34px]">{pl.name}</h3>
              <p className="caps mt-1.5 text-ink-2">
                {pl.cuisine} · {pl.neighborhood}
                {city === 'all' ? ` · ${CITY_LABEL[pl.city]}` : ''} · {pl.price}
                {city === 'near' && showMiles(milesTo(here, pl)) && <span className="text-pink"> · {formatMiles(milesTo(here, pl)!)}</span>}
              </p>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{pl.why}</p>
              {pl.order && (
                <p className="mt-1 text-[14.5px]">
                  <span className="serif">Order:</span> {pl.order}
                </p>
              )}
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-semibold">
                {pl.book ? (
                  <a href={pl.book.url} target="_blank" rel="noreferrer" className="link">
                    Book on {pl.book.via} ↗
                  </a>
                ) : (
                  <span className="text-mute">Walk in</span>
                )}
                <a href={pl.map} target="_blank" rel="noreferrer" className="link">
                  Map ↗
                </a>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function NextWeek({ edition }: { edition: Edition }) {
  const next = addDays(edition.date, 7)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const remind = () => {
    const blob = new Blob([thursdayReminderIcs(appUrl(''))], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'worth-going-thursdays.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  return (
    <section className="mt-24 bg-ink px-5 py-12 text-paper md:mt-32 md:px-12 md:py-16" aria-labelledby="next">
      <p className="stamp text-[12px] text-pink">Next edition · {editionDateLabel(next)}</p>
      <h2 id="next" className="display mt-3 text-[48px] md:text-[80px]">Ten new things, every Thursday.</h2>
      {NEWSLETTER ? (
        sent ? (
          <p className="serif mt-6 text-[22px]">Check your inbox to confirm. See you Thursday.</p>
        ) : (
          <form
            className="mt-7 flex max-w-xl flex-col gap-2 sm:flex-row"
            action={`https://buttondown.com/api/emails/embed-subscribe/${NEWSLETTER}`}
            method="post"
            target="wg-subscribe"
            onSubmit={() => setTimeout(() => setSent(true), 400)}
          >
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[48px] w-full border border-paper bg-transparent px-4 text-[16px] text-paper outline-none placeholder:text-paper/50"
            />
            <button className="btn btn-solid shrink-0 border-paper bg-paper text-ink">Get it by email</button>
            <iframe name="wg-subscribe" title="Subscription" className="hidden" />
          </form>
        )
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn border-paper hover:bg-paper hover:text-ink" onClick={remind}>
          Remind me on Thursdays
        </button>
        <a href={`${import.meta.env.BASE_URL}feed.xml`} className="link text-[14px] text-paper/80">
          RSS
        </a>
        <Link to="/editions" className="link text-[14px] text-paper/80">
          Past editions
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-[13px] text-paper/60">
        The reminder is a weekly calendar event with a link to the new edition. Nothing to sign up for.
      </p>
    </section>
  )
}

/** Your three: appears once you've picked one, and shares as a link. */
function ShortlistBar({ edition, ids }: { edition: Edition; ids: string[] }) {
  const { clearShortlist } = usePrefs()
  const [status, setStatus] = useState('')
  if (!ids.length) return null
  const picks = ids.map((id) => edition.picks.find((p) => p.id === id)).filter((p): p is Pick => !!p)
  const url = appUrl(`shortlist?d=${edition.date}&p=${ids.map(encodeURIComponent).join(',')}`)
  const share = async () => {
    const r = await shareOrCopy({ title: 'My three for this week', text: `My three for this week: ${picks.map((p) => p.title).join(', ')}`, url })
    setStatus(r === 'copied' ? 'Link copied. Paste it in the group chat.' : r === 'failed' ? 'Couldn’t share. Copy the link from the address bar on the next page.' : '')
    if (r !== 'shared') setTimeout(() => setStatus(''), 3500)
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
        <p className="stamp shrink-0 text-[12px]">
          My three <span className="text-pink">{ids.length}/{SHORTLIST_MAX}</span>
        </p>
        <ol className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {picks.map((p, i) => (
            <li key={p.id} className="shrink-0 truncate border border-ink px-2 py-1 text-[13px] font-semibold">
              {i + 1}. {p.title}
            </li>
          ))}
        </ol>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/shortlist?d=${edition.date}&p=${ids.join(',')}`} className="link text-[13px] text-ink-2">
            Preview
          </Link>
          <button className="link text-[13px] text-ink-2" onClick={() => clearShortlist(edition.date)}>
            Clear
          </button>
          <button className="btn btn-solid min-h-[40px] py-1.5" onClick={share}>
            Share my three
          </button>
        </div>
        {status && <p className="w-full text-[13px] font-semibold" role="status">{status}</p>}
      </div>
    </div>
  )
}
