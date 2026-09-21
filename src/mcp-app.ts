/**
 * Floorball WebMCP tools for native Chrome and ChatGPT Desktop/Sites.
 * Registers on document.modelContext.registerTool — never overwrites the host getter.
 */

import { formatFloorballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'
import {
  fetchSalibandyMatch,
  fetchSalibandyTeamProfile,
  fetchSalibandyPlayer,
  searchDiscovery,
} from './services/salibandyApi'
import {
  connectModelContext,
  detectWebMcpConsumer,
  publishWebMcpStatus,
  type ModelContextTool,
} from './webmcp'

function textResult(text: string, extra?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    summary: text,
    ...extra,
  }
}

export async function getFloorballMatchCard(params: { matchId?: string; teamId?: string }) {
  const matchId = String(params.matchId || '').trim()
  if (!matchId) {
    return textResult('matchId is required. Do not invent an SSBL match.')
  }
  const match = await fetchSalibandyMatch(matchId)
  if (!match) return textResult(`Match ${matchId} was not found on SSBL.`)

  const periodSummary = match.periods.map((p) => `${p.period}. period ${p.scoreHome}–${p.scoreAway}`).join(', ')
  const stats: SportStatsContract = formatFloorballStatsContract({
    matchId,
    recentForm: [],
    h2h: {
      wins: 0,
      draws: 0,
      losses: 0,
      lastResult: `${match.scoreHome}–${match.scoreAway}`,
    },
    periodScores: periodSummary,
    topScorer: match.goals[0] ? `${match.goals[0].scorerName}` : '',
    totalPenaltiesMin: match.penalties.length ? match.penalties.length * 2 : 0,
    baseUrl: 'https://floorball-stats.pages.dev',
  })
  const summary =
    match.phase === 'upcoming'
      ? `${match.homeTeamName} vs ${match.awayTeamName} — upcoming ${match.date} ${match.time}.`
      : `${match.homeTeamName} ${match.scoreHome}–${match.scoreAway} ${match.awayTeamName}. Periods: ${periodSummary}.`

  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    match: {
      matchId: match.matchId,
      phase: match.phase,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      periods: match.periods,
      venueName: match.venueName,
      date: match.date,
      time: match.time,
    },
    contract: stats,
  }
}

async function searchFloorballTool(args: Record<string, unknown>) {
  const query = String(args.query || args.q || '').trim()
  if (query.length < 2) return textResult('query is required (club, team, player, or a salibandy.fi URL).')
  const hits = await searchDiscovery(query)
  const summary =
    hits.length === 0
      ? `No SSBL hits for «${query}».`
      : hits
          .slice(0, 12)
          .map((h) => `${h.kind} ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ''} (${h.id})`)
          .join('\n')
  return { content: [{ type: 'text' as const, text: summary }], summary, hits: hits.slice(0, 20) }
}

async function getFloorballTeamTool(args: Record<string, unknown>) {
  const teamId = String(args.teamId || '').trim()
  if (!teamId) return textResult('teamId is required.')
  const profile = await fetchSalibandyTeamProfile(teamId)
  if (!profile) return textResult(`Team ${teamId} was not found.`)
  const summary = `${profile.teamName} · ${profile.categoryName || ''} · ${profile.fixtures.length} fixtures.`
  return {
    content: [{ type: 'text' as const, text: summary }],
    summary,
    team: {
      teamId: profile.teamId,
      teamName: profile.teamName,
      categoryName: profile.categoryName,
      clubName: profile.clubName,
      groups: profile.groups,
    },
  }
}

async function getFloorballPlayerTool(args: Record<string, unknown>) {
  const playerId = String(args.playerId || '').trim()
  if (!playerId) return textResult('playerId is required.')
  const player = await fetchSalibandyPlayer(playerId)
  if (!player) return textResult(`Player ${playerId} was not found.`)
  const summary = `${player.fullName} · ${player.teams.map((t) => t.teamName).join(', ') || 'no team'}`
  return { content: [{ type: 'text' as const, text: summary }], summary, player }
}

async function openFloorballResourceTool(args: Record<string, unknown>) {
  const kind = String(args.kind || '').trim()
  const id = String(args.id || args.query || '').trim()
  const allowed = new Set(['match', 'team', 'player', 'club', 'search', 'browse', 'favorites'])
  if (!allowed.has(kind)) return textResult('kind must be match, team, player, club, search, browse, or favorites.')
  if (typeof window === 'undefined') return textResult('No window to navigate.')
  const path =
    kind === 'search'
      ? id
        ? `#/search?q=${encodeURIComponent(id)}`
        : '#/search'
      : kind === 'browse' || kind === 'favorites'
        ? `#/${kind}`
        : `#/${kind}/${encodeURIComponent(id)}`
  if ((kind === 'match' || kind === 'team' || kind === 'player' || kind === 'club') && !id) {
    return textResult(`${kind} needs id.`)
  }
  window.location.hash = path
  return { content: [{ type: 'text' as const, text: `Opened ${path}` }], summary: `Opened ${path}`, path }
}

const TOOLS: ModelContextTool[] = [
  {
    name: 'search_floorball',
    title: 'Search SSBL',
    description:
      'Search Finnish floorball on Salibandy.fi / SSBL. Pass a club or team name (Westend, EräViikingit, SB-Pro), an age group (U14, P13), a player, or a tulospalvelu.salibandy.fi URL.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name, age group, or Salibandy.fi URL' } },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: searchFloorballTool,
  },
  {
    name: 'get_floorball_match_card',
    title: 'Floorball match',
    description:
      'Fetch an SSBL / Salibandyliitto match: three-period scores, goals, and penalties. Requires a live matchId.',
    inputSchema: {
      type: 'object',
      properties: { matchId: { type: 'string', description: 'SSBL Torneopal match id' } },
      required: ['matchId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args) => getFloorballMatchCard(args as { matchId?: string; teamId?: string }),
  },
  {
    name: 'get_floorball_team',
    title: 'Floorball team',
    description: 'Fetch an SSBL team profile: name, category, groups, and fixture count. Requires teamId.',
    inputSchema: {
      type: 'object',
      properties: { teamId: { type: 'string', description: 'TASO team id' } },
      required: ['teamId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getFloorballTeamTool,
  },
  {
    name: 'get_floorball_player',
    title: 'Floorball player',
    description: 'Fetch an SSBL player profile. Requires playerId.',
    inputSchema: {
      type: 'object',
      properties: { playerId: { type: 'string', description: 'TASO player id' } },
      required: ['playerId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getFloorballPlayerTool,
  },
  {
    name: 'open_floorball_resource',
    title: 'Open in app',
    description: 'Navigate this page to a match, team, player, club, search, browse, or favorites view.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'match | team | player | club | search | browse | favorites' },
        id: { type: 'string', description: 'Resource id or search query' },
      },
      required: ['kind'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: openFloorballResourceTool,
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
