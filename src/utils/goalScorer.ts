/**
 * Who scored a goal, read only from what TASO sends in getMatch.
 *
 * getMatch carries each goal twice: as a `maali` row in `events` and as a row
 * in the top-level `goals` array (same event_id). For an own goal the event is
 * blank (player_id 1 placeholder, empty lineup_id/player_name/shirt_number) and
 * only the `goals` row says what happened:
 *
 *   { "event_id": "42490764", "team_id": "2734", "player_id": "", "lineup_id": "",
 *     "player_shirt_number": "OM", "player_name": "maali Oma", "time": "19:33", ... }
 *
 * (929721 Indians–SPV 19:33; tulospalvelu.salibandy.fi shows it as «Oma maali».)
 * Across 497 played matches 2016–2027 every unnamed regular-time goal had this
 * shape; unnamed period-5 goals are the shootout winner's extra goal.
 */

export const OWN_GOAL_LABEL = 'Oma maali'

export interface TasoGoalRow {
  event_id?: unknown
  player_id?: unknown
  player_name?: unknown
  player_shirt_number?: unknown
  lineup_id?: unknown
}

export interface ResolvedScorer {
  kind: 'player' | 'own' | 'unknown'
  name?: string
  playerId?: string
  shirt?: string
}

const str = (v: unknown) => (v == null ? '' : String(v).trim())

export function goalRowsById(goals: unknown): Map<string, TasoGoalRow> {
  const map = new Map<string, TasoGoalRow>()
  if (!Array.isArray(goals)) return map
  for (const g of goals) {
    const id = str((g as TasoGoalRow)?.event_id)
    if (id) map.set(id, g as TasoGoalRow)
  }
  return map
}

/**
 * A player id we may link to. TASO fills unnamed rows with small placeholder
 * ids (1, 2, 4 …) and an empty lineup_id, so those are not players.
 */
export function realPlayerId(id: unknown, name: unknown, lineupId: unknown): string | undefined {
  const pid = str(id)
  if (!str(name) || !pid || pid === '0') return undefined
  if (!str(lineupId) && /^\d$/.test(pid)) return undefined
  return pid
}

export function isOwnGoalRow(row: TasoGoalRow | undefined): boolean {
  if (!row) return false
  return str(row.player_shirt_number).toUpperCase() === 'OM' || /^maali oma$/i.test(str(row.player_name))
}

export function resolveScorer(ev: Record<string, unknown>, row?: TasoGoalRow): ResolvedScorer {
  const evName = str(ev.player_name)
  if (evName) {
    return {
      kind: 'player',
      name: evName,
      playerId: realPlayerId(ev.player_id, evName, ev.lineup_id),
      shirt: str(ev.shirt_number) || undefined,
    }
  }
  if (isOwnGoalRow(row)) return { kind: 'own', name: OWN_GOAL_LABEL }
  const rowName = str(row?.player_name)
  if (row && rowName) {
    return {
      kind: 'player',
      name: rowName,
      playerId: realPlayerId(row.player_id, rowName, row.lineup_id),
      shirt: str(row.player_shirt_number) || undefined,
    }
  }
  return { kind: 'unknown' }
}
