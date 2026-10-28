import { Link } from 'react-router-dom'
import type { WGEvent } from '../shared/types.ts'
import { useStore } from '../lib/store.tsx'

export function SaveButton({ id, className = '', label = false }: { id: string; className?: string; label?: boolean }) {
  const { isSaved, toggleSaved } = useStore()
  const on = isSaved(id)
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        toggleSaved(id)
      }}
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save'}
      className={`group/save inline-flex items-center gap-2 transition-colors ${className}`}
    >
      <svg width="13" height="16" viewBox="0 0 14 18" className="transition-transform duration-200 group-active/save:scale-90">
        <path
          d="M1 1h12v16l-6-4.2L1 17z"
          fill={on ? 'var(--accent)' : 'none'}
          stroke={on ? 'var(--accent)' : 'currentColor'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span>{on ? 'Saved' : 'Save'}</span>}
    </button>
  )
}

export function PreviewTag({ e, className = '' }: { e: WGEvent; className?: string }) {
  if (e.provenance !== 'preview') return null
  return (
    <span title="Added by hand for the preview. Check details at the source." className={`inline-block text-[12.5px] text-mute ${className}`}>
      Preview listing
    </span>
  )
}

export function SectionHead({ title, blurb, to, toLabel = 'See all' }: { title: string; blurb?: string; to?: string; toLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6">
      <div>
        <h2 className="display text-[28px] md:text-[36px]">{title}</h2>
        {blurb && <p className="mt-1.5 text-[15px] text-mute">{blurb}</p>}
      </div>
      {to && (
        <Link to={to} className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-ink-2 hover:text-ink">
          {toLabel} →
        </Link>
      )}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="animate-pulse text-mute">Loading…</p>
    </div>
  )
}
