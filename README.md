# Worth Going

**10 things worth leaving the house for**, around Princeton, New York and Philadelphia. One hand-picked list every Thursday, plus ten places to eat.

One page. No accounts, no database, no paid services. React, TypeScript, Vite and Tailwind, hosted free on GitHub Pages.

---

## Run it

```bash
npm install
npm run ingest    # fetch listings → public/data/events.json (optional; the repo has a recent copy)
npm run edition   # build the weekly editions → public/data/editions/
npm run dev       # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run draft` | Draft next Thursday's edition from the strongest upcoming listings |
| `npm run edition` | Freeze editions with verified details and photos |
| `npm test` | Unit tests (offline) |
| `npm run build` | Static build into `dist/` |

## Making the weekly edition

Each edition is one small file, `editions/YYYY-MM-DD.ts` (the Thursday it comes out). It covers Thursday to the following Wednesday.

1. **Draft.** On Tuesday or Wednesday run `npm run draft`. It writes `editions/<next-thursday>.draft.ts` with up to 25 candidates per area, each with its id, date, venue and who the headliner is.
2. **Pick.** Keep the best, best first: the first ten are the overall list, and each area's list is the first ten in that area, so aim for about ten per area. For each, write one sentence in `why`: the concrete reason to go, not an adjective. Override `title`, `kind` ("Fado concert"), `link`, `price` or `city` if the listing needs it, and add `wiki: 'Page_Name'` to use a Wikipedia photo when there isn't one.
3. **Check.** Open each `link` and confirm the date, time and venue. If something can't be confirmed, leave it out.
4. **Restaurants.** List ten ids per area from `src/data/places.ts` (add a place there first, with its source).
5. **Publish.** Rename the file to `YYYY-MM-DD.ts`, run `npm run edition`, commit and push. The site switches to it on Thursday.

Events you write by hand (not from the listings) can go straight into `picks` with all their fields; see `Pick` in `src/shared/edition.ts`. Never add an event you haven't found on its organizer's or ticket seller's site.

Past editions are frozen in `public/data/editions/` and stay in the archive after their events drop out of the feeds.

## Where listings come from

`npm run ingest` (and the daily GitHub Action) collects public listings into `public/data/events.json`: Planet Princeton, the Arts Council of Princeton and the Historical Society of Princeton, Luma for New York and Philadelphia, Songkick metro listings, the Bell House, Irving Plaza, New York Comedy Club, Helium, Punch Line and the Fillmore Philadelphia, and league schedules (ESPN, MLB, NHL). Hand-researched listings live in `ingest/seed/preview.ts`. Photos come from Wikipedia and Wikimedia Commons or the organizer's own page, and are checked for size. Adding a source: one entry in `ingest/sources.ts`.

Those listings are the editor's candidate pool. Only the picks in an edition appear on the site.

## Deploy

`.github/workflows/site.yml` runs daily and on every push: tests, `ingest`, `edition`, a static build, then GitHub Pages. It commits refreshed data back to the repo and saves desktop and phone screenshots to the `screenshots` branch.

## Optional extras

All free; leave them unset and the page simply doesn't show them.

- **Email signup** with [Buttondown](https://buttondown.com) (free up to 100 subscribers): set the repository variable `VITE_BUTTONDOWN_USER` to your Buttondown username. Without it, readers get a Thursday calendar reminder and RSS (`/feed.xml`).
- **Spotify**, so shows by artists you play move up: create an app at developer.spotify.com, add the redirect URI `https://<you>.github.io/worth-going/spotify`, and set the repository variable `VITE_SPOTIFY_CLIENT_ID`. New Spotify apps only allow accounts you add under User Management.
- **Ticketmaster** listings in the candidate pool: repository secret `TICKETMASTER_API_KEY` (free).

## Privacy and legal

`/privacy` and `/terms` (`src/pages/Legal.tsx`) are plain-language starting points. Have a lawyer review them.

Built with [Codistry](https://codistry.com).
