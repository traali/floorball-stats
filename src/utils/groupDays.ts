import type { SalibandyGroupMatch } from '../types/salibandy'

/** Game days of a group, oldest first. */
export function groupDays(matches: SalibandyGroupMatch[]): string[] {
  return [...new Set(matches.map((m) => m.date).filter(Boolean))].sort()
}

/** Today if the group plays today, else the next game day, else the last one. */
export function defaultGroupDay(matches: SalibandyGroupMatch[], todayIso: string): string | undefined {
  const days = groupDays(matches)
  if (!days.length) return undefined
  if (days.includes(todayIso)) return todayIso
  return days.find((d) => d > todayIso) ?? days[days.length - 1]
}

/** What to print in the score slot of a list row; never a number TASO did not send. */
export function groupMatchScoreText(m: SalibandyGroupMatch, suffix: (h: number, a: number) => string): string {
  if (m.state === 'walkover') return m.scoreHome != null ? `${m.scoreHome}–${m.scoreAway} luov.` : 'Luovutus'
  if (m.scoreHome == null || m.scoreAway == null) return 'vs'
  return suffix(m.scoreHome, m.scoreAway)
}
