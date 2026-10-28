import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES } from '../shared/taxonomy.ts'
import { DEFAULT_PROFILE, INTERESTS, type BusyBlock, type Level } from '../lib/profile.ts'
import { useStore } from '../lib/store.tsx'

const LEVELS: { v: Level; label: string }[] = [
  { v: 0, label: 'Not for me' },
  { v: 1, label: 'Sometimes' },
  { v: 2, label: 'Love it' },
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const QUICK: Omit<BusyBlock, 'id'>[] = [
  { label: 'Swim practice', days: [1, 2, 3, 4, 5], from: '06:00', to: '08:00' },
  { label: 'Class', days: [1, 3, 5], from: '10:00', to: '12:00' },
  { label: 'Work', days: [1, 2, 3, 4, 5], from: '09:00', to: '17:00' },
]

export function You() {
  const { profile, setProfile } = useStore()
  const [draft, setDraft] = useState<Omit<BusyBlock, 'id'>>({ label: '', days: [1, 2, 3, 4, 5], from: '06:00', to: '08:00' })

  const setLevel = (id: string, v: Level) => setProfile({ ...profile, levels: { ...profile.levels, [id]: v } })
  const addBusy = (b: Omit<BusyBlock, 'id'>) =>
    setProfile({ ...profile, busy: [...profile.busy, { ...b, id: `${Date.now()}` }] })
  const removeBusy = (id: string) => setProfile({ ...profile, busy: profile.busy.filter((b) => b.id !== id) })

  return (
    <div className="mx-auto max-w-[900px] px-4 md:px-8">
      <section className="pt-8 md:pt-12">
        <h1 className="display text-[56px] md:text-[96px]">Your taste</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-2">
          This decides what shows up first on For you. It’s saved on this device only.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="display border-t-[3px] border-ink pt-3 text-[32px] md:text-[40px]">What are you into?</h2>
        <ul className="mt-4 divide-y divide-[var(--rule)]">
          {INTERESTS.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[16px] font-semibold">{i.label}</span>
              <div className="flex gap-1.5" role="radiogroup" aria-label={i.label}>
                {LEVELS.map((l) => (
                  <button
                    key={l.v}
                    role="radio"
                    aria-checked={(profile.levels[i.id] ?? 1) === l.v}
                    aria-pressed={(profile.levels[i.id] ?? 1) === l.v}
                    onClick={() => setLevel(i.id, l.v)}
                    className="chip"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="display border-t-[3px] border-ink pt-3 text-[32px] md:text-[40px]">Where are you based?</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
            <button key={c.id} aria-pressed={profile.home === c.id} onClick={() => setProfile({ ...profile, home: c.id })} className="chip">
              {c.name}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-[15px]">
          <input
            id="budget-cheap"
            type="checkbox"
            checked={profile.budget === 'cheap'}
            onChange={(e) => setProfile({ ...profile, budget: e.target.checked ? 'cheap' : 'any' })}
            className="h-4 w-4 accent-[var(--ink)]"
          />
          Prefer free and cheap things
        </label>
      </section>

      <section className="mt-12">
        <h2 className="display border-t-[3px] border-ink pt-3 text-[32px] md:text-[40px]">When are you busy?</h2>
        <p className="mt-2 text-[15px] text-ink-2">Events that start during these times are left off For you.</p>

        {profile.busy.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-rule">
            {profile.busy.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-[15px]">
                  <span className="font-semibold">{b.label}</span> · {b.days.map((d) => DAYS[d]).join(', ')} · {b.from}–{b.to}
                </span>
                <button onClick={() => removeBusy(b.id)} className="label text-[11px] underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button key={q.label} onClick={() => setDraft(q)} className="chip">
              + {q.label}
            </button>
          ))}
        </div>

        <form
          className="mt-4 grid gap-3 rounded-[3px] bg-bg-2 p-4"
          onSubmit={(ev) => {
            ev.preventDefault()
            if (!draft.label.trim() || !draft.days.length) return
            addBusy(draft)
            setDraft({ label: '', days: [1, 2, 3, 4, 5], from: '06:00', to: '08:00' })
          }}
        >
          <label className="grid gap-1 text-[14px] font-semibold">
            What
            <input
              id="busy-label"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Swim practice"
              className="border border-rule bg-card px-3 py-2 font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button
                type="button"
                key={d}
                aria-pressed={draft.days.includes(i)}
                onClick={() => setDraft({ ...draft, days: draft.days.includes(i) ? draft.days.filter((x) => x !== i) : [...draft.days, i].sort() })}
                className="chip"
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[14px] font-semibold">
              From
              <input id="busy-from" type="time" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="border border-rule bg-card px-3 py-2 font-normal" />
            </label>
            <label className="grid gap-1 text-[14px] font-semibold">
              To
              <input id="busy-to" type="time" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="border border-rule bg-card px-3 py-2 font-normal" />
            </label>
            <button type="submit" className="btn btn-accent">
              Add
            </button>
          </div>
        </form>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <Link to="/" className="btn btn-accent">
          See For you
        </Link>
        <button onClick={() => setProfile(DEFAULT_PROFILE)} className="text-[14px] underline">
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
