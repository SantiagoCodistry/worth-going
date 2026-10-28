// Privacy Policy and Terms of Use. Plain-language starting points; have a lawyer
// review them before relying on them.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const EFFECTIVE = 'October 28, 2026'
export const CONTACT_URL = 'https://github.com/SantiagoCodistry/worth-going/issues'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <article className="max-w-2xl pt-10 md:pt-16">
        <h1 className="display text-[56px] md:text-[96px]">{title}</h1>
        <p className="mt-2 text-[14px] text-mute">Effective {EFFECTIVE}</p>
        <div className="legal mt-8 space-y-4 text-[16px] leading-relaxed text-ink-2">{children}</div>
      </article>
    </div>
  )
}

const H = ({ children }: { children: ReactNode }) => <h2 className="pt-4 text-[19px] font-bold text-ink">{children}</h2>

export function Privacy() {
  return (
    <Doc title="Privacy">
      <p>This policy explains what Worth Going stores about you and why. The short version: very little, and no ads or tracking.</p>

      <H>Without an account</H>
      <p>
        Your saved events, restaurant log, taste settings, busy times and chosen city are stored in your browser’s local storage.
        They are not sent to us. Clearing your browser’s site data deletes them.
      </p>

      <H>With an account</H>
      <p>
        If you sign in, we store your email address and the same items listed above so they sync across your devices. Accounts
        are run on Supabase, which stores this data on our behalf. We use your email only to sign you in. We don’t send
        newsletters and we don’t sell or share your information.
      </p>
      <p>
        You can delete your account at any time from the <Link to="/account" className="underline">Account</Link> page. That
        removes your email and synced data.
      </p>

      <H>Your location</H>
      <p>
        “Near me” only asks for your location when you tap Use my location, and your browser asks your permission first. The
        position is used in your browser to measure distances and is saved there so you don’t have to share it again. It is never
        sent to us or synced to your account. Turning it off (Stop using location) deletes it. If you search for a place instead,
        the text you type is sent to OpenStreetMap’s Nominatim service to find it, and the same happens with your position once
        to show the name of your town.
      </p>

      <H>Spotify</H>
      <p>
        If you connect Spotify, we read your top and followed artists once, keep their names and genres in your taste
        settings, and discard the access token. We can’t see your playlists, listening history beyond those artists, or account
        details, and we never post anything. Remove the artists on Your taste at any time, and revoke access in your Spotify
        account settings under Apps.
      </p>

      <H>What we don’t do</H>
      <p>No advertising, no analytics or tracking scripts, no selling data, and no tracking cookies.</p>

      <H>Other services this site loads</H>
      <p>
        Photos load directly from the sites that host them (such as Wikimedia Commons, Ticketmaster and event organizers), and
        maps load from OpenStreetMap. Those services receive your IP address and browser details when your browser requests the
        image or map, under their own privacy policies. Links to tickets, reservations and menus take you to other sites with
        their own policies.
      </p>

      <H>Children</H>
      <p>Worth Going isn’t meant for children under 13, and we don’t knowingly collect information from them.</p>

      <H>Changes</H>
      <p>If this policy changes, the new version will be posted here with a new effective date.</p>

      <H>Contact</H>
      <p>
        Questions or deletion requests:{' '}
        <a className="underline" href={CONTACT_URL} target="_blank" rel="noreferrer">
          open an issue on the project’s GitHub page
        </a>
        .
      </p>
    </Doc>
  )
}

export function Terms() {
  return (
    <Doc title="Terms">
      <p>By using Worth Going you agree to these terms. If you don’t agree, please don’t use the site.</p>

      <H>What the site is</H>
      <p>
        Worth Going is a free guide to events and restaurants in the New York, New Jersey and Philadelphia area. It collects
        listings from public calendars, league schedules, ticketing services and other public sources, and links each one to its
        source.
      </p>

      <H>Listings can be wrong</H>
      <p>
        Dates, times, line-ups, prices, availability and venue details come from third parties and can change or be wrong. Prices
        shown are the latest we fetched, not a quote, and usually exclude fees. Always confirm with the organizer, venue or seller
        before you buy a ticket, book a table or travel.
      </p>

      <H>Tickets and reservations</H>
      <p>
        We don’t sell tickets or take reservations. When you follow a link to buy tickets or book a table, you are dealing with
        that seller or platform under its own terms. We are not responsible for their services, refunds or charges.
      </p>

      <H>No affiliation</H>
      <p>
        Worth Going is independent. It is not affiliated with, endorsed by or sponsored by any venue, artist, team, league,
        restaurant or platform it lists or links to, including Ticketmaster, Resy, OpenTable, Tock, SevenRooms and Luma. Names,
        logos and trademarks belong to their owners and are used only to identify them.
      </p>

      <H>Photos and data</H>
      <p>
        Photos are credited on the page where they appear and belong to their owners. Photos and text from Wikipedia and Wikimedia
        Commons are used under their licenses (usually CC BY-SA). Event data from Ticketmaster is provided by the Ticketmaster
        Discovery API. Maps and geocoding use OpenStreetMap data © OpenStreetMap contributors, available under the Open Database
        License. If you own something shown here and want it removed,{' '}
        <a className="underline" href={CONTACT_URL} target="_blank" rel="noreferrer">
          tell us
        </a>{' '}
        and we’ll take it down.
      </p>

      <H>Your account</H>
      <p>
        Keep access to your email secure, since it is how you sign in. Don’t misuse the site: no scraping at a volume that
        disrupts it, no attempts to break in, and no use for anything illegal. We can suspend accounts that do.
      </p>

      <H>No warranty</H>
      <p>
        The site is provided “as is” and “as available”, without warranties of any kind, including accuracy, availability or
        fitness for a particular purpose.
      </p>

      <H>Limitation of liability</H>
      <p>
        To the fullest extent allowed by law, Worth Going and the people who make it are not liable for any loss or damage from
        using the site or relying on its listings, including missed, cancelled or changed events and purchases made through
        third parties.
      </p>

      <H>Changes and law</H>
      <p>
        We may update these terms and will post the new version here. These terms are governed by the laws of the State of New
        Jersey, USA.
      </p>
    </Doc>
  )
}
