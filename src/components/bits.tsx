import { useState } from 'react'
import { Link } from 'react-router-dom'
import { shareOrCopy } from '../lib/share.ts'
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
      className={`group/save inline-flex items-center gap-2 ${className}`}
    >
      <svg width="13" height="17" viewBox="0 0 14 18" className="transition-transform duration-150 group-active/save:scale-90">
        <path
          d="M1 1h12v16l-6-4.2L1 17z"
          fill={on ? 'var(--riso-pink)' : 'none'}
          stroke="currentColor"
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
    <span title="Added by hand for the preview. Check details at the source." className={`label inline-block text-[10.5px] text-mute ${className}`}>
      Preview listing
    </span>
  )
}

export function SectionHead({ title, blurb, to, toLabel = 'See all' }: { title: string; blurb?: string; to?: string; toLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6 border-t-[3px] border-ink pt-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="display text-[44px] md:text-[64px]">{title}</h2>
        {blurb && <p className="text-[15px] text-ink-2">{blurb}</p>}
      </div>
      {to && (
        <Link to={to} className="label shrink-0 whitespace-nowrap pb-2 hover:underline">
          {toLabel} →
        </Link>
      )}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="stamp animate-pulse text-[14px] text-mute">Loading</p>
    </div>
  )
}

/** Share sheet on phones, copy link elsewhere. Says what happened for a moment. */
export function ShareButton({ title, text, url, label = 'Share', className = 'btn btn-quiet' }: { title: string; text?: string; url: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <button
      type="button"
      className={className}
      onClick={async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const r = await shareOrCopy({ title, text, url })
        if (r === 'shared') return
        setState(r)
        setTimeout(() => setState('idle'), 2200)
      }}
    >
      <svg width="13" height="15" viewBox="0 0 13 15" aria-hidden>
        <path d="M6.5 1v9M3 4.5L6.5 1 10 4.5M1.5 8v5.5h10V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span>{state === 'copied' ? 'Link copied' : state === 'failed' ? 'Couldn’t copy' : label}</span>
    </button>
  )
}
