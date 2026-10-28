// Event covers. A real photo whenever we have one (the event's own artwork
// or a portrait of who's on). Until then, the cover is set like a lineup
// poster: the names on the bill, large, on the category's colour.
import { useState } from 'react'
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { categoryById } from '../shared/taxonomy.ts'

const ground = (c: CategoryId) => `var(--c-${c})`

/** Roles that support rather than headline: "…, co-host", "Fidelity, moderator". */
export const NOT_BILLED = /moderator$|(^|,\s*)(co-)?host$/i

/** The names that sell the event, for the typographic cover. */
export function headliners(e: WGEvent): string[] {
  const names = e.people?.map((p) => p.name) ?? []
  // Hosts and moderators don't headline.
  const billed = e.people?.filter((p) => !NOT_BILLED.test(p.role)).map((p) => p.name) ?? names
  if (billed.length) return billed.slice(0, 3)
  return [e.title]
}

export function Photo({
  src,
  alt = '',
  className = '',
  onFail,
}: {
  src?: string
  alt?: string
  className?: string
  onFail?: () => void
}) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setOk(false)
        onFail?.()
      }}
      className={className}
    />
  )
}

export function Cover({ event, size = 'md', className = '' }: { event: WGEvent; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [failed, setFailed] = useState(false)
  const hasPhoto = !!event.image && !failed
  const names = headliners(event)
  const type = { sm: 'text-[22px]', md: 'text-[26px] md:text-[30px]', lg: 'text-[40px] md:text-[64px]' }[size]

  return (
    <div className={`relative isolate overflow-hidden rounded-lg bg-card ${className}`} style={hasPhoto ? undefined : { background: ground(event.category) }}>
      {hasPhoto ? (
        <Photo
          src={event.image!.url}
          onFail={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
          <p className="mb-auto text-[13px] font-semibold text-ink/60">{categoryById(event.category).label}</p>
          <div className={`display ${type}`}>
            {names.map((n) => (
              <span key={n} className="block">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
