// Screenshots of the deployed site, desktop and phone. Used by CI.
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const base = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/')
const pages = ['', 'explore', 'table', 'e/92ny-munk-debate-liberalism-2026', 'e/nerd-nite-nyc-nov-2026']
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport })
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `screenshots/${name}-${p.replace(/\W+/g, '_') || 'home'}.png`, fullPage: true })
  }
}
await browser.close()
