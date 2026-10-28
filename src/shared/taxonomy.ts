import type { CategoryId, CityId } from './types.ts'

export const TIMEZONE = 'America/New_York'

export interface City {
  id: CityId
  name: string
  short: string
}

export const CITIES: City[] = [
  { id: 'nyc', name: 'New York City', short: 'New York' },
  { id: 'philly', name: 'Philadelphia', short: 'Philadelphia' },
  { id: 'princeton', name: 'Princeton', short: 'Princeton' },
]

export const cityById = (id: CityId) => CITIES.find((c) => c.id === id)!

export interface Category {
  id: CategoryId
  /** Short label for chips and card labels. */
  label: string
  /** Section heading. */
  title: string
  blurb: string
  /** CSS custom property holding this category's colour. */
  color: string
}

export const CATEGORIES: Category[] = [
  { id: 'unusual', label: 'Unusual', title: 'Unusual', blurb: 'Odd, specific, one-night-only.', color: 'var(--c-unusual)' },
  { id: 'ideas', label: 'Talks', title: 'Talks', blurb: 'Who’s speaking, and why you’d want to hear them.', color: 'var(--c-ideas)' },
  { id: 'music', label: 'Music', title: 'Music', blurb: 'Shows we’d buy tickets for.', color: 'var(--c-music)' },
  { id: 'startups', label: 'Startups', title: 'Startups', blurb: 'Founder and investor events with real speakers.', color: 'var(--c-startups)' },
  { id: 'art', label: 'Art', title: 'Art', blurb: 'Exhibitions worth the trip.', color: 'var(--c-art)' },
  { id: 'sports', label: 'Sports', title: 'Sports', blurb: 'Games with something riding on them.', color: 'var(--c-sports)' },
  { id: 'dining', label: 'Food', title: 'Restaurants', blurb: 'Places we’d send a friend.', color: 'var(--c-dining)' },
]

export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!
