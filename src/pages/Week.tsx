// The whole product: this week's ten, ten places to eat, and a reason to come back on Thursday.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Edition, EditionIndexEntry, Pick, PlacePick } from '../shared/edition.ts'
import {
  CITY_LABEL,
  INTERESTS,
  calendarUrl,
  currentDate,
  editionDateLabel,
  isPast,
  loadEdition,
  loadIndex,
  placesFor,
  shortDay,
  thursdayReminderIcs,
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
  const { city, setCity, taste, shortlist } = usePrefs()
  const ten = useMemo(() => topTen(edition, city, taste), [edition, city, taste])
  const places = useMemo(() => placesFor(edition, city), [edition, city])
  const personal = taste.interests.length > 0 || taste.artists.length > 0
  const [lead, ...rest] = ten
  const mine = shortlist(edition.date)

  return (
    <>
      <Masthead right={<span className="caps hidden text-mute sm:inline">No. {edition.number}</span>} />

      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        {/* ——— Headline ——— */}
        <section className="pt-8 md:pt-14">
          <p className="stamp text-[12px] md:text-[13px]">
            No. {edition.number} · {weekLabel(edition.weekOf)}
            {!latest && <span className="ml-2 bg-yellow px-1.5 py-0.5">Past edition</span>}
          </p>
          <h1 className="display mt-4 text-[17vw] leading-[0.84] sm:text-[13vw] lg:text-[164px]">
            <Misreg>10</Misreg> things worth leaving the house for.
          </h1>
          <div className="mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[34rem] text-[17px] leading-relaxed text-ink-2 md:text-[18px]">
              Chosen by hand from what’s on around Princeton, New York and Philadelphia{' '}
              {latest ? `this week. New every Thursday.` : `for the week of ${weekLabel(edition.weekOf)}.`}
            </p>
            <CityTabs city={city} setCity={setCity} />
          </div>
          <Personalize personal={personal} />
        </section>

        {/* ——— Number one ——— */}
        {lead ? <Lead r={lead} date={edition.date} /> : <p className="py-24 text-center text-ink-2">Nothing in {CITY_LABEL[city]} this week.</p>}

        {/* ——— Two to ten ——— */}
        {rest.length > 0 && (
          <ol className="mt-16 border-t-[3px] border-ink md:mt-24" aria-label="Numbers two to ten">
            {rest.map((r, i) => (
              <Entry key={r.pick.id} r={r} n={i + 2} date={edition.date} />
            ))}
          </ol>
        )}
        {ten.length > 0 && ten.length < 10 && (
          <p className="mt-6 text-[15px] text-ink-2">
            That’s all {ten.length} we’d recommend in {CITY_LABEL[city]} this week.{' '}
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

function CityTabs({ city, setCity }: { city: CityChoice; setCity: (c: CityChoice) => void }) {
  return (
    <div role="tablist" aria-label="Area" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
      {(Object.keys(CITY_LABEL) as CityChoice[]).map((c) => (
        <button
          key={c}
          role="tab"
          aria-selected={city === c}
          onClick={() => setCity(c)}
          className={`shrink-0 border border-ink px-3.5 py-2 text-[14px] font-semibold transition-colors ${city === c ? 'bg-ink text-paper' : 'hover:bg-yellow'}`}
        >
          {CITY_LABEL[c]}
        </button>
      ))}
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

function Meta({ p }: { p: Pick }) {
  return (
    <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-[14.5px]">
      <dt className="caps pt-[3px] text-mute">When</dt>
      <dd>{whenOf(p)}</dd>
      <dt className="caps pt-[3px] text-mute">Where</dt>
      <dd>
        {p.venue.name}
        {p.venue.address && <span className="text-mute">, {p.venue.address.replace(/, (New York|Princeton|Philadelphia|Brooklyn)( \(NYC\))?$/, '')}</span>}
      </dd>
      {(p.price || p.isFree) && (
        <>
          <dt className="caps pt-[3px] text-mute">Price</dt>
          <dd>{p.price ?? 'Free'}</dd>
        </>
      )}
    </dl>
  )
}

function Actions({ p, date }: { p: Pick; date: string }) {
  const { shortlist, toggleShortlist } = usePrefs()
  const [note, setNote] = useState('')
  const on = shortlist(date).includes(p.id)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={p.link} target="_blank" rel="noreferrer" className="btn btn-solid">
        {linkLabel(p)} ↗
      </a>
      <button
        className={`btn ${on ? 'border-pink bg-pink text-ink hover:border-ink' : ''}`}
        aria-pressed={on}
        onClick={() => {
          const r = toggleShortlist(date, p.id)
          setNote(r === 'full' ? `You’ve picked ${SHORTLIST_MAX}. Remove one first.` : '')
        }}
      >
        <span aria-hidden>{on ? '★' : '☆'}</span> {on ? 'In your three' : 'Add to my three'}
      </button>
      {!p.exhibition && (
        <a href={calendarUrl(p)} target="_blank" rel="noreferrer" className="link px-2 text-[14px] text-ink-2">
          Add to calendar
        </a>
      )}
      {note && <p className="w-full text-[13px] font-semibold text-ink-2">{note}</p>}
    </div>
  )
}

function Kicker({ p, n }: { p: Pick; n?: number }) {
  return (
    <p className="caps flex flex-wrap items-center gap-x-2 text-ink-2">
      {n && <span className="sr-only">Number {n}.</span>}
      <span>{p.kind}</span>
      <span className="text-mute">·</span>
      <span>{CITY_LABEL[p.city]}</span>
      <span className="text-mute">·</span>
      <span>{shortDay(p)}</span>
      {isPast(p) && <span className="bg-paper-2 px-1.5 py-0.5 text-mute">Happened</span>}
    </p>
  )
}

function Lead({ r, date }: { r: Ranked; date: string }) {
  const p = r.pick
  return (
    <article className="rise mt-10 grid gap-6 md:mt-14 lg:grid-cols-[1.25fr_1fr] lg:gap-12" aria-label="Number one">
      <div>
        <PickImage pick={p} sizes="hero" className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-[5/6]" />
      </div>
      <div className="flex flex-col lg:pt-2">
        <div className="flex items-start gap-4">
          <span className="numeral text-[132px] md:text-[176px]" aria-hidden>
            <Misreg>1</Misreg>
          </span>
          <div className="pt-3">
            <p className="stamp text-[12px] text-pink">This week’s number one</p>
            {r.reason && <p className="mt-2 inline-block bg-yellow px-1.5 py-0.5 text-[12.5px] font-semibold">{r.reason}</p>}
          </div>
        </div>
        <div className="mt-4">
          <Kicker p={p} n={1} />
        </div>
        <h2 className="display mt-3 text-[56px] md:text-[80px]">{p.title}</h2>
        <p className="serif mt-5 text-[23px] text-ink md:text-[27px]">{p.why}</p>
        <div className="mt-7 border-t hairline pt-5">
          <Meta p={p} />
        </div>
        <div className="mt-6">
          <Actions p={p} date={date} />
        </div>
      </div>
    </article>
  )
}

function Entry({ r, n, date }: { r: Ranked; n: number; date: string }) {
  const p = r.pick
  return (
    <li className={`grid gap-x-8 gap-y-4 border-b hairline py-9 md:grid-cols-[110px_1fr_minmax(260px,360px)] md:py-12 ${isPast(p) ? 'opacity-60' : ''}`}>
      <div className="flex items-baseline gap-4 md:block">
        <span className="numeral text-[76px] md:text-[104px]" aria-hidden>
          <Misreg>{String(n)}</Misreg>
        </span>
        <div className="md:hidden">
          <Kicker p={p} n={n} />
        </div>
      </div>
      <div className="min-w-0 md:pt-2">
        <div className="hidden md:block">
          <Kicker p={p} n={n} />
        </div>
        {r.reason && <p className="mt-2 inline-block bg-yellow px-1.5 py-0.5 text-[12.5px] font-semibold">{r.reason}</p>}
        <h3 className="display mt-2 text-[40px] md:mt-3 md:text-[52px]">{p.title}</h3>
        <div className="mt-4 md:hidden">
          <PickImage pick={p} className="aspect-[4/3]" />
        </div>
        <p className="serif mt-4 text-[20px] md:text-[22px]">{p.why}</p>
        <div className="mt-5">
          <Meta p={p} />
        </div>
        <div className="mt-5">
          <Actions p={p} date={date} />
        </div>
      </div>
      <div className="hidden md:block md:pt-3">
        <PickImage pick={p} className="aspect-[4/3]" />
      </div>
    </li>
  )
}

function Eat({ places, city }: { places: PlacePick[]; city: CityChoice }) {
  if (!places.length) return null
  return (
    <section className="mt-24 md:mt-32" aria-labelledby="eat">
      <div className="flex flex-col gap-2 border-t-[3px] border-ink pt-4 md:flex-row md:items-end md:justify-between">
        <h2 id="eat" className="display text-[56px] md:text-[96px]">
          And <Misreg>10</Misreg> places to eat
        </h2>
        <p className="stamp text-[12px] text-ink-2 md:pb-3">{city === 'all' ? 'New York · Philadelphia · Princeton' : CITY_LABEL[city]}</p>
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
