// Pure helpers for "this season by series" and the higher-level chip.
// Only TASO's own category names are used. TASO gives no order between
// divisions of one age group (A/B, VALK/SIN), so only age groups are ranked.

export interface HistoryRow {
  seasonId: string
  category: string
  teamName: string
  teamId: string
  notParticipated: boolean
  /** null when TASO sent no goal number for that game. */
  goals: number | null
  played: boolean
}

export interface SeriesSlice {
  category: string
  teamName: string
  games: number
  /** null when TASO kept no goals for any of these games. */
  goals: number | null
}

export interface HigherLevel {
  category: string
  games: number
}

const ADULT = /\b(miehet|naiset|divisioona|divari|liiga|aikuis|harrastesarja\s+m|kunto)/i

/** Lowest age in a category name: U15 → 15, P13-14 → 13, T14 → 14. Adult → 100. null = unknown. */
export function ageRank(category: string): number | null {
  const m = /(?:^|[\s(])[UPTF](\d{1,2})(?:\s*-\s*\d{1,2})?(?=\s|$|[+)])/i.exec(category || '')
  if (m) return Number(m[1])
  if (ADULT.test(category || '')) return 100
  return null
}

/** Display name without the regional suffix (" ES", "(SYKSY)" stays). */
export function cleanCategory(category: string): string {
  return (category || '').replace(/\s+(ES|LS|IS|PS|KS|ETELÄ|ITÄ|LÄNSI)$/i, '').trim()
}

/** TASO season id for a date: 2026-10-24 → 2026-2027 (season turns 1 July). */
export function seasonIdFor(dateIso: string): string {
  const y = Number(dateIso.slice(0, 4))
  const mo = Number(dateIso.slice(5, 7))
  return mo >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

function playedRows(rows: HistoryRow[], seasonId: string): HistoryRow[] {
  return rows.filter((r) => r.seasonId === seasonId && r.played && !r.notParticipated)
}

export function seriesThisSeason(rows: HistoryRow[], seasonId: string): SeriesSlice[] {
  const map = new Map<string, SeriesSlice>()
  for (const r of playedRows(rows, seasonId)) {
    const category = cleanCategory(r.category)
    const key = `${category}|${r.teamId || r.teamName}`
    const cur = map.get(key) || { category, teamName: r.teamName, games: 0, goals: null }
    cur.games += 1
    if (r.goals != null) cur.goals = (cur.goals ?? 0) + r.goals
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.games - a.games)
}

/** Series in an older age group (or adult) than `currentCategory`, this season. */
export function higherLevels(rows: HistoryRow[], seasonId: string, currentCategory: string): HigherLevel[] {
  const base = ageRank(currentCategory)
  if (base == null) return []
  const map = new Map<string, number>()
  for (const r of playedRows(rows, seasonId)) {
    const rank = ageRank(r.category)
    if (rank == null || rank <= base) continue
    const c = cleanCategory(r.category)
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map.entries()].map(([category, games]) => ({ category, games })).sort((a, b) => b.games - a.games)
}
