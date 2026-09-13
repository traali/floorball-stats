import type { SalibandyPlayerMatch, SalibandyTeamFixture } from '../types/salibandy'
import { determineSeasonHalf, getSeasonYear } from '../services/salibandyApi.ts'

export type FormResult = 'V' | 'T' | 'H' | 'DNP'

export type PrevGame = {
  matchId: string
  date: string
  opponent: string
  result: FormResult
  score?: string
  goals: number
  assists: number
  pim: number
}

function inHalf(date: string, category: string | undefined, half: 'syksy' | 'kevat' | 'all', year: string) {
  if (half === 'all') return getSeasonYear(date) === year || date.startsWith(year)
  return getSeasonYear(date) === year && determineSeasonHalf(date, category) === half
}

function wl(my?: number, opp?: number): FormResult {
  if (my == null || opp == null) return 'DNP'
  if (my > opp) return 'V'
  if (my < opp) return 'H'
  return 'T'
}

export function previousGamesForPlayer(opts: {
  playerMatches: SalibandyPlayerMatch[]
  teamFixtures: SalibandyTeamFixture[]
  year: string
  half?: 'syksy' | 'kevat' | 'all'
  asOfDate?: string
  excludeMatchId?: string
}): PrevGame[] {
  const half = opts.half || 'all'
  const byId = new Map<string, PrevGame>()

  for (const m of opts.playerMatches) {
    if (opts.excludeMatchId && m.matchId === opts.excludeMatchId) continue
    if (opts.asOfDate && m.date > opts.asOfDate) continue
    if (opts.asOfDate && m.date === opts.asOfDate && m.matchId === opts.excludeMatchId) continue
    if (!inHalf(m.date, m.categoryName, half, opts.year)) continue
    if (m.scoreHome == null || m.scoreAway == null) continue
    const isHome = m.teamId ? m.teamId === m.homeTeamId : true
    const my = isHome ? m.scoreHome : m.scoreAway
    const opp = isHome ? m.scoreAway : m.scoreHome
    byId.set(m.matchId, {
      matchId: m.matchId,
      date: m.date,
      opponent: isHome ? m.awayTeam : m.homeTeam,
      result: wl(my, opp),
      score: `${m.scoreHome}–${m.scoreAway}`,
      goals: m.goals,
      assists: m.assists,
      pim: m.pim,
    })
  }

  for (const f of opts.teamFixtures) {
    if (opts.excludeMatchId && f.matchId === opts.excludeMatchId) continue
    if (!f.score) continue
    if (opts.asOfDate && f.date > opts.asOfDate) continue
    if (!inHalf(f.date, f.categoryName, half, opts.year)) continue
    if (byId.has(f.matchId)) continue
    byId.set(f.matchId, {
      matchId: f.matchId,
      date: f.date,
      opponent: f.isHome ? f.awayTeam : f.homeTeam,
      result: 'DNP',
      score: f.score,
      goals: 0,
      assists: 0,
      pim: 0,
    })
  }

  return [...byId.values()].sort((a, b) => `${b.date}`.localeCompare(a.date))
}
