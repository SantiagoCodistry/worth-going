// League schedule adapters. Home games only — those are the ones in our cities.
// All endpoints are public, keyless JSON used by the leagues' own sites.
import type { CityId } from '../../src/shared/types.ts'
import { nyDateKey } from '../../src/shared/time.ts'
import { getJson } from '../lib/http.ts'
import type { Draft, FetchContext } from './types.ts'

interface Team {
  city: CityId
  venue: string
  address: string
  /** Shown in the event subtitle, e.g. "NBA". */
  league: string
  sourceUrl: string
}

const game = (id: string, t: Team, home: string, away: string, startIso: string, sourceName: string): Draft => ({
  id,
  title: `${home} vs. ${away}`,
  subtitle: t.league,
  kind: 'event',
  city: t.city,
  category: 'sports',
  tags: [t.league.toLowerCase()],
  start: startIso,
  venue: { name: t.venue, address: t.address },
  description: `${home} host the ${away} at ${t.venue}.`,
  sourceName,
  sourceUrl: t.sourceUrl,
})

const within = (iso: string, ctx: FetchContext) => {
  const t = new Date(iso).getTime()
  return t >= ctx.from.getTime() && t <= ctx.to.getTime()
}

// MLB Stats API — statsapi.mlb.com
export async function mlb(teamId: number, t: Team, ctx: FetchContext): Promise<Draft[]> {
  const day = (d: Date) => d.toISOString().slice(0, 10)
  type R = { dates: { games: { gamePk: number; gameDate: string; teams: { home: { team: { id: number; name: string } }; away: { team: { name: string } } } }[] }[] }
  const r = await getJson<R>(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${day(ctx.from)}&endDate=${day(ctx.to)}`,
  )
  return r.dates
    .flatMap((d) => d.games)
    .filter((g) => g.teams.home.team.id === teamId && within(g.gameDate, ctx))
    .map((g) => game(`mlb-${g.gamePk}`, t, g.teams.home.team.name, g.teams.away.team.name, g.gameDate, 'MLB'))
}

// NHL web API — api-web.nhle.com
export async function nhl(abbrev: string, t: Team, ctx: FetchContext): Promise<Draft[]> {
  type Side = { abbrev: string; placeName?: { default: string }; commonName?: { default: string } }
  type R = { games: { id: number; gameType: number; startTimeUTC: string; homeTeam: Side; awayTeam: Side }[] }
  const r = await getJson<R>(`https://api-web.nhle.com/v1/club-schedule-season/${abbrev}/now`)
  const name = (s: Side) => [s.placeName?.default, s.commonName?.default].filter(Boolean).join(' ') || s.abbrev
  return r.games
    .filter((g) => g.homeTeam.abbrev === abbrev && g.gameType >= 2 && within(g.startTimeUTC, ctx))
    .map((g) => game(`nhl-${g.id}`, t, name(g.homeTeam), name(g.awayTeam), g.startTimeUTC, 'NHL'))
}

// NBA static schedule — cdn.nba.com (one file for the whole league, so cache it)
type NbaSide = { teamTricode: string; teamCity: string; teamName: string }
type NbaGame = { gameId: string; gameDateTimeUTC: string; homeTeam: NbaSide; awayTeam: NbaSide }
let nbaCache: Promise<NbaGame[]> | undefined

export async function nba(tricode: string, t: Team, ctx: FetchContext): Promise<Draft[]> {
  nbaCache ??= getJson<{ leagueSchedule: { gameDates: { games: NbaGame[] }[] } }>(
    'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json',
  ).then((r) => r.leagueSchedule.gameDates.flatMap((d) => d.games))
  const games = await nbaCache
  const name = (s: NbaSide) => `${s.teamCity} ${s.teamName}`.trim()
  return games
    .filter((g) => g.homeTeam.teamTricode === tricode && within(g.gameDateTimeUTC, ctx))
    .map((g) => game(`nba-${g.gameId}`, t, name(g.homeTeam), name(g.awayTeam), g.gameDateTimeUTC, 'NBA'))
}

// ESPN team schedule — site.api.espn.com (used for NFL and college teams)
export async function espn(path: string, teamId: string, t: Team, ctx: FetchContext): Promise<Draft[]> {
  type Comp = { homeAway: 'home' | 'away'; team: { id: string; displayName: string } }
  type R = { events: { id: string; date: string; timeValid?: boolean; competitions: { competitors: Comp[]; venue?: { fullName?: string } }[] }[] }
  const r = await getJson<R>(`https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${teamId}/schedule`)
  return r.events
    .filter((e) => within(e.date, ctx))
    .map((e) => {
      const c = e.competitions[0]
      const home = c.competitors.find((x) => x.homeAway === 'home')
      const away = c.competitors.find((x) => x.homeAway === 'away')
      if (!home || !away || home.team.id !== teamId) return null
      const d = game(`espn-${e.id}`, t, home.team.displayName, away.team.displayName, e.date, 'ESPN')
      if (e.timeValid === false) {
        d.start = nyDateKey(e.date)
        d.timeTBA = true
      }
      return d
    })
    .filter((x): x is Draft => !!x)
}
