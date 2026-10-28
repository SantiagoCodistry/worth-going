// Which area a venue belongs to, from its city and state.
import type { CityId } from '../../src/shared/types.ts'

const PRINCETON_AREA =
  /^(princeton|princeton junction|plainsboro|west windsor|lawrenceville|lawrence|lawrence township|hopewell|pennington|kingston|rocky hill|skillman|montgomery|belle mead|cranbury|east windsor|hightstown|ewing|trenton|hamilton|robbinsville|bordentown|lambertville|new hope|titusville)$/i

export function areaFor(city = '', state = ''): CityId | undefined {
  const c = city.trim()
  const s = state.trim().toUpperCase()
  if (s === 'NY' || s === 'NEW YORK' || s === 'CT' || s === 'CONNECTICUT') return 'nyc'
  if (s === 'PA' || s === 'PENNSYLVANIA' || s === 'DE' || s === 'DELAWARE') return /new hope/i.test(c) ? 'princeton' : 'philly'
  if (s === 'NJ' || s === 'NEW JERSEY') {
    if (PRINCETON_AREA.test(c)) return 'princeton'
    // Camden and the South Jersey suburbs are part of the Philadelphia area.
    if (/^(camden|cherry hill|haddonfield|collingswood|voorhees|mount laurel|moorestown|glassboro)$/i.test(c)) return 'philly'
    return 'nj'
  }
  return undefined
}
