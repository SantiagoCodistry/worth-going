// Optional accounts, backed by Supabase (free tier). Turned on by setting
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time; without them the
// site works exactly the same and keeps everything in this browser.
// Schema and row-level security: supabase/schema.sql.
/// <reference types="vite/client" />
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from './profile.ts'

export interface PlaceLog {
  status: 'want' | 'been'
  verdict?: 'loved' | 'liked' | 'meh'
  note?: string
  /** YYYY-MM-DD you marked it been */
  date?: string
}

const URL = import.meta.env?.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined

export const accountsEnabled = !!(URL && KEY)
export const googleEnabled = accountsEnabled && import.meta.env?.VITE_SUPABASE_GOOGLE === '1'

export interface UserState {
  saved: string[]
  profile: Profile | null
  places: Record<string, PlaceLog>
}

let client: Promise<SupabaseClient> | null = null

/** The Supabase client, loaded only when accounts are on. */
export function supabase(): Promise<SupabaseClient> {
  if (!accountsEnabled) return Promise.reject(new Error('Accounts are not set up'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }),
  )
  return client
}

const returnUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}account`

export async function sendSignInLink(email: string) {
  const sb = await supabase()
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: returnUrl() } })
  if (error) throw error
}

export async function signInWithGoogle() {
  const sb = await supabase()
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: returnUrl() } })
  if (error) throw error
}

export async function signOut() {
  const sb = await supabase()
  await sb.auth.signOut()
}

/** Deletes the account and everything stored with it (see delete_me in schema.sql). */
export async function deleteAccount() {
  const sb = await supabase()
  const { error } = await sb.rpc('delete_me')
  if (error) throw error
  await sb.auth.signOut()
}

export async function onSession(cb: (s: Session | null) => void): Promise<() => void> {
  const sb = await supabase()
  const { data } = await sb.auth.getSession()
  cb(data.session)
  const { data: sub } = sb.auth.onAuthStateChange((_event, s) => cb(s))
  return () => sub.subscription.unsubscribe()
}

export async function loadState(userId: string): Promise<UserState | null> {
  const sb = await supabase()
  const { data, error } = await sb.from('user_state').select('saved, profile, places').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as UserState | null
}

export async function saveState(userId: string, s: UserState) {
  const sb = await supabase()
  const { error } = await sb.from('user_state').upsert({ user_id: userId, ...s, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Combine what's in this browser with what's in the account. Nothing is dropped. */
export function mergeState(local: UserState, remote: UserState | null): UserState {
  if (!remote) return local
  return {
    saved: [...new Set([...local.saved, ...(remote.saved ?? [])])],
    profile: remote.profile ?? local.profile,
    places: { ...local.places, ...(remote.places ?? {}) },
  }
}
