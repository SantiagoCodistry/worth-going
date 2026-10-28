// The source registry. To add a source: append an entry. Each one is
// isolated — if it fails, the run continues and the failure is reported on
// the site's Sources page.
//
// Only public, keyless endpoints that publishers offer for reuse (iCal
// subscriptions, their own REST APIs, structured data they embed for
// search engines). Ticketmaster is the one exception and is opt-in.
import { espn, mlb, nhl } from './adapters/sports.ts'
import { fromIcs, fromJsonLd, fromLuma, fromTribe } from './adapters/feeds.ts'
import { ticketmasterRegion } from './adapters/ticketmaster.ts'
import type { Source } from './adapters/types.ts'

const MSG = { city: 'nyc' as const, venue: 'Madison Square Garden', address: '4 Pennsylvania Plaza, New York' }
const BARCLAYS = { city: 'nyc' as const, venue: 'Barclays Center', address: '620 Atlantic Ave, Brooklyn' }
const XFINITY = { city: 'philly' as const, venue: 'Xfinity Mobile Arena', address: '3601 S Broad St, Philadelphia' }
const PRINCETON_STADIUM = { city: 'princeton' as const, venue: 'Princeton Stadium', address: 'Princeton University' }
const JADWIN = { city: 'princeton' as const, venue: 'Jadwin Gymnasium', address: 'Princeton University' }

