// Polite fetch: identifies itself, times out, never retries aggressively.
const UA = 'WorthGoing/1.0 (+https://github.com/; curated events discovery; contact via site)'

export async function get(url: string, accept = '*/*', timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept }, signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return await res.text()
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } }
    const why = err.name === 'AbortError' ? 'timed out' : (err.cause?.code ?? err.message)
    throw new Error(`${why} — ${url}`)
  } finally {
    clearTimeout(t)
  }
}

export async function getJson<T = unknown>(url: string): Promise<T> {
  return JSON.parse(await get(url, 'application/json')) as T
}

/** Strip HTML to readable plain text. */
export function plain(html = ''): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

/** First ~n characters, cut at a sentence or word boundary. */
export function excerpt(text: string, n = 420): string {
  if (text.length <= n) return text
  const cut = text.slice(0, n)
  const sentence = cut.lastIndexOf('. ')
  if (sentence > n * 0.5) return cut.slice(0, sentence + 1)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
