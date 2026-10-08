/**
 * How a floorball game was decided, read only from what TASO sends.
 *
 * Real getMatch / getMatches fields (F-liiga 2026-27):
 *   fs_A/fs_B   final score (a shootout win counts as one extra goal)
 *   p1s..p3s    regular periods
 *   es_A/es_B   score after regulation; only set when the game went past it
 *   p4s_A/B     overtime ("Jatkoaika"); also 0–0 on games that never had one,
 *               so it is trusted only when es_* is set
 *   ps_A/ps_B   shootout ("Rangaistuslaukauskilpailu"); only set after one
 *               (p5s_A/B carries the same numbers on getMatch)
 *   Older seasons (2017-20, e.g. 518748 Indians 5–4 TPS) put the shootout
 *   winner's extra goal in p4s (1–0) and leave p5s blank, although the events
 *   say overtime ended level. So overtime is fs − es − shootout bonus, which
 *   equals p4s on current data and gives the true 0–0 on the old shape.
 *
 *   929695 regulation  es '' ps ''   p4s 0–0 (no overtime played)
 *   929774 overtime    es 3–3 ps ''  p4s 0–1  final 3–4
 *   929721 shootout    es 4–4 ps 0–1 p4s 0–0  final 4–5
 *   518748 shootout    es 4–4 ps 2–1 p4s 1–0  final 5–4 (old shape)
 */

export type DecidedBy = 'regulation' | 'overtime' | 'shootout'

export interface Score {
  home: number
  away: number
}

export interface ResultBreakdown {
  decidedBy: DecidedBy
  /** Score after regulation, when TASO sent it (es_*). */
  regulation?: Score
  /** Overtime row, only when TASO says the game went to overtime. */
  overtime?: Score
  /** Shootout row, only when TASO sent one. */
  shootout?: Score
}

function pair(a: unknown, b: unknown): Score | undefined {
  if (a == null || a === '' || b == null || b === '') return undefined
  const home = Number(a)
  const away = Number(b)
  return Number.isFinite(home) && Number.isFinite(away) ? { home, away } : undefined
}

export function resultBreakdown(m: Record<string, unknown>): ResultBreakdown {
  const regulation = pair(m.es_A, m.es_B)
  if (!regulation) return { decidedBy: 'regulation' }
  const shootout = pair(m.ps_A, m.ps_B) ?? pair(m.p5s_A, m.p5s_B)
  const sentOvertime = pair(m.p4s_A, m.p4s_B)
  const final = pair(m.fs_A, m.fs_B)
  let overtime = sentOvertime
  if (final && (sentOvertime || !shootout)) {
    const bonusHome = shootout && shootout.home > shootout.away ? 1 : 0
    const bonusAway = shootout && shootout.away > shootout.home ? 1 : 0
    const derived = { home: final.home - regulation.home - bonusHome, away: final.away - regulation.away - bonusAway }
    if (derived.home >= 0 && derived.away >= 0) overtime = derived
  }
  return {
    decidedBy: shootout ? 'shootout' : 'overtime',
    regulation,
    ...(overtime ? { overtime } : {}),
    ...(shootout ? { shootout } : {}),
  }
}

/** Short tag after a score in lists: «4–5 rl», «3–4 ja». */
export function decidedSuffix(decidedBy?: DecidedBy): string {
  if (decidedBy === 'overtime') return 'ja'
  if (decidedBy === 'shootout') return 'rl'
  return ''
}

export function decidedTitle(decidedBy?: DecidedBy): string {
  if (decidedBy === 'overtime') return 'Ratkesi jatkoajalla'
  if (decidedBy === 'shootout') return 'Ratkesi rangaistuslaukauskilpailussa'
  return 'Ratkesi varsinaisella peliajalla'
}

/** «4–5», «4–5 rl», «3–4 ja». */
export function scoreWithSuffix(home: number, away: number, decidedBy?: DecidedBy): string {
  const tag = decidedSuffix(decidedBy)
  return tag ? `${home}–${away} ${tag}` : `${home}–${away}`
}

/** Label under the final score on the match page. */
export function finalScoreLabel(decidedBy: DecidedBy | undefined, periodCount: number): string {
  if (decidedBy === 'overtime') return 'Lopputulos (jatkoaika)'
  if (decidedBy === 'shootout') return 'Lopputulos (RL-kilpailu)'
  return periodCount === 3 ? 'Lopputulos (3 erää)' : 'Lopputulos'
}

/** «Varsinainen peliaika 4–4, Jatkoaika 0–0, RL-kilpailu 0–1» (Finnish) or the English equivalent. */
export function extraPeriodsText(result: ResultBreakdown | undefined, lang: 'fi' | 'en' = 'fi'): string {
  if (!result || result.decidedBy === 'regulation') return ''
  const names = lang === 'fi'
    ? { regulation: 'Varsinainen peliaika', overtime: 'Jatkoaika', shootout: 'RL-kilpailu' }
    : { regulation: 'regulation', overtime: 'overtime', shootout: 'shootout' }
  const parts: string[] = []
  if (result.regulation) parts.push(`${names.regulation} ${result.regulation.home}–${result.regulation.away}`)
  if (result.overtime) parts.push(`${names.overtime} ${result.overtime.home}–${result.overtime.away}`)
  if (result.shootout) parts.push(`${names.shootout} ${result.shootout.home}–${result.shootout.away}`)
  return parts.join(', ')
}

/** Period column label for an event: 1–3 «N. erä», 4 «Jatkoaika», 5 «RL-kilpailu». */
export function periodLabel(period: string | number): string {
  const n = Number(period)
  if (n === 4) return 'Jatkoaika'
  if (n === 5) return 'RL-kilpailu'
  return `${period}. Erä`
}
