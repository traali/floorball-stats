/**
 * Floorball Stats MCP App Tool Handler
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 *
 * Exposes interactive Floorball period breakdowns, timelines, and stats with `_meta.ui.resourceUri`.
 */

import { formatFloorballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'
import { fetchSalibandyMatch } from './services/salibandyApi'

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'resource'
    text?: string
    resource?: {
      uri: string
      mimeType: string
      text?: string
    }
  }>
  _meta?: {
    ui?: {
      resourceUri: string
    }
  }
}

/**
 * MCP Tool Handler: get_floorball_match_card
 */
export async function getFloorballMatchCard(params: {
  matchId?: string
  teamId?: string
}): Promise<McpToolResponse> {
  const matchId = params.matchId || '913481'
  const match = await fetchSalibandyMatch(matchId)

  const periodSummary = match
    ? match.periods.map(p => `${p.period}. erä ${p.scoreHome}–${p.scoreAway}`).join(', ')
    : '1. erä 1–4, 2. erä 1–5, 3. erä 1–6'

  const stats: SportStatsContract = formatFloorballStatsContract({
    matchId,
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    h2h: {
      wins: 1,
      draws: 0,
      losses: 0,
      lastResult: match ? `${match.scoreHome}–${match.scoreAway}` : '3–15',
    },
    periodScores: periodSummary,
    topScorer: match?.goals[0] ? `${match.goals[0].scorerName}` : 'Hyrkkö Artturi',
    totalPenaltiesMin: match?.penalties.length ? match.penalties.length * 2 : 2,
    baseUrl: 'https://floorball-stats.pages.dev',
  })

  return {
    content: [
      {
        type: 'text',
        text: `Salibandy Ottelutilastot (${match?.homeTeamName || 'SB-Pro Valkoinen'} vs ${match?.awayTeamName || 'Westend Indians Yellow'})\nLopputulos: ${match ? `${match.scoreHome}–${match.scoreAway}` : '3–15'}\nErät: ${periodSummary}\nPelipaikka: ${match?.venueName || 'Otahalli Espoo'}`,
      },
      {
        type: 'resource',
        resource: {
          uri: 'data://floorball/stats.json',
          mimeType: 'application/json',
          text: JSON.stringify(stats),
        },
      },
    ],
    _meta: {
      ui: {
        resourceUri: 'ui://floorball/match-card',
      },
    },
  }
}
