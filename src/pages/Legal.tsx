// Privacy Policy and Terms of Use. Plain-language starting points; have a lawyer
// review them before relying on them.
import type { ReactNode } from 'react'
import { Footer, Masthead } from '../components/Sheet.tsx'

const EFFECTIVE = 'October 29, 2026'
export const CONTACT_URL = 'https://github.com/SantiagoCodistry/worth-going/issues'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        <article className="max-w-2xl pt-10 md:pt-14">
          <h1 className="display text-[64px] md:text-[104px]">{title}</h1>
          <p className="mt-3 text-[14px] text-mute">Effective {EFFECTIVE}</p>
          <div className="mt-8 space-y-4 text-[16px] leading-relaxed text-ink-2">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  )
}

const H = ({ children }: { children: ReactNode }) => <h2 className="stamp pt-5 text-[14px] text-ink">{children}</h2>
const Contact = () => (
  <a className="link" href={CONTACT_URL} target="_blank" rel="noreferrer">
    open an issue on the project’s GitHub page
  </a>
)

export function Privacy() {
  return (
    <Doc title="Privacy">
      <p>Worth Going doesn’t have accounts, ads or tracking. Here is everything it stores and why.</p>

      <H>In your browser</H>
      <p>
        Your chosen area, your interests, the artist names from Spotify if you connect it, and your shortlist of three are saved in
        your browser’s local storage so the page remembers them. They are never sent to us. Clearing your browser’s site data
        deletes them.
      </p>

      <H>Spotify (optional)</H>
      <p>
        If you connect Spotify, the page reads your top and followed artists once, keeps only their names in your browser, and
        discards the access token. It can’t see your playlists or account details and never posts anything. You can revoke access
        in your Spotify account under Apps.
      </p>

      <H>Email (optional)</H>
      <p>
        If you sign up for the weekly email, your address is handled by our newsletter provider, Buttondown, under its privacy
        policy, and used only to send the edition. Every email has an unsubscribe link.
      </p>

      <H>Other sites</H>
      <p>
        Photos load from the sites that host them (such as Wikimedia Commons and event organizers), which receive your IP address
        when your browser requests them. Links to tickets, reservations, calendars and maps take you to other sites with their own
        policies.
      </p>

      <H>Contact</H>
      <p>
        Questions: <Contact />.
      </p>
    </Doc>
  )
}

export function Terms() {
  return (
    <Doc title="Terms">
      <p>By using Worth Going you agree to these terms.</p>

      <H>What it is</H>
      <p>
        A free weekly list of ten events and ten restaurants around Princeton, New York and Philadelphia, chosen by hand. Each
        pick links to its organizer, venue or ticket seller.
      </p>

      <H>Check before you go</H>
      <p>
        We check every pick when the edition is made, but dates, times, line-ups, prices and availability come from third parties
        and can change. Confirm with the organizer or seller before you buy a ticket, book a table or travel.
      </p>

      <H>No affiliation</H>
      <p>
        Worth Going doesn’t sell tickets or take reservations and isn’t affiliated with, endorsed by or paid by the venues,
        artists, restaurants or platforms it lists or links to. Names and trademarks belong to their owners.
      </p>

      <H>Photos</H>
      <p>
        Photos are credited where they appear and belong to their owners; Wikimedia Commons material is used under its licenses
        (usually CC BY-SA). If you own something shown here and want it removed, <Contact /> and we’ll take it down.
      </p>

      <H>No warranty</H>
      <p>
        The site is provided as is. To the fullest extent the law allows, we aren’t liable for missed, cancelled or changed events
        or for purchases made through other sites. These terms are governed by the laws of New Jersey.
      </p>
    </Doc>
  )
}
