import { cityById } from '../shared/taxonomy.ts'
import { useStore } from '../lib/store.tsx'
import { Spinner } from '../components/bits.tsx'

export function About() {
  const { data } = useStore()
  if (!data) return <Spinner />
  const live = data.events.filter((e) => e.provenance === 'live').length
  const preview = data.events.length - live
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const sources = [...data.sources].sort((a, b) => Number(b.ok) - Number(a.ok) || b.count - a.count)

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="max-w-2xl pt-10 md:pt-16">
        <h1 className="display text-[72px] md:text-[128px]">About</h1>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>
            Worth Going lists events and restaurants in New York, Philadelphia and Princeton. We collect listings from public
            calendars: university lecture series, venue calendars, league schedules and startup community calendars. Then we drop
            the routine items and rank the rest.
          </p>
          <p>
            Every listing links to its original source. We don’t make up dates, prices or line-ups. When two sources disagree, the
            event page says so.
          </p>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ['Live listings', String(live), 'Fetched automatically from public feeds.'],
          ['Preview listings', String(preview), 'Added by hand for launch, each with a source link.'],
          ['Last updated', `${fmt.format(new Date(data.generatedAt))} ET`, 'Listings refresh every morning.'],
        ].map(([k, v, d]) => (
          <div key={k} className="border-[1.5px] border-ink p-5">
            <p className="text-[14px] text-mute">{k}</p>
            <p className="mt-1 text-[26px] font-medium tracking-[-0.02em] tabular-nums">{v}</p>
            <p className="mt-1 text-[14px] text-mute">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="display border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">Sources</h2>
        <p className="mt-1.5 text-[15px] text-mute">Status at the last update.</p>
        <div className="mt-5 overflow-x-auto border-[1.5px] border-ink">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">City</th>
                <th className="py-3 pr-4 font-medium">Feed type</th>
                <th className="py-3 pr-4 font-medium">Listings</th>
                <th className="py-3 pr-5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t rule align-top">
                  <td className="px-5 py-3">
                    {s.homepage ? (
                      <a href={s.homepage} target="_blank" rel="noreferrer" className="link-underline">
                        {s.name}
                      </a>
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-2">{s.city && s.city !== 'multi' ? cityById(s.city).short : 'All'}</td>
                  <td className="py-3 pr-4 text-ink-2">{s.kind}</td>
                  <td className="py-3 pr-4 tabular-nums">{s.count}</td>
                  <td className="py-3 pr-5">
                    <span className={`inline-flex items-center gap-1.5 ${s.ok ? 'text-[#7fd1a5]' : 'text-ink'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-[#7fd1a5]' : 'bg-accent'}`} />
                      {s.ok ? 'Working' : 'Unavailable'}
                    </span>
                    {s.error && (
                      <p className="mt-1 max-w-sm truncate text-[12.5px] text-mute" title={s.error}>
                        {s.error}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] text-mute">
          If a source is down, we keep its last good listings. We only use public feeds that publishers offer for reuse.
        </p>
      </section>

      <section className="mt-16 max-w-2xl">
        <h2 className="display border-t-[3px] border-ink pt-3 text-[40px] md:text-[56px]">Coming next</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
          A private version that connects to your calendar and suggests events that fit around your classes, training and meetings.
          Nothing personal is collected today, and saved items stay on your device.
        </p>
      </section>
    </div>
  )
}