export const SOURCES: Source[] = [
  // ——— Princeton ———
  {
    id: 'planet-princeton',
    name: 'Planet Princeton community calendar',
    homepage: 'https://planetprinceton.com/events/',
    city: 'princeton',
    kind: 'tribe',
    category: 'ideas',
    fetch: (ctx) =>
      fromTribe('https://planetprinceton.com', { city: 'princeton', category: 'ideas', sourceName: 'Planet Princeton', homepage: 'https://planetprinceton.com/events/' }, ctx),
  },


  {
    id: 'arts-council-princeton',
    name: 'Arts Council of Princeton',
    homepage: 'https://artscouncilofprinceton.org/events/',
    city: 'princeton',
    kind: 'tribe',
    category: 'art',
    fetch: (ctx) =>
      fromTribe('https://artscouncilofprinceton.org', { city: 'princeton', category: 'art', sourceName: 'Arts Council of Princeton', homepage: 'https://artscouncilofprinceton.org/events/' }, ctx),
  },
  {
    id: 'princeton-history',
    name: 'Historical Society of Princeton',
    homepage: 'https://www.princetonhistory.org/events/',
    city: 'princeton',
    kind: 'ics',
    category: 'unusual',
    fetch: (ctx) =>
      fromIcs('https://www.princetonhistory.org/?ical=1', { city: 'princeton', category: 'unusual', sourceName: 'Historical Society of Princeton', homepage: 'https://www.princetonhistory.org/events/', include: /tour|walk|talk|lecture|night|history|cemetery/i }, ctx),
  },
  {
    id: 'princeton-football',
    name: 'Princeton Tigers football (ESPN)',
    homepage: 'https://goprincetontigers.com/sports/football/schedule',
    city: 'princeton',
    kind: 'espn',
    category: 'sports',
    fetch: (ctx) =>
      espn('football/college-football', '163', { ...PRINCETON_STADIUM, league: 'Ivy League football', sourceUrl: 'https://goprincetontigers.com/sports/football/schedule' }, ctx),
  },
  {
    id: 'princeton-mbb',
    name: 'Princeton Tigers men’s basketball (ESPN)',
    homepage: 'https://goprincetontigers.com/sports/mens-basketball/schedule',
    city: 'princeton',
    kind: 'espn',
    category: 'sports',
    fetch: (ctx) =>
      espn('basketball/mens-college-basketball', '163', { ...JADWIN, league: 'Men’s college basketball', sourceUrl: 'https://goprincetontigers.com/sports/mens-basketball/schedule' }, ctx),
  },

  // ——— New York ———
  {
    id: 'luma-nyc',
    name: 'Luma — New York',
    homepage: 'https://luma.com/nyc',
    city: 'nyc',
    kind: 'luma',
    category: 'unusual',
    fetch: (ctx) =>
      fromLuma('nyc', { city: 'nyc', category: 'unusual', sourceName: 'Luma', homepage: 'https://luma.com/nyc' }, ctx),
  },
  {
    id: 'columbia-entrepreneurship',
    name: 'Columbia Entrepreneurship',
    homepage: 'https://entrepreneurship.columbia.edu/events/',
    city: 'nyc',
    kind: 'tribe',
    category: 'startups',
    fetch: (ctx) =>
      fromTribe('https://entrepreneurship.columbia.edu', { city: 'nyc', category: 'startups', sourceName: 'Columbia Entrepreneurship', homepage: 'https://entrepreneurship.columbia.edu/events/' }, ctx),
  },


  {
    id: 'bell-house',
    name: 'The Bell House',
    homepage: 'https://www.thebellhouseny.com/calendar',
    city: 'nyc',
    kind: 'jsonld',
    category: 'comedy',
    fetch: (ctx) =>
      fromJsonLd('https://www.thebellhouseny.com/calendar', { city: 'nyc', category: 'comedy', sourceName: 'The Bell House', homepage: 'https://www.thebellhouseny.com/calendar' }, ctx),
  },

  { id: 'knicks', name: 'New York Knicks (NBA)', homepage: 'https://www.nba.com/knicks/schedule', city: 'nyc', kind: 'espn', category: 'sports',
    fetch: (ctx) => espn('basketball/nba', '18', { ...MSG, league: 'NBA', sourceUrl: 'https://www.nba.com/knicks/schedule' }, ctx) },
  { id: 'nets', name: 'Brooklyn Nets (NBA)', homepage: 'https://www.nba.com/nets/schedule', city: 'nyc', kind: 'espn', category: 'sports',
    fetch: (ctx) => espn('basketball/nba', '17', { ...BARCLAYS, league: 'NBA', sourceUrl: 'https://www.nba.com/nets/schedule' }, ctx) },
  { id: 'rangers', name: 'New York Rangers (NHL)', homepage: 'https://www.nhl.com/rangers/schedule', city: 'nyc', kind: 'nhl', category: 'sports',
    fetch: (ctx) => nhl('NYR', { ...MSG, league: 'NHL', sourceUrl: 'https://www.nhl.com/rangers/schedule' }, ctx) },
  { id: 'yankees', name: 'New York Yankees (MLB)', homepage: 'https://www.mlb.com/yankees/schedule', city: 'nyc', kind: 'mlb', category: 'sports',
    fetch: (ctx) => mlb(147, { city: 'nyc', venue: 'Yankee Stadium', address: '1 E 161st St, Bronx', league: 'MLB', sourceUrl: 'https://www.mlb.com/yankees/schedule' }, ctx) },
  { id: 'mets', name: 'New York Mets (MLB)', homepage: 'https://www.mlb.com/mets/schedule', city: 'nyc', kind: 'mlb', category: 'sports',
    fetch: (ctx) => mlb(121, { city: 'nyc', venue: 'Citi Field', address: '41 Seaver Way, Queens', league: 'MLB', sourceUrl: 'https://www.mlb.com/mets/schedule' }, ctx) },

  // ——— Philadelphia ———
  {
    id: 'luma-philly',
    name: 'Luma — Philadelphia',
    homepage: 'https://luma.com/philadelphia',
    city: 'philly',
    kind: 'luma',
    category: 'unusual',
    fetch: (ctx) =>
      fromLuma('philadelphia', { city: 'philly', category: 'unusual', sourceName: 'Luma', homepage: 'https://luma.com/philadelphia' }, ctx),
  },
  {
    id: 'punchline-philly',
    name: 'Punch Line Philly',
    homepage: 'https://www.punchlinephilly.com/shows',
    city: 'philly',
    kind: 'jsonld',
    category: 'comedy',
    fetch: (ctx) =>
      fromJsonLd('https://www.punchlinephilly.com/shows', { city: 'philly', category: 'comedy', sourceName: 'Punch Line Philly', homepage: 'https://www.punchlinephilly.com/shows' }, ctx),
  },
  { id: 'sixers', name: 'Philadelphia 76ers (NBA)', homepage: 'https://www.nba.com/sixers/schedule', city: 'philly', kind: 'espn', category: 'sports',
    fetch: (ctx) => espn('basketball/nba', '20', { ...XFINITY, league: 'NBA', sourceUrl: 'https://www.nba.com/sixers/schedule' }, ctx) },
  { id: 'flyers', name: 'Philadelphia Flyers (NHL)', homepage: 'https://www.nhl.com/flyers/schedule', city: 'philly', kind: 'nhl', category: 'sports',
    fetch: (ctx) => nhl('PHI', { ...XFINITY, league: 'NHL', sourceUrl: 'https://www.nhl.com/flyers/schedule' }, ctx) },
  { id: 'phillies', name: 'Philadelphia Phillies (MLB)', homepage: 'https://www.mlb.com/phillies/schedule', city: 'philly', kind: 'mlb', category: 'sports',
    fetch: (ctx) => mlb(143, { city: 'philly', venue: 'Citizens Bank Park', address: '1 Citizens Bank Way, Philadelphia', league: 'MLB', sourceUrl: 'https://www.mlb.com/phillies/schedule' }, ctx) },
  { id: 'eagles', name: 'Philadelphia Eagles (ESPN)', homepage: 'https://www.philadelphiaeagles.com/schedule/', city: 'philly', kind: 'espn', category: 'sports',
    fetch: (ctx) => espn('football/nfl', '21', { city: 'philly', venue: 'Lincoln Financial Field', address: '1 Lincoln Financial Field Way, Philadelphia', league: 'NFL', sourceUrl: 'https://www.philadelphiaeagles.com/schedule/' }, ctx) },

  // ——— Region-wide, needs a free key ———
  { id: 'ticketmaster', name: 'Ticketmaster (whole region)', homepage: 'https://www.ticketmaster.com/', city: 'multi', kind: 'ticketmaster', category: 'music',
    enabled: !!process.env.TICKETMASTER_API_KEY, fetch: (ctx) => ticketmasterRegion(ctx) },
]
