// Edition 1 — Thursday, October 29, 2026 (covers Thu Oct 29 – Wed Nov 4).
// Every pick was checked against its organizer's listing or a ticketing page on
// October 28. See README → "Making the weekly edition".
import type { EditionSource } from '../src/shared/edition.ts'

const edition: EditionSource = {
  date: '2026-10-29',
  number: 1,
  picks: [
    // ——— The overall ten, in order ———
    { event: 'village-halloween-parade-2026', why: 'Fifty thousand people in costume march up Sixth Avenue, and anyone dressed up can join in. No ticket, no RSVP.' },
    { event: 'songkick-mariza-2026-10-29', kind: 'Fado concert', wiki: 'Mariza', city: 'princeton', why: 'Mariza is the best-known fado singer of her generation, and Portugal’s music of longing sounds best in a room like McCarter’s.', link: 'https://www.mccarter.org/' },
    { event: 'tcs-nyc-marathon-2026', wiki: 'New_York_City_Marathon', why: 'The best free show in the city: about 50,000 runners, two million people cheering, and First Avenue at its loudest around mile 17.' },
    {
      id: 'ny-night-train-haunted-hop-2026',
      city: 'nyc',
      category: 'music',
      kind: 'Halloween dance party',
      title: 'The Haunted Hop',
      why: 'New York Night Train’s 21st Halloween soul party: DJ Jonathan Toubin, go-go dancers and Moogstar, the vocoder player from Zapp and Cameo, in a former glass factory.',
      start: '2026-10-30T23:00:00.000Z',
      venue: { name: 'Knockdown Center', address: '52-19 Flushing Ave, Queens', lat: 40.7155, lng: -73.9182 },
      price: '21+',
      link: 'https://app.discotech.me/events/38259080-new-york-night-train-21st-annual-haunted-hop-devils-night-edition-at-knockdown-center',
      sourceName: 'Discotech',
    },
    { event: 'songkick-vince-staples-2026-10-31', kind: 'Rap show', link: 'https://www.franklinmusichall.com/', wiki: 'Vince_Staples', why: 'Vince Staples is one of the sharpest, funniest writers in rap, and Franklin Music Hall is the right size for him.' },
    { event: 'the-bell-house-wunderkammer-a-taxidermy-showcase-and-competition-2026-10-30', kind: 'Taxidermy contest', title: 'Wunderkammer', why: 'More than twenty taxidermists bring their strangest work to be judged on stage. As odd, and as funny, as it sounds.' },
    { event: 'songkick-cecile-mclorin-salvant-2026-11-01', kind: 'Jazz concert', wiki: 'Cécile_McLorin_Salvant', city: 'princeton', link: 'https://www.mccarter.org/', why: 'Three Grammys for best jazz vocal album, and a voice that makes old standards feel newly written.' },
    { event: 'songkick-machine-girl-2026-10-31', kind: 'Devil’s Night show', link: 'https://pioneerworks.org/programs/machine-girl', why: 'Machine Girl play breakneck digital hardcore that turns any room into a mosh pit, and this is Pioneer Works’ Devil’s Night show.' },
    { event: 'songkick-st-vincent-2026-10-30', kind: 'Cabaret residency', why: 'St. Vincent singing standards in the Carlyle’s small supper club, the last of three nights. Bar seats are the cheapest way in.', link: 'https://www.exploretock.com/cafecarlyle', price: 'From $175' },
    { event: 'luma-evt-egejit1g5mvurua-events-lu-ma-2026-11-03', kind: 'Film and dinner', title: 'Big Night, and a timpano', why: 'Watch Big Night, the 1996 film about two brothers and their failing Italian restaurant, then eat the timpano from its famous dinner.' },

    // ——— The rest of the pool (used for the city lists and personal ordering) ———
    { event: 'pma-duchamp-retrospective', why: 'The first North American Duchamp retrospective in more than 50 years, at the museum that owns much of his most important work.' },
    {
      id: 'nybg-dia-de-los-muertos-parade-2026',
      wiki: 'New_York_Botanical_Garden',
      city: 'nyc',
      category: 'unusual',
      kind: 'Día de los Muertos parade',
      title: 'Día de los Muertos at the Botanical Garden',
      why: 'Giant skeleton puppets and monarch butterflies parade through the Garden among marigolds and ofrendas, on the last weekend of the celebration.',
      start: '2026-11-01T19:00:00.000Z',
      venue: { name: 'New York Botanical Garden', address: '2900 Southern Blvd, Bronx', lat: 40.8623, lng: -73.877 },
      price: 'With Garden admission',
      link: 'https://www.nybg.org/',
      sourceName: 'NYC Tourism',
    },
    { event: '92ny-neil-degrasse-tyson-2026', title: 'Neil deGrasse Tyson on meeting aliens', why: 'Tyson on how we should greet the first aliens we meet, the subject of his new book. Expect jokes and a lot of physics.' },
    { event: 'planet-princeton-198590', kind: 'Book talk', wiki: 'Yiyun_Li', title: 'Yiyun Li on her new novel', why: 'Yiyun Li, one of the most admired novelists teaching at Princeton, on her new book. Free, on campus.' },
    { event: 'the-bell-house-kaiju-big-battel-satan-sleeps-tonight-2026-11-01', kind: 'Monster wrestling', wiki: 'Kaiju_Big_Battel', why: 'Grown adults in rubber monster suits wrestle and flatten a cardboard city. A cult show since the 1990s.' },
    { event: 'arts-council-of-princeton-50272', kind: 'Costume parade', wiki: 'Palmer_Square', title: 'The Hometown Halloween Parade', why: 'Princeton’s Halloween parade turns fifty: kids, dogs and whole families in costume around Palmer Square.' },
    { event: 'blue-note-robert-glasper-2026-11-01', kind: 'Jazz residency', wiki: 'Robert_Glasper', why: 'Glasper’s fall residency at the Blue Note is a New York tradition, and the late set is where it gets loose.' },
    { event: 'songkick-afro-cuban-all-stars-2026-10-30', kind: 'Cuban big band', why: 'The Cuban big band led by Juan de Marcos, who helped put together Buena Vista Social Club.' },
    { event: 'the-bell-house-the-moth-storyslam-2026-11-05', kind: 'Storytelling night', why: 'Ten strangers tell true five-minute stories and the audience scores them. Some are great; none are long.' },
    { event: 'eastern-state-halloween-nights-2026', kind: 'Haunted prison', why: 'Haunted houses inside a real 1829 prison, in the last stretch of the season.' },
    { event: 'luma-evt-h80rhu7sxttgmqi-events-lu-ma-2026-10-31', kind: 'Museum talk', title: 'Philosophy at the Cloisters', why: 'A guided conversation about medieval art inside the Cloisters, the Met’s castle-like branch above the Hudson.' },
    { event: 'songkick-olafur-arnalds-2026-11-05', kind: 'Concert', why: 'Quiet piano and strings from the Icelandic composer, in Town Hall’s warm old room.' },
    { event: 'planet-princeton-10055145', kind: 'Bell concert', title: 'Carillon concert at the Graduate College', why: 'The Graduate College carillon has 67 bells. The Sunday concerts are free and best heard from the lawn.' },
    { event: 'espn-401867831', kind: 'Ivy League football', title: 'Princeton vs. Cornell', why: 'Ivy League football at Princeton Stadium on Halloween, a short walk from Nassau Street.' },
    { event: 'songkick-boy-harsher-2026-11-01', kind: 'Synth show', why: 'Dark, danceable synth music on Halloween night.' },
    { event: 'free-library-jesse-wegman-2026', why: 'A New York Times editorial writer on a founder most people have never heard of. $5 at the Free Library.' },
    { event: 'moma-brancusi-2026', why: 'Brancusi’s polished bronzes and the studio he arranged like a work of its own, at MoMA.' },
    { event: 'arts-council-of-princeton-50290', kind: 'Festival', title: 'Day of the Dead in Princeton', why: 'The Arts Council’s free Day of the Dead celebration, for families, at the Princeton Shopping Center.' },
    { event: 'historical-society-of-princeton-1270-princetonhistory-org-2026-11-01', kind: 'Walking tour', title: 'A walk through Princeton history', why: 'Two hours on foot through Princeton’s past with the Historical Society, starting at the Battle Monument.' },
    { event: 'songkick-joanne-mcnally-2026-10-30', kind: 'Stand-up comedy', why: 'Joanne McNally, the Irish comedian behind the podcast My Therapist Ghosted Me, on tour.' },
    { event: 'planet-princeton-10053133', kind: 'Organ recital', title: 'Organ at noon in the Chapel', why: 'Half an hour of organ music in the University Chapel, one of the great Gothic rooms in New Jersey. Free, at lunchtime.' },
    { event: 'planet-princeton-198908', kind: 'Book talk', title: 'Paul Moses on The Italian Squad', why: 'Paul Moses on The Italian Squad, the true story of the immigrant cops who took on the early Mafia in New York.' },
    { event: 'songkick-guerilla-toss-2026-10-29', kind: 'Art-punk show', why: 'Guerilla Toss make wiry, joyful art-punk, and Ruba Club is small enough to stand right at the front.' },
    { event: 'songkick-bass-drum-of-death-2026-11-04', kind: 'Garage punk show', why: 'Loud, fast garage punk in Johnny Brenda’s small upstairs room.' },
  ],
  places: {
    nyc: ['kabawa', 'semma', 'torrisi', 'lei', 'l-industrie-pizzeria', 'katzs', 'thai-diner', 'lucali', 'superiority-burger', 'penny'],
    philly: ['zahav', 'kalaya', 'emmett', 'suraya', 'vernick', 'pizzeria-beddia', 'johns-roast-pork', 'el-chingon', 'reading-terminal', 'bar-cicci'],
    princeton: ['agricola', 'mistral', 'xibei', 'eno-terra', 'nomad-pizza', 'jammin-crepes', 'dinky', 'hoagie-haven', 'mamouns', 'bent-spoon'],
  },
}

export default edition
