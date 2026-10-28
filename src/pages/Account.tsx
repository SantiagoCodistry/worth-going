import { useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsEnabled, deleteAccount, googleEnabled, sendSignInLink, signInWithGoogle, signOut } from '../lib/account.ts'
import { useStore } from '../lib/store.tsx'

const SYNC_LABEL = {
  off: '',
  loading: 'Syncing…',
  synced: 'Saved items, restaurant log and taste are synced to your account.',
  error: 'Couldn’t reach your account. Changes are kept in this browser and will sync when it’s back.',
}

export function Account() {
  const { session, sync, saved, places } = useStore()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const counts = `${saved.length} saved · ${Object.keys(places).length} restaurants logged`

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <section className="max-w-xl pt-10 md:pt-16">
        <h1 className="display text-[64px] md:text-[112px]">{session ? 'Account' : 'Sign in'}</h1>

        {!accountsEnabled && (
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-2">
            <p>Accounts aren’t switched on for this site yet. You don’t need one: your saved events, restaurant log and taste are kept in this browser.</p>
            <p className="text-[14px] text-mute">{counts}</p>
          </div>
        )}

        {accountsEnabled && !session && (
          <>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              Sign in to keep your saved events, restaurant log and taste on every device. We’ll email you a link. There’s no
              password.
            </p>
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={async (ev) => {
                ev.preventDefault()
                setState('sending')
                try {
                  await sendSignInLink(email.trim())
                  setState('sent')
                } catch (e) {
                  setState('error')
                  setMessage((e as Error).message)
                }
              }}
            >
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border-[1.5px] border-ink bg-card px-3 py-2.5 text-[15px] outline-none"
              />
              <button className="btn btn-accent shrink-0" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Email me a link'}
              </button>
            </form>
            {state === 'sent' && <p className="mt-3 text-[15px] font-semibold">Check your inbox for a sign-in link from Worth Going.</p>}
            {state === 'error' && <p className="mt-3 text-[15px] text-[var(--riso-pink)]">That didn’t work: {message}</p>}
            {googleEnabled && (
              <button className="btn btn-quiet mt-4" onClick={() => signInWithGoogle().catch((e: Error) => (setState('error'), setMessage(e.message)))}>
                Continue with Google
              </button>
            )}
            <p className="mt-6 text-[13px] text-mute">
              By signing in you agree to the <Link className="underline" to="/terms">Terms</Link> and the{' '}
              <Link className="underline" to="/privacy">Privacy Policy</Link>. What’s in this browser now ({counts}) is added to
              your account.
            </p>
          </>
        )}

        {accountsEnabled && session && (
          <div className="mt-6 space-y-5">
            <div className="border-[1.5px] border-ink p-5">
              <p className="label text-[11px] text-mute">Signed in as</p>
              <p className="mt-1 text-[18px] font-bold">{session.user.email}</p>
              <p className="mt-2 text-[14px] text-ink-2">{SYNC_LABEL[sync]}</p>
              <p className="mt-1 text-[14px] text-mute">{counts}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/you" className="btn btn-quiet">
                Your taste
              </Link>
              <button className="btn btn-quiet" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
            <div className="border-t border-rule pt-5">
              {!confirmDelete ? (
                <button className="text-[14px] text-mute underline" onClick={() => setConfirmDelete(true)}>
                  Delete my account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[14px]">This deletes your account and everything stored with it. What’s in this browser stays until you clear it.</p>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-accent"
                      onClick={() => deleteAccount().catch((e: Error) => (setState('error'), setMessage(e.message)))}
                    >
                      Delete account
                    </button>
                    <button className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </div>
                  {state === 'error' && <p className="text-[14px] text-[var(--riso-pink)]">That didn’t work: {message}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
