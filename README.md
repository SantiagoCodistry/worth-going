# Worth Going

Concerts, talks, startup events, games, exhibitions and restaurants in **New York, Philadelphia and Princeton**, picked by hand and linked to their sources.

Built with React, TypeScript, Vite and Tailwind CSS. No database, no accounts, no API keys.

---

## Run it

```bash
npm install
npm run ingest   # fetch real events → public/data/events.json
npm run dev      # http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: timezone/DST maths, filters, calendar export, the ICS / JSON-LD / WordPress parsers (all offline) |
| `npm run build` | Production build into `dist/` (static files only) |
| `npm run ingest -- --only=knicks,luma-nyc` | Refresh selected sources |
| `npm run ingest -- --offline` | Rebuild the data file without the network |

## How the data works

```
ingest/               runs in Node (locally or in GitHub Actions)
  sources.ts          the source registry. Add a source by adding an entry.
  adapters/           one adapter per kind of feed
    feeds.ts          iCalendar, WordPress "The Events Calendar" REST, Luma city iCal, schema.org JSON-LD
    sports.ts         MLB Stats API, NHL web API, NBA schedule CDN, ESPN team schedules
    ticketmaster.ts   optional; runs only if TICKETMASTER_API_KEY is set (free key)
  lib/enrich.ts       categorise, filter noise, ranking
  lib/media.ts        event photos (og:image) and speaker portraits/bios (Wikipedia)
  seed/preview.ts     hand-researched launch listings (labelled "Preview" in the UI)
public/data/events.json   the output the site reads at runtime
src/                  the React app
  data/places.ts      the restaurant guide (places, not scheduled events)
  lib/recommend.ts    ranking; shaped for the future personal concierge
```

**Every listing links to its original source.** Nothing is invented. If two sources disagree, the conflict appears on the event page. If a time isn't published, the page says "Time TBA".

**Failure is graceful.** Each source runs on its own. If one is down, the run keeps that source's last good listings and reports the failure on the site's *Sources* page (`/about`).

**Preview listings.** For launch, `ingest/seed/preview.ts` holds ~30 real events researched by hand on 28 Oct 2026, each with its source URL. They are always labelled *Preview listing — confirm at source*, and a matching live listing automatically replaces them. Once live feeds cover enough, set `includePreview: false` in `ingest/config.ts`.

### Adding a source

Most venues and universities publish one of: an iCal feed (`.ics`), a WordPress *The Events Calendar* site (`/wp-json/tribe/events/v1/events`), or schema.org `Event` JSON-LD in their pages. Add an entry to `ingest/sources.ts`:

```ts
{
  id: 'smalls',
  name: 'Smalls Jazz Club',
  homepage: 'https://www.smallslive.com/',
  city: 'nyc',
  kind: 'jsonld',
  category: 'music',
  fetch: (ctx) => fromJsonLd('https://www.smallslive.com/', { city: 'nyc', category: 'music', sourceName: 'Smalls', homepage: 'https://www.smallslive.com/' }, ctx),
},
```

Run `npm run ingest -- --only=smalls` to check it.

## Deploy (free, on GitHub)

1. Push this folder to a GitHub repository.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. That's it. `.github/workflows/site.yml` runs on every push and every morning. It:
   - runs the tests,
   - fetches live events, event photos (each listing's own image) and speaker portraits and bios (Wikipedia),
   - commits the refreshed `public/data/events.json`,
   - deploys the site to `https://<you>.github.io/<repo>/`,
   - screenshots the live site (download them from the run's *Artifacts*).

No secrets are needed. Optional: add `TICKETMASTER_API_KEY` as a repository secret for wider concert coverage.

Vercel and Netlify also work (build `npm run build`, output `dist`; routing config is included).

## The personal concierge (next)

`src/lib/recommend.ts` already takes a `RecommendationContext` with `interests` (category weights) and `busy` intervals (calendar commitments). It drops events that clash and boosts what you like. A private version needs three things:

1. A small server route (e.g. a Vercel function) that reads Google Calendar free/busy with OAuth.
2. A profile (interests, home city, how far you'll travel) stored per user.
3. A call to `rank(events, { city, interests, busy })`. The public site's data and UI are reused unchanged.

An AI assistant can sit on top through the same function: expose `events.json` plus `rank` as a tool, and it can answer "what fits around swim practice this week?".

---

Built with [Codistry](https://codistry.com).
