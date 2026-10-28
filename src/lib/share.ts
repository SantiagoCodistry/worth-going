// Sharing without accounts: a list is just a link that names the events and
// restaurants in it. Anyone who opens it sees the same items.
import type { WGEvent } from '../shared/types.ts'
import { whenLine } from './dates.ts'

export interface SharedList {
  events: string[]
  places: string[]
  title?: string
  by?: string
}

/** Full URL for a path inside the app, e.g. `e/some-id`. */
export function appUrl(path: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export function listPath(l: SharedList): string {
  const q = new URLSearchParams()
  if (l.events.length) q.set('e', l.events.join(','))
  if (l.places.length) q.set('p', l.places.join(','))
  if (l.title?.trim()) q.set('t', l.title.trim())
  if (l.by?.trim()) q.set('by', l.by.trim())
  return `list?${q}`
}

export function parseList(search: URLSearchParams): SharedList {
  const ids = (k: string) => (search.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60)
  return { events: ids('e'), places: ids('p'), title: search.get('t') ?? undefined, by: search.get('by') ?? undefined }
}

/** Plain-text version for group chats. */
export function listText(title: string, events: WGEvent[], places: { name: string; neighborhood: string }[], url: string): string {
  const lines = [title, '']
  for (const e of events) lines.push(`• ${e.title} — ${whenLine(e)}, ${e.venue.name}`)
  for (const p of places) lines.push(`• ${p.name} (${p.neighborhood})`)
  lines.push('', url)
  return lines.join('\n')
}

/** Opens the phone's share sheet, or copies the link where there isn't one. */
export async function shareOrCopy(data: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'failed'
    }
  }
  return copy(data.url)
}

export async function copy(text: string): Promise<'copied' | 'failed'> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
