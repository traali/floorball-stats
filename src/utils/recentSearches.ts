/** The user's own recent searches (only ones the API answered with hits). */
import type { StorageLike } from './favoritesStore.ts'

export const RECENT_KEY = 'floorball.recentSearches.v1'
const MAX_RECENT = 6

function storage(s?: StorageLike): StorageLike | null {
  if (s) return s
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readRecentSearches(s?: StorageLike): string[] {
  try {
    const parsed = JSON.parse(storage(s)?.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === 'string' && q.trim()).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function rememberSearch(query: string, s?: StorageLike): string[] {
  const q = query.trim()
  if (!q) return readRecentSearches(s)
  const next = [q, ...readRecentSearches(s).filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT)
  try {
    storage(s)?.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
