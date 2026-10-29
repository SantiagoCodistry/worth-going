// Checks every link and photo in the current edition. Run in CI (the dev
// container can't reach most sites): node scripts/check-links.mjs > links.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const index = JSON.parse(readFileSync('public/data/editions/index.json', 'utf8'))
const edition = JSON.parse(readFileSync(`public/data/editions/${index[0].date}.json`, 'utf8'))
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(15000) })
      if (r.ok || method === 'GET') return { status: r.status, final: r.url }
    } catch (e) {
      if (method === 'GET') return { status: 0, error: String(e.cause?.code ?? e.message) }
    }
  }
}

const rows = []
for (const p of edition.picks) {
  rows.push({ what: `${p.title} · link`, url: p.link, ...(await check(p.link)) })
  if (p.image) rows.push({ what: `${p.title} · photo`, url: p.image.url, ...(await check(p.image.url)) })
}
for (const pl of edition.places) if (pl.book) rows.push({ what: `${pl.name} · booking`, url: pl.book.url, ...(await check(pl.book.url)) })
// 403/429 from bot protection usually means the page is fine for people; anything else is worth a look.
const bad = rows.filter((r) => !(r.status >= 200 && r.status < 400) && r.status !== 403 && r.status !== 429)
mkdirSync('screenshots', { recursive: true })
writeFileSync('screenshots/links.json', JSON.stringify({ edition: edition.date, checked: rows.length, bad, rows }, null, 1))
console.log(`${rows.length} links checked, ${bad.length} need a look`)
for (const b of bad) console.log(`  ${b.status || b.error}  ${b.what}  ${b.url}`)
