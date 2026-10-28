import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categoryById, cityById } from '../shared/taxonomy.ts'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar.ts'
import { exhibitionLine, fullDate, timeLabel, whenLine } from '../lib/dates.ts'
import { rank } from '../lib/recommend.ts'
import { useStore } from '../lib/store.tsx'
import { Avatar, EventCard } from '../components/Cards.tsx'
import { Cover, formatOf, summaryOf } from '../components/Poster.tsx'
import { clashes } from '../lib/profile.ts'
import { SaveButton, ShareButton, Spinner } from '../components/bits.tsx'
import { appUrl } from '../lib/share.ts'

// Sandboxed previews block file downloads, so the .ics button is hidden there.
const canDownload = import.meta.env.VITE_ROUTER !== 'memory'

export function EventPage() {
  const { id } = useParams()
  const { data, byId, profile } = useStore()
  const e = id ? byId(id) : undefined

  useEffect(() => {
    if (e) document.title = `${e.title} · Worth Going`
    return () => {
      document.title = 'Worth Going'
    }
  }, [e])

  if (!data) return <Spinner />
  if (!e)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-[20px] font-semibold">This event is no longer listed.</p>
        <p className="mt-2 text-mute">It may have already happened, or the organizer removed it.</p>
        <Link to="/explore" className="btn btn-quiet mt-6">
          Browse the calendar
        </Link>
      </div>
    )

  const cat = categoryById(e.category)
  const clash = clashes(e, profile.busy)
  const t = timeLabel(e)
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue.name, e.venue.address].filter(Boolean).join(', '))}`
  const related = rank(data.events, { city: e.city, when: 'month' })
    .filter((x) => x.id !== e.id && (x.category === e.category || x.city === e.city))
    .slice(0, 4)
  const checked = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(e.checkedAt),
  )
  const when = e.kind === 'exhibition' ? exhibitionLine(e) : `${fullDate(e)}${t ? ` · ${t}` : ' · Time not announced yet'}`
  const whoTitle = e.category === 'ideas' || e.category === 'startups' ? 'Who’s speaking' : 'Who’s on'

  return (
    <article className="rise mx-auto max-w-[1400px] px-4 md:px-8">
      <nav className="label flex items-center gap-2 pt-6" aria-label="Breadcrumb">
        <Link to="/explore" className="hover:text-ink">
          Calendar
        </Link>
        <span>/</span>
        <Link to={`/explore?cat=${e.category}`} className="hover:text-ink">
          {cat.label}
        </Link>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Cover e={e} className="aspect-[4/3] rounded-[3px] lg:aspect-[4/5]" />
          {e.image?.credit && (
            <p className="mt-2 text-[12px] text-mute">
              Image:{' '}
              {e.image.link ? (
                <a href={e.image.link} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {e.image.credit}
                </a>
              ) : (
                e.image.credit
              )}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="label">
            {formatOf(e)} · {cityById(e.city).name}
          </p>
          <h1 className="display mt-2 text-[56px] md:text-[92px]">{e.title}</h1>
          {e.subtitle && <p className="mt-3 text-[18px] text-ink-2">{e.subtitle}</p>}
          <p className="mt-4 text-[18px] leading-relaxed">{summaryOf(e)}</p>
          {clash && (
            <p className="mt-3 rounded-[3px] bg-[var(--riso-pink)] px-3 py-2 text-[14px] font-semibold">
              This overlaps with {clash.label}.
            </p>
          )}

          <div className="mt-6 space-y-1 border-y-[1.5px] border-ink py-4 text-[16px]">
            <p className="stamp text-[15px]">{when}</p>
            <p className="text-ink-2">
              {e.venue.name}
              {e.venue.address ? `, ${e.venue.address}` : ''}
            </p>
            <p className="text-ink-2">{e.price ?? (e.isFree ? 'Free' : 'Price on the listing')}</p>
          </div>
          {e.note && <p className="mt-3 text-[14px] text-mute">Note: {e.note}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <a href={e.ticketUrl ?? e.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-accent">
              {e.ticketUrl ? 'Tickets' : 'Go to listing'} ↗
            </a>
            <SaveButton id={e.id} label className="btn btn-quiet" />
            <ShareButton title={e.title} text={`${e.title} — ${whenLine(e)}, ${e.venue.name}`} url={appUrl(`e/${e.id}`)} />
            <a href={googleCalendarUrl(e)} target="_blank" rel="noreferrer" className="btn btn-quiet">
              Google Calendar
            </a>
            {canDownload && (
              <button onClick={() => downloadIcs(e)} className="btn btn-quiet">
                Apple / Outlook
              </button>
            )}
            <a href={maps} target="_blank" rel="noreferrer" className="btn btn-quiet">
              Map
            </a>
          </div>

          {e.description.trim() !== summaryOf(e) && (
            <section className="mt-10">
              <h2 className="display text-[36px]">About</h2>
              <div className="prose-wg mt-2 text-[16px] leading-relaxed text-ink-2">
                {e.description.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {e.people && e.people.length > 0 && (
            <section className="mt-10">
              <h2 className="display text-[36px]">{whoTitle}</h2>
              <ul className="mt-3 border-t-[1.5px] border-ink">
                {e.people.map((p) => (
                  <li key={p.name} className="flex items-center gap-4 border-b-[1.5px] border-ink py-4">
                    <Avatar p={p} size={56} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-bold leading-tight">{p.name}</p>
                      <p className="mt-0.5 text-[14.5px] text-ink-2">{p.role}</p>
                    </div>
                    {p.wiki && (
                      <a
                        href={`https://en.wikipedia.org/wiki/${p.wiki}`}
                        target="_blank"
                        rel="noreferrer"
                        className="label shrink-0 hover:underline"
                      >
                        Bio ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {e.why && (
            <section className="mt-10">
              <h2 className="display text-[36px]">Why go</h2>
              <p className="mt-2 text-[18px] leading-relaxed text-ink-2">{e.why}</p>
            </section>
          )}


          <p className="mt-10 border-t rule pt-4 text-[13px] text-mute">
            {e.provenance === 'preview' ? 'Preview listing, added by hand' : 'Fetched automatically'} on {checked} from{' '}
            <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
              {e.sourceName}
            </a>
            . Check details there before you go.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="display mb-5 border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">More like this</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-5 lg:grid-cols-4">
            {related.map((x) => (
              <EventCard key={x.id} e={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
