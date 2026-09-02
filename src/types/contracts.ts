/**
 * Cross-Repo Contract Adapter for floorball-stats
 * Canonical Contracts v1.0.0
 */

export const CONTRACT_VERSION = '1.0.0' as const

export type SupportedSport = 'football' | 'volleyball' | 'floorball' | 'basketball' | 'other'

export interface MatchdayContextContract {
  eventId: string
  sport: SupportedSport
  startTime: string
  warmupTime?: string
  homeTeam: string
  awayTeam: string
  venueName: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  association?: 'palloliitto' | 'salibandy' | 'basket' | 'torneopal' | 'other'
  externalId?: string
}

export interface SportStatsContract {
  sport: SupportedSport
  matchOrTeamId: string
  recentForm?: string[]
  standingsSummary?: {
    rank: number
    totalTeams: number
    points: number
    playedMatches: number
  }
  headToHead?: {
    wins: number
    draws: number
    losses: number
    lastResult?: string
  }
  keyMetrics?: Record<string, string | number>
  deepLinkUrl: string
}

export interface CrossRepoQueryContract {
  theme?: string
  embed?: boolean
  parentOrigin?: string
  targetId?: string
}

/**
 * Transforms internal floorball match and period statistics into canonical SportStatsContract.
 */
export function formatFloorballStatsContract(data: {
  matchId: string
  recentForm?: string[]
  rank?: number
  totalTeams?: number
  points?: number
  playedMatches?: number
  h2h?: { wins: number; draws: number; losses: number; lastResult?: string }
  periodScores?: string
  topScorer?: string
  totalPenaltiesMin?: number
  baseUrl?: string
}): SportStatsContract {
  const base = data.baseUrl || 'https://floorball-stats.pages.dev'
  return {
    sport: 'floorball',
    matchOrTeamId: data.matchId,
    recentForm: data.recentForm,
    standingsSummary:
      data.rank && data.totalTeams && data.points !== undefined && data.playedMatches !== undefined
        ? {
            rank: data.rank,
            totalTeams: data.totalTeams,
            points: data.points,
            playedMatches: data.playedMatches,
          }
        : undefined,
    headToHead: data.h2h,
    keyMetrics: {
      ...(data.periodScores ? { periodScores: data.periodScores } : {}),
      ...(data.topScorer ? { topScorer: data.topScorer } : {}),
      ...(data.totalPenaltiesMin !== undefined ? { totalPenaltiesMin: `${data.totalPenaltiesMin} min` } : {}),
    },
    deepLinkUrl: `${base}/match/${data.matchId}?theme=night-captain`,
  }
}

/**
 * Parses incoming query parameters from parent app (e.g. Pelipäivä slide-over drawer).
 */
export function parseIncomingCrossRepoQuery(searchParams: URLSearchParams): CrossRepoQueryContract {
  return {
    theme: searchParams.get('theme') || 'night-captain',
    embed: searchParams.get('embed') === 'true',
    parentOrigin: searchParams.get('parentOrigin') || undefined,
    targetId: searchParams.get('targetId') || searchParams.get('matchId') || undefined,
  }
}
