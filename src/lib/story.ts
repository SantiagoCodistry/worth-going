// "Share to story": draws a 1080×1920 image of an event in the site's
// riso-poster style, then hands it to the phone's share sheet (Instagram,
// Snapchat, Messages…) or downloads it. Instagram has no web API for posting
// stories, so the share sheet is the way in.
import type { CategoryId, WGEvent } from '../shared/types.ts'
import { cityById } from '../shared/taxonomy.ts'

const W = 1080
const H = 1920
const INK = '#161514'
const PAPER = '#f2f0e9'
const PINK = '#ff48b0'
const BG: Record<CategoryId, string> = {
  unusual: '#ff48b0',
  comedy: '#ff6c2f',
  ideas: '#ffe800',
  music: '#0078bf',
  startups: '#00a95c',
  art: '#00838a',
  sports: '#3255a4',
  dining: '#ff6c2f',
}
const LIGHT_TEXT = new Set<CategoryId>(['music', 'startups', 'art', 'sports'])

/** Condensed type for the display face, where the browser supports it. */
function setStretch(ctx: CanvasRenderingContext2D, v: 'normal' | 'extra-condensed') {
  const c = ctx as CanvasRenderingContext2D & { fontStretch?: string }
  if ('fontStretch' in c) c.fontStretch = v
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = url
    setTimeout(() => ok(null), 6000)
  })
}

/** Break text into lines that fit `maxWidth`, shrinking the font until it fits `maxLines`. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxWidth: number, maxLines: number) {
  for (let px = start; px >= 40; px -= 6) {
    ctx.font = font(px)
    const lines: string[] = []
    let line = ''
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= maxWidth) line = next
      else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { px, lines }
  }
  ctx.font = font(40)
  return { px: 40, lines: [text.slice(0, 60)] }
}

export interface StoryText {
  label: string
  title: string
  when: string
  where: string
  who?: string
  url: string
}

export async function drawStory(e: WGEvent, t: StoryText): Promise<Blob> {
  await Promise.all([
    document.fonts.load('800 100px "Anybody Variable"'),
    document.fonts.load('600 40px "Archivo Variable"'),
  ]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const bg = BG[e.category] ?? PINK
  const fg = LIGHT_TEXT.has(e.category) ? PAPER : INK
  const display = (px: number) => `800 extra-condensed ${px}px "Anybody Variable", "Arial Narrow", sans-serif`
  const body = (px: number, weight = 600) => `${weight} ${px}px "Archivo Variable", Arial, sans-serif`

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  // Top: the photo if it can be drawn (some hosts block it), otherwise a block of the category ink.
  const photoH = 940
  const img = e.image ? await loadImage(e.image.url) : null
  let drewPhoto = false
  if (img) {
    try {
      const scale = Math.max(W / img.width, photoH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (W - w) / 2, (photoH - h) / 2.6, w, h)
      ctx.getImageData(0, 0, 1, 1) // throws if the image tainted the canvas
      drewPhoto = true
    } catch {
      drewPhoto = false
    }
  }
  if (!drewPhoto) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, photoH)
    // No photo: the date, poster-size, so the title isn't printed twice.
    ctx.fillStyle = fg
    setStretch(ctx, 'extra-condensed')
    const [day, ...rest] = t.when.toUpperCase().split(' · ')[0].split(' ')
    ctx.font = display(250)
    ctx.fillText(day, 80, photoH - 330)
    ctx.font = display(320)
    ctx.fillText(rest.join(' '), 80, photoH - 70, W - 160)
    setStretch(ctx, 'normal')
  }

  // Date stamp chip over the photo (the no-photo version already shows the date large).
  if (drewPhoto) {
  setStretch(ctx, 'normal')
  ctx.font = body(40, 800)
  const stamp = t.when.toUpperCase()
  const sw = ctx.measureText(stamp).width
  ctx.fillStyle = PAPER
  ctx.fillRect(64, 64, sw + 48, 74)
  ctx.fillStyle = INK
  ctx.fillText(stamp, 88, 116)
  }

  // Text block.
  let y = photoH + 100
  ctx.fillStyle = INK
  ctx.font = body(36, 700)
  ctx.fillText(t.label.toUpperCase(), 80, y)
  y += 40
  setStretch(ctx, 'extra-condensed')
  const title = fit(ctx, t.title.toUpperCase(), display, 170, W - 160, 3)
  ctx.font = display(title.px)
  for (const l of title.lines) {
    y += title.px * 0.95
    // Pink misregistration, as on the wordmark.
    ctx.fillStyle = PINK
    ctx.fillText(l, 84, y + 4)
    ctx.fillStyle = INK
    ctx.fillText(l, 80, y)
  }
  setStretch(ctx, 'normal')
  y += 70
  const limit = H - 340
  if (t.who && y < limit) {
    const who = fit(ctx, t.who, (px) => body(px, 600), 44, W - 160, 2)
    ctx.font = body(who.px, 600)
    for (const l of who.lines) {
      if (y > limit) break
      ctx.fillText(l, 80, y)
      y += who.px * 1.3
    }
    y += 10
  }
  ctx.fillStyle = '#3d3b37'
  const where = fit(ctx, t.where, (px) => body(px, 500), 40, W - 160, 2)
  ctx.font = body(where.px, 500)
  for (const l of where.lines) {
    if (y > limit + 20) break
    ctx.fillText(l, 80, y)
    y += where.px * 1.3
  }

  // Footer: wordmark and link, above Instagram's reply bar.
  ctx.fillStyle = INK
  ctx.fillRect(80, H - 300, W - 160, 4)
  setStretch(ctx, 'extra-condensed')
  ctx.font = display(96)
  ctx.fillStyle = PINK
  ctx.fillText('WORTH GOING', 84, H - 196)
  ctx.fillStyle = INK
  ctx.fillText('WORTH GOING', 80, H - 200)
  setStretch(ctx, 'normal')
  ctx.font = body(32, 500)
  ctx.fillText(t.url.replace(/^https?:\/\//, ''), 80, H - 140, W - 160)

  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('Could not make the image'))), 'image/png'))
}

/** Share sheet with the image where the device supports it; otherwise download it. */
export async function shareStory(e: WGEvent, t: StoryText): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawStory(e, t)
  const file = new File([blob], `${e.id}-story.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t.title, text: `${t.title} — ${t.url}` })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return 'downloaded'
}

export const storyWhere = (e: WGEvent) => `${e.venue.name}, ${cityById(e.city).short}${e.price ? ` · ${e.price}` : e.isFree ? ' · Free' : ''}`
