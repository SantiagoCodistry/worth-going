// Sharing without accounts: a link carries everything (which edition, which picks).

/** Full URL for a path inside the app, e.g. `shortlist?…`. */
export function appUrl(path: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** Opens the phone's share sheet (group chats, Instagram…), or copies the link where there isn't one. */
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
