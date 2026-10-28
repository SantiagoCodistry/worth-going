// Someone's three picks for the week, as a shareable page.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Edition, Pick } from '../shared/edition.ts'
import { CITY_LABEL, calendarUrl, loadEdition, weekLabel, whenOf } from '../lib/edition.ts'
import { appUrl, shareOrCopy } from '../lib/share.ts'
import { Footer, Loading, Masthead, Misreg, PickImage, Problem } from '../components/Sheet.tsx'

export function Shortlist() {
  const [params] = useSearchParams()
  const date = params.get('d') ?? ''
  const ids = (params.get('p') ?? '').split(',').filter(Boolean).slice(0, 3)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('This shortlist link is missing its edition.')
    loadEdition(date).then(setEdition, (e: Error) => setError(e.message))
  }, [date])

  if (error) return <Problem message={error} />
  if (!edition) return <Loading />
  const picks = ids.map((id) => edition.picks.find((p) => p.id === id)).filter((p): p is Pick => !!p)

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        <section className="pt-8 md:pt-14">
          <p className="stamp text-[12px]">
            From No. {edition.number} · {weekLabel(edition.weekOf)}
          </p>
          <h1 className="display mt-4 text-[18vw] sm:text-[12vw] lg:text-[150px]">
            My <Misreg>{String(picks.length || 3)}</Misreg> for this week.
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              className="btn btn-solid"
              onClick={async () => {
                const r = await shareOrCopy({ title: 'My three for this week', text: picks.map((p) => p.title).join(', '), url: appUrl(`shortlist?d=${date}&p=${ids.join(',')}`) })
                setStatus(r === 'copied' ? 'Link copied.' : r === 'failed' ? 'Couldn’t copy; use the address bar.' : '')
              }}
            >
              Share
            </button>
            <Link to={`/edition/${date}`} className="btn">
              See all ten
            </Link>
            {status && <span className="self-center text-[13px] font-semibold">{status}</span>}
          </div>
        </section>

        {picks.length === 0 && <p className="py-16 text-ink-2">None of these picks are in that edition.</p>}
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {picks.map((p, i) => (
            <li key={p.id}>
              <PickImage pick={p} className="aspect-[4/5]" />
              <div className="mt-4 flex items-baseline gap-3">
                <span className="numeral text-[72px]" aria-hidden>
                  <Misreg>{String(i + 1)}</Misreg>
                </span>
                <p className="caps text-ink-2">
                  {p.kind} · {CITY_LABEL[p.city]}
                </p>
              </div>
              <h2 className="display mt-2 text-[40px]">{p.title}</h2>
              <p className="serif mt-3 text-[19px]">{p.why}</p>
              <p className="mt-4 text-[14.5px]">{whenOf(p)}</p>
              <p className="text-[14.5px] text-ink-2">{p.venue.name}</p>
              <p className="mt-4 flex flex-wrap gap-2">
                <a href={p.link} target="_blank" rel="noreferrer" className="btn btn-solid">
                  Go to the listing ↗
                </a>
                {!p.exhibition && (
                  <a href={calendarUrl(p)} target="_blank" rel="noreferrer" className="btn">
                    Add to calendar
                  </a>
                )}
              </p>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </>
  )
}
