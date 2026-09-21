/**
 * Floorball WebMCP tools for native Chrome and ChatGPT Desktop/Sites.
 * Registers on document.modelContext.registerTool — never overwrites the host getter.
 */

import { formatFloorballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'
import { fetchSalibandyMatch } from './services/salibandyApi'
import {
  connectModelContext,
  detectWebMcpConsumer,
  publishWebMcpStatus,
  type ModelContextTool,
} from './webmcp'

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

export async function getFloorballMatchCard(params: {
  matchId?: string
  teamId?: string
}): Promise<McpToolResponse> {
  const matchId = params.matchId
  if (!matchId) {
    return {
      content: [{ type: 'text', text: 'matchId is required. Do not invent an SSBL match.' }],
    }
  }
  const match = await fetchSalibandyMatch(matchId)

  const periodSummary = match
    ? match.periods.map((p) => `${p.period}. period ${p.scoreHome}–${p.scoreAway}`).join(', ')
    : ''

  const stats: SportStatsContract = formatFloorballStatsContract({
    matchId,
    recentForm: match ? [] : [],
    h2h: {
      wins: 0,
      draws: 0,
      losses: 0,
      lastResult: match ? `${match.scoreHome}–${match.scoreAway}` : '',
    },
    periodScores: periodSummary,
    topScorer: match?.goals[0] ? `${match.goals[0].scorerName}` : '',
    totalPenaltiesMin: match?.penalties.length ? match.penalties.length * 2 : 0,
    baseUrl: 'https://floorball-stats.pages.dev',
  })

  return {
    content: [
      {
        type: 'text',
        text: match
          ? `Floorball ${match.homeTeamName} vs ${match.awayTeamName}\nScore: ${match.scoreHome}–${match.scoreAway}\nPeriods: ${periodSummary}\nVenue: ${match.venueName || ''}`
          : `Match ${matchId} was not found on SSBL.`,
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
        resourceUri: `ui://floorball/match-card?matchId=${encodeURIComponent(matchId)}`,
      },
    },
  }
}

const TOOLS: ModelContextTool[] = [
  {
    name: 'get_floorball_match_card',
    title: 'Floorball match',
    description:
      'Fetch an SSBL / Salibandyliitto match: three-period scores, goals, and penalties. Requires a live matchId.',
    inputSchema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'SSBL Torneopal match id' },
      },
      required: ['matchId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args) => getFloorballMatchCard(args as { matchId?: string; teamId?: string }),
  },
  {
    name: 'get_floorball_standings',
    title: 'Floorball standings',
    description:
      'SSBL standings with the 3-2-1-0 points system. Pass a live series. Dummy tables are forbidden.',
    inputSchema: {
      type: 'object',
      properties: {
        series: { type: 'string', description: 'Division / series name' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async ({ series }) => ({
      series: String(series || ''),
      teams: [] as Array<{ rank: number; team: string; points: number }>,
      note: 'Standings come from SSBL getGroup. Pass a live series; dummy tables are forbidden.',
      pointsRule: '3p regulation win, 2p OT/SO win, 1p OT/SO loss, 0p regulation loss',
    }),
  },
]

let session: AbortController | null = null

export async function registerFloorballWebMCP() {
  if (typeof window === 'undefined') return undefined
  session?.abort()
  session = new AbortController()
  const { mode, mc } = connectModelContext()
  const consumer = detectWebMcpConsumer()
  const registered: string[] = []
  let error: string | undefined

  for (const tool of TOOLS) {
    try {
      await mc.registerTool(tool, { signal: session.signal })
      registered.push(tool.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/already registered/i.test(message) || /InvalidStateError/i.test(message)) {
        registered.push(tool.name)
      } else {
        error = `${tool.name}: ${message}`
        console.warn('[WebMCP] registerTool failed', tool.name, message)
      }
    }
  }

  publishWebMcpStatus({ mode, consumer, tools: registered, error })
  return { mode, mc, tools: registered }
}
