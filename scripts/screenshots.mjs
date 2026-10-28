// Screenshots of the deployed site, desktop and phone. Used by CI.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/')
const pages = ['', 'explore', 'table', 'you', 'e/92ny-munk-debate-liberalism-2026', 'e/nycf-marc-maron-beacon-2026', 'e/village-halloween-parade-2026', 'table/thai-diner']
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()
const report = []
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport })
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' })
    // Scroll through so lazy images load, then note any that failed.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(1500)
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src))
    if (broken.length) report.push({ page: `${name}/${p}`, broken })
    await page.screenshot({ path: `screenshots/${name}-${p.replace(/\W+/g, '_') || 'home'}.png`, fullPage: true })
  }
}
await browser.close()
writeFileSync('screenshots/broken-images.json', JSON.stringify(report, null, 1))
