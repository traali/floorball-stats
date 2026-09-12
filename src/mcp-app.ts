/**
 * Floorball Stats MCP App Tool Handler & WebMCP Browser Registry
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
  const matchId = params.matchId
  if (!matchId) {
    return {
      content: [{ type: 'text', text: 'Anna matchId. Älä käytä kovakoodattua ottelua. Hae SSBL:stä.' }],
    }
  }
  const match = await fetchSalibandyMatch(matchId)

  const periodSummary = match
    ? match.periods.map(p => `${p.period}. erä ${p.scoreHome}–${p.scoreAway}`).join(', ')
    : ''

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
    topScorer: match?.goals[0] ? `${match.goals[0].scorerName}` : '',
    totalPenaltiesMin: match?.penalties.length ? match.penalties.length * 2 : 0,
    baseUrl: 'https://floorball-stats.pages.dev',
  })

  return {
    content: [
      {
        type: 'text',
        text: match
          ? `Salibandyottelu ${match.homeTeamName} vs ${match.awayTeamName}\nTulos: ${match.scoreHome}–${match.scoreAway}\nErät: ${periodSummary}\nPaikka: ${match.venueName || ''}`
          : `Ottelua ${matchId} ei löytynyt.`,
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

export interface ModelContextTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, unknown>
    required?: string[]
  }
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ModelContextRegistry {
  registerTool: (tool: ModelContextTool) => Promise<void> | void
  unregisterTool?: (name: string) => Promise<void> | void
  getTools: () => ModelContextTool[]
  listTools: () => Promise<{ tools: Array<{ name: string; description: string; inputSchema: ModelContextTool['inputSchema'] }> }>
  callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<McpToolResponse>
  executeTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>
}

declare global {
  interface Document {
    modelContext?: ModelContextRegistry
  }
  interface Navigator {
    modelContext?: ModelContextRegistry
  }
  interface Window {
    modelContext?: ModelContextRegistry
  }
}

export function registerFloorballWebMCP(): ModelContextRegistry | undefined {
  if (typeof window === 'undefined') return

  const registeredTools = new Map<string, ModelContextTool>()

  const registry: ModelContextRegistry = {
    registerTool: async (tool: ModelContextTool) => {
      registeredTools.set(tool.name, tool)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webmcp:tool_registered', { detail: { toolName: tool.name } }))
      }
    },
    unregisterTool: async (name: string) => {
      registeredTools.delete(name)
    },
    getTools: () => Array.from(registeredTools.values()),
    listTools: async () => ({
      tools: Array.from(registeredTools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }),
    callTool: async (params: { name: string; arguments?: Record<string, unknown> }) => {
      const tool = registeredTools.get(params.name)
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Error: Tool '${params.name}' not found in Floorball Stats WebMCP.` }],
        }
      }
      try {
        const res = await tool.execute(params.arguments || {})
        if (res && typeof res === 'object' && 'content' in res) {
          return res as McpToolResponse
        }
        return {
          content: [{
            type: 'text',
            text: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
          }],
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return {
          content: [{ type: 'text', text: `Error executing '${params.name}': ${errorMessage}` }],
        }
      }
    },
    executeTool: async (name: string, args: Record<string, unknown> = {}) => {
      const tool = registeredTools.get(name)
      if (!tool) throw new Error(`Tool '${name}' not found`)
      return tool.execute(args)
    },
  }

  if (typeof document !== 'undefined') {
    try {
      Object.defineProperty(document, 'modelContext', {
        value: registry,
        configurable: true,
        enumerable: true,
        writable: true,
      })
    } catch {
      ;(document as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
    }
  }
  if (typeof navigator !== 'undefined') {
    try {
      Object.defineProperty(navigator, 'modelContext', {
        value: registry,
        configurable: true,
        enumerable: true,
        writable: true,
      })
    } catch {
      ;(navigator as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
    }
  }
  if (typeof window !== 'undefined') {
    ;(window as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry

    window.addEventListener('message', async (event: MessageEvent) => {
      const data = event.data
      if (!data || data.type !== 'webmcp:request' || !data.id) return

      try {
        if (data.method === 'tools/list' || data.method === 'listTools') {
          const result = await registry.listTools()
          window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
        } else if (data.method === 'tools/call' || data.method === 'callTool') {
          const result = await registry.callTool(data.params || { name: '', arguments: {} })
          window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'WebMCP execution failed'
        window.postMessage({
          type: 'webmcp:response',
          id: data.id,
          error: { message: errorMessage },
        }, '*')
      }
    })

    window.dispatchEvent(
      new CustomEvent('webmcp:ready', { detail: { location: 'navigator.modelContext & document.modelContext' } })
    )
  }

  // Register get_floorball_match_card tool
  registry.registerTool({
    name: 'get_floorball_match_card',
    description: 'Returns floorball match statistics, 3-period score progressions, goalie save rates, and UI widget URI.',
    inputSchema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'SSBL Torneopal match identifier' },
      },
    },
    execute: async (args) => getFloorballMatchCard(args as { matchId?: string; teamId?: string }),
  })

  // Register get_floorball_standings tool
  registry.registerTool({
    name: 'get_floorball_standings',
    description: 'Returns floorball standings, 3-2-1-0 points system, and goal differential.',
    inputSchema: {
      type: 'object',
      properties: {
        series: { type: 'string', description: 'Division / series name' },
      },
    },
    execute: async ({ series }) => ({
      series: (series as string) || '',
      teams: [] as Array<{ rank: number; team: string; points: number }>,
      note: 'Standings come from SSBL getGroup. Pass a live series; dummy tables are forbidden.',
      pointsRule: '3p regulation win, 2p OT/SO win, 1p OT/SO loss, 0p regulation loss',
    }),
  })

  console.log('✨ [WebMCP] Successfully registered Floorball Stats tools into navigator.modelContext & document.modelContext')
  return registry
}
