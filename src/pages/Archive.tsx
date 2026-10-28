// Every past edition.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EditionIndexEntry } from '../shared/edition.ts'
import { editionDateLabel, loadIndex, weekLabel } from '../lib/edition.ts'
import { Footer, Loading, Masthead, Misreg, Problem } from '../components/Sheet.tsx'

export function Archive() {
  const [index, setIndex] = useState<EditionIndexEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadIndex().then(setIndex, (e: Error) => setError(e.message))
  }, [])
  if (error) return <Problem message={error} />
  if (!index) return <Loading />
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        <h1 className="display pt-10 text-[22vw] sm:text-[14vw] md:pt-14 lg:text-[170px]">
          <Misreg>Archive</Misreg>
        </h1>
        <p className="mt-4 max-w-lg text-[17px] text-ink-2">Every edition, as it was printed.</p>
        <ol className="mt-10 border-t-[3px] border-ink">
          {index.map((e) => (
            <li key={e.date} className="border-b hairline">
              <Link to={`/edition/${e.date}`} className="group grid gap-2 py-6 md:grid-cols-[140px_260px_1fr] md:items-baseline md:gap-8">
                <span className="numeral text-[64px]">No. {e.number}</span>
                <span>
                  <span className="stamp block text-[12px]">{weekLabel(e.weekOf)}</span>
                  <span className="text-[13px] text-mute">{editionDateLabel(e.date)}</span>
                </span>
                <span className="serif text-[20px] group-hover:underline">{e.top.join(' · ')} …</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </>
  )
}
