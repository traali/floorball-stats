/**
 * "Ottelun tapahtumat" timeline built only from TASO getMatch match.events.
 * Goals pair with assists (syotto) by connected_event_id or same period+time+team.
 * No pass counts exist in TASO — only assists. Unknown fields stay blank.
 */
type Raw = Record<string, any>

export type TimelineItem =
  | { kind: 'goal'; id: string; time: string; side: 'A' | 'B' | null; scorer: string; assist: string | null; score: string | null; goalie: string | null }
  | { kind: 'penalty'; id: string; time: string; side: 'A' | 'B' | null; minutes: string; player: string; reason: string | null; reasonText: string | null }
  | { kind: 'goalie'; id: string; time: string; side: 'A' | 'B' | null; player: string; note: string | null }
  | { kind: 'marker'; id: string; time: string; label: string }

export type TimelinePeriod = { period: number; label: string; items: TimelineItem[] }

const s = (x: unknown) => (x == null ? '' : String(x).trim())
export const who = (name: unknown, shirt: unknown) => {
  const n = s(name), sh = s(shirt)
  return sh && sh !== '0' ? `#${sh} ${n}`.trim() : n
}
const side = (e: Raw, m: Raw): 'A' | 'B' | null => {
  if (e.team === 'A' || e.team === 'B') return e.team
  const t = s(e.team_id)
  return t && t === s(m.team_A_id) ? 'A' : t && t === s(m.team_B_id) ? 'B' : null
}
export const periodLabel = (n: number) => (n >= 1 && n <= 3 ? `${n}. erä` : n === 4 ? 'Jatkoaika' : n === 5 ? 'Voittomaalikilpailu' : `Jakso ${n}`)
const PENALTY = /^\d+min$|^(rangaistus|ottelurangaistus|pr|ur)/i

export function buildTimeline(m: Raw): TimelinePeriod[] {
  const ev: Raw[] = Array.isArray(m?.events) ? m.events : []
  const assists = ev.filter((e) => e.code === 'syotto')
  const conceded = ev.filter((e) => e.code === 'paastetty')
  const usedA = new Set<Raw>(), usedC = new Set<Raw>()
  const sameMoment = (a: Raw, b: Raw) => s(a.period) === s(b.period) && s(a.time) === s(b.time)
  const byPeriod = new Map<number, TimelineItem[]>()
  const push = (p: number, it: TimelineItem) => { if (!byPeriod.has(p)) byPeriod.set(p, []); byPeriod.get(p)!.push(it) }
  for (const e of ev) {
    const p = Number(e.period) || 0
    if (p < 1) continue
    const id = s(e.event_id), time = s(e.time)
    if (e.code === 'maali') {
      const a = assists.find((x) => !usedA.has(x) && s(x.connected_event_id) === id)
        ?? assists.find((x) => !usedA.has(x) && sameMoment(x, e) && s(x.team_id) === s(e.team_id) && s(x.description) === s(e.description))
      if (a) usedA.add(a)
      const c = conceded.find((x) => !usedC.has(x) && s(x.connected_event_id) === id) ?? conceded.find((x) => !usedC.has(x) && sameMoment(x, e) && s(x.team_id) !== s(e.team_id))
      if (c) usedC.add(c)
      const score = s(e.description) || (e.s_A != null && e.s_B != null ? `${e.s_A}-${e.s_B}` : '')
      push(p, { kind: 'goal', id, time, side: side(e, m), scorer: who(e.player_name, e.shirt_number), assist: a ? who(a.player_name, a.shirt_number) : null, score: score || null, goalie: c && s(c.player_name) ? who(c.player_name, c.shirt_number) : null })
    } else if (PENALTY.test(s(e.code))) {
      push(p, { kind: 'penalty', id, time, side: side(e, m), minutes: s(e.code), player: who(e.player_name, e.shirt_number), reason: s(e.description) || null, reasonText: s(e.description_text) || null })
    } else if (e.code === 'mvvaihto') {
      push(p, { kind: 'goalie', id, time, side: side(e, m), player: who(e.player_name, e.shirt_number), note: s(e.description) || null })
    } else if (/^jakso/.test(s(e.code))) {
      const code = s(e.code)
      if (code === 'jaksoloppui') {
        // TASO stamps the end as e.g. '15+44:59' (bogus clock) → plain marker without a time.
        push(p, { kind: 'marker', id, time: '', label: 'Erä päättyi' })
      } else if (code === 'jaksovaihtui') {
        // TASO often sends this twice; show it at most once per period.
        if (!(byPeriod.get(p) ?? []).some((x) => x.kind === 'marker' && x.label === 'Jakso vaihtui')) push(p, { kind: 'marker', id, time, label: 'Jakso vaihtui' })
      } else {
        push(p, { kind: 'marker', id, time, label: s(e.code_fi) || code })
      }
    }
    // vaihto, syotto (paired), paastetty (paired), yhteyspalasi, kelloseis: not shown on their own
  }
  const rank = (it: TimelineItem) => (it.kind === 'marker' ? (/loppui|päättyi/i.test(it.label) ? 2 : -1) : 0)
  const secs = (t: string) => { const m = /^(\d+):(\d+)$/.exec(t); return m ? Number(m[1]) * 60 + Number(m[2]) : 0 }
  const ordered = (items: TimelineItem[]) => items.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it) - rank(b.it) || secs(a.it.time) - secs(b.it.time) || a.i - b.i).map((x) => x.it)
  return [...byPeriod.entries()].sort((a, b) => a[0] - b[0]).map(([period, items]) => ({ period, label: periodLabel(period), items: ordered(items) }))
}

export const isLiveStatus = (status: unknown) => /^(Live|Käynnissä|Running|Ongoing)$/i.test(s(status))
