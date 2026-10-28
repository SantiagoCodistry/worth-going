import type { CategoryId, CityId } from './types.ts'

/** Default timezone. Each city has its own (see CITY_TZ); most are New York. */
export const TIMEZONE = 'America/New_York'

export interface City {
  id: CityId
  name: string
  short: string
}

export const CITIES: City[] = [
  { id: 'princeton', name: 'Princeton area', short: 'Princeton' },
  { id: 'nyc', name: 'New York', short: 'New York' },
  { id: 'nj', name: 'New Jersey', short: 'New Jersey' },
  { id: 'philly', name: 'Philadelphia', short: 'Philadelphia' },
  { id: 'cdmx', name: 'Mexico City', short: 'Mexico City' },
]

export const cityById = (id: CityId) => CITIES.find((c) => c.id === id)!

/** Local time for each area. */
export const CITY_TZ: Record<CityId, string> = {
  princeton: TIMEZONE,
  nyc: TIMEZONE,
  nj: TIMEZONE,
  philly: TIMEZONE,
  cdmx: 'America/Mexico_City',
}
export const tzOf = (city: CityId) => CITY_TZ[city] ?? TIMEZONE

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
  { id: 'unusual', label: 'Unusual', title: 'Unusual', blurb: '', color: 'var(--riso-pink)' },
  { id: 'comedy', label: 'Comedy', title: 'Comedy', blurb: '', color: 'var(--riso-orange)' },
  { id: 'ideas', label: 'Talks', title: 'Talks', blurb: '', color: 'var(--riso-yellow)' },
  { id: 'music', label: 'Music', title: 'Music', blurb: '', color: 'var(--riso-blue)' },
  { id: 'startups', label: 'Startups', title: 'Startups', blurb: '', color: 'var(--riso-green)' },
  { id: 'art', label: 'Art', title: 'Art', blurb: '', color: 'var(--riso-teal)' },
  { id: 'sports', label: 'Sports', title: 'Sports', blurb: '', color: 'var(--riso-federal)' },
  { id: 'dining', label: 'Food', title: 'Restaurants', blurb: '', color: 'var(--riso-orange)' },
]

export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!
