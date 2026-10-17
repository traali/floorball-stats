/**
 * What state a game is in and which score (if any) may be shown, read only from
 * TASO fields. Real shapes (checked 8.10. and 17.10.2026):
 *
 *   Fixture    fs_A/fs_B "0" on getMatch, "" on getMatches; 2022 games still
 *              Fixture 0–0 (444223) → no score
 *   Live/Break running score in fs_A/fs_B (and live_A/live_B); periods may be
 *              half blank mid-game (954282 p1s_A "" p1s_B "0")
 *   Played     final score
 *   Walkover   getMatches status "Forfeited"; getMatch says "Played" but has
 *              walkover 1 and forfeit_A/forfeit_B "match":
 *                951963 Ilves Green 0–10 Loiske (forfeit_A "match")
 *                951954 IkU – Ilves Green fs "-2"/"-2", winner "Tie" (forfeit_B)
 *              Negative numbers are a TASO sentinel, never a score.
 */

export type MatchState = 'upcoming' | 'live' | 'break' | 'played' | 'walkover'

const LIVE = new Set(['live', 'started', 'playing', 'inplay', 'in_play', 'ongoing', '2', 'interrupted'])
const PLAYED = new Set(['played', 'finished', '1'])

const s = (v: unknown) => (v == null ? '' : String(v).trim())

export function isWalkover(m: Record<string, unknown>): boolean {
  const st = s(m.status).toLowerCase()
  return st === 'forfeited' || Number(m.walkover) === 1 || s(m.forfeit_A) !== '' || s(m.forfeit_B) !== ''
}

export function matchState(m: Record<string, unknown>): MatchState {
  const st = s(m.status).toLowerCase()
  if (isWalkover(m)) return 'walkover'
  if (st === 'break') return 'break'
  if (LIVE.has(st) || st.includes('live') || s(m.time).includes("'")) return 'live'
  if (PLAYED.has(st)) return 'played'
  return 'upcoming'
}

/** Which side gave the game away, when TASO says. */
export function forfeitedBy(m: Record<string, unknown>): 'home' | 'away' | 'both' | undefined {
  const a = s(m.forfeit_A) !== ''
  const b = s(m.forfeit_B) !== ''
  if (a && b) return 'both'
  if (a) return 'home'
  if (b) return 'away'
  return undefined
}

function pair(a: unknown, b: unknown): { home: number; away: number } | undefined {
  if (s(a) === '' || s(b) === '') return undefined
  const home = Number(a)
  const away = Number(b)
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) return undefined
  return { home, away }
}

function hasPeriodData(m: Record<string, unknown>): boolean {
  return ['p1s_A', 'p1s_B', 'p2s_A', 'p2s_B', 'p3s_A', 'p3s_B'].some((k) => s(m[k]) !== '')
}

/**
 * The score to show, or undefined. Unplayed games never get one; a played 0–0
 * needs some sign the game happened (period scores or events).
 */
export function tasoScore(
  m: Record<string, unknown>,
  events?: Array<{ code?: string }>,
): { home: number; away: number } | undefined {
  const state = matchState(m)
  if (state === 'upcoming') return undefined
  const score = pair(m.fs_A, m.fs_B) ?? (state === 'live' || state === 'break' ? pair(m.live_A, m.live_B) : undefined)
  if (!score) return undefined
  if (state !== 'played' || score.home !== 0 || score.away !== 0) return score
  if (events) {
    const eventful = events.some((ev) => {
      const c = String(ev.code || '')
      return c === 'maali' || c === 'syotto' || c.includes('min') || c === 'torjunta'
    })
    return eventful ? score : undefined
  }
  return hasPeriodData(m) ? score : undefined
}

/** Short list tag after a walkover result. */
export const WALKOVER_TAG = 'luov.'

export function walkoverText(m: Record<string, unknown>, homeName: string, awayName: string): string {
  const by = forfeitedBy(m)
  if (by === 'home') return `Luovutus: ${homeName} luovutti`
  if (by === 'away') return `Luovutus: ${awayName} luovutti`
  if (by === 'both') return 'Luovutus: molemmat luovuttivat'
  return 'Luovutus'
}
