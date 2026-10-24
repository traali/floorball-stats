/**
 * Stats export: JSON + CSV + Finnish analysis prompt built only from raw TASO
 * payloads (getPlayer / getMatch). Blank when TASO sent nothing; no derived ratios.
 */
export const EXPORT_SOURCE = 'TASO tulospalvelu (salibandy-api.torneopal.net) · getPlayer/getMatch'

type Raw = Record<string, any>
type Val = string | number | null

/** Value as TASO sent it; '' / null / undefined → null. */
export function v(x: unknown): Val {
  if (x === undefined || x === null) return null
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  const s = String(x).trim()
  return s === '' ? null : s
}
const flag = (x: unknown) => (x == null || x === '' ? null : String(x) === '1' || String(x).toUpperCase() === 'C' ? true : String(x) === '0' ? false : String(x))
/** TASO "Lastname Firstname" → keep as sent; prefix shirt. */
export const named = (name: unknown, shirt: unknown) => {
  const n = String(name ?? '').trim(); const s = String(shirt ?? '').trim()
  return s && s !== '0' ? `#${s} ${n}`.trim() : n
}

function result(m: Raw, side: 'A' | 'B' | null) {
  if (m.status !== 'Played') return { result: null, score: null }
  const a = v(m.fs_A), b = v(m.fs_B)
  if (a == null || b == null) return { result: null, score: null }
  const score = `${a}-${b}`
  if (!side) return { result: null, score }
  const my = Number(side === 'A' ? a : b), op = Number(side === 'A' ? b : a)
  return { result: my > op ? 'V' : my < op ? 'H' : 'T', score }
}

export function playerMatchRow(m: Raw) {
  const tid = String(m.team_id ?? '')
  const side: 'A' | 'B' | null = tid && tid === String(m.team_A_id) ? 'A' : tid && tid === String(m.team_B_id) ? 'B' : null
  const gk = String(m.player_goalkeeper_played ?? '') === '1'
  const played = m.status === 'Played'
  const { result: res, score } = result(m, side)
  return {
    match_id: v(m.match_id), date: v(m.date), time: v(m.time), status: v(m.status), season_id: v(m.season_id),
    competition: v(m.competition_name), category: v(m.category_name), group: v(m.group_name),
    team: v(m.team_name), team_id: v(m.team_id),
    opponent: side === 'A' ? v(m.team_B_name) : side === 'B' ? v(m.team_A_name) : null,
    home_away: side === 'A' ? 'koti' : side === 'B' ? 'vieras' : null,
    score, result: res,
    not_participated: flag(m.not_participated),
    goals: played ? v(m.player_goals) : null,
    assists: played ? v(m.player_assists) : null,
    points: played ? v(m.player_points) : null,
    penalty_minutes: played ? v(m.player_penaltyminutes) : null,
    goalkeeper_played: played ? flag(m.player_goalkeeper_played) : null,
    saves: played && gk ? v(m.player_saves) : null,
    conceded: played && gk ? v(m.player_conceded) : null,
  }
}
export type PlayerMatchRow = ReturnType<typeof playerMatchRow>

export function buildPlayerExport(p: Raw, fetchedAt: string) {
  const teams = (Array.isArray(p.teams) ? p.teams : []).map((t: Raw) => ({
    team_id: v(t.team_id), team: v(t.team_name), club: v(t.club_name),
    competition: v(t.primary_category?.competition_name), category: v(t.primary_category?.category_name),
    shirt_number: v(t.shirt_number), position: v(t.position_fi || t.position), captain: v(t.captain),
    overage: flag(t.overage), dual_representation: flag(t.dual_representation),
    parallel_representation: flag(t.parallel_representation), exception_representation: flag(t.exception_representation),
  }))
  const matches = (Array.isArray(p.matches) ? p.matches : []).map(playerMatchRow)
    .sort((a: PlayerMatchRow, b: PlayerMatchRow) => String(b.date).localeCompare(String(a.date)))
  const upcoming = (Array.isArray(p.upcoming) ? p.upcoming : []).map((m: Raw) => ({
    match_id: v(m.match_id), date: v(m.date), time: v(m.time), status: v(m.status),
    category: v(m.category_name), group: v(m.group_name), home: v(m.team_A_name), away: v(m.team_B_name),
  }))
  const season_totals = (Array.isArray(p.statistics) ? p.statistics : []).map((s: Raw) => ({
    season_id: v(s.season_id), competition: v(s.competition_name), category: v(s.category_name), group: v(s.group_name),
    team: v(s.team_name), matches: v(s.played_matches), goals: v(s.goals), assists: v(s.assists), points: v(s.points),
    penalty_minutes: v(s.penalty_minutes), goalkeeper_played: v(s.goalkeeper_played),
    saves: Number(s.goalkeeper_played) > 0 ? v(s.saves) : null, conceded: Number(s.goalkeeper_played) > 0 ? v(s.conceded) : null,
  }))
  // Per-series totals summed only from match rows TASO marked Played and participated.
  const series = new Map<string, Raw>()
  for (const r of matches) {
    if (r.status !== 'Played' || r.not_participated === true) continue
    const k = `${r.season_id}|${r.category}|${r.team}`
    const t = series.get(k) || { season_id: r.season_id, category: r.category, team: r.team, matches: 0, goals: null, assists: null, penalty_minutes: null, saves: null, conceded: null }
    t.matches++
    for (const f of ['goals', 'assists', 'penalty_minutes', 'saves', 'conceded'] as const) {
      const x = r[f]; if (x != null) t[f] = (t[f] ?? 0) + Number(x)
    }
    series.set(k, t)
  }
  const shirts = [...new Set(teams.map((t: Raw) => t.shirt_number).filter(Boolean))]
  const isGoalie = teams.some((t: Raw) => /^(MV|GK)$/i.test(String(t.position || ''))) || matches.some((m: PlayerMatchRow) => m.goalkeeper_played === true)
  return {
    meta: { source: EXPORT_SOURCE, endpoint: `getPlayer?player_id=${p.player_id}`, fetched_at: fetchedAt, kind: 'player' },
    profile: {
      player_id: v(p.player_id), name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), shirt_numbers: shirts,
      birth_year: v(p.birthyear), age: v(p.age), age_group: v(p.age_group), gender: v(p.gender),
      club: v(p.club_name), base_club: v(p.base_club_name), second_club: v(p.club2_name),
      overage_any: teams.some((t: Raw) => t.overage === true), dual_representation_any: teams.some((t: Raw) => t.dual_representation === true),
      goalie: isGoalie,
    },
    teams,
    previous_clubs: (Array.isArray(p.previous_clubs) ? p.previous_clubs : []).map((c: Raw) => ({ club: v(c.club_name), age_level: v(c.age_level) })),
    season_totals, series_totals: [...series.values()], matches, upcoming,
  }
}
export type PlayerExport = ReturnType<typeof buildPlayerExport>

export function buildMatchExport(m: Raw, fetchedAt: string) {
  const teamName = (id: unknown) => String(id) === String(m.team_A_id) ? v(m.team_A_name) : String(id) === String(m.team_B_id) ? v(m.team_B_name) : null
  const lineups = (Array.isArray(m.lineups) ? m.lineups : []).map((l: Raw) => ({
    team: teamName(l.team_id), player_id: v(l.player_id), name: named(l.player_name, l.shirt_number), shirt_number: v(l.shirt_number),
    birth_year: v(l.birthyear), position: v(l.position_fi || l.position), captain: v(l.captain),
    overage: flag(l.overage), dual_representation: flag(l.dual_representation),
    goals: v(l.goals), assists: v(l.assists), penalty_minutes_or_suspensions: v(l.suspensions), saves: v(l.saves), conceded: v(l.conceded),
  }))
  const SKIP = new Set(['yhteyspalasi', 'kelloseis', 'vaihto'])
  const events = (Array.isArray(m.events) ? m.events : []).filter((e: Raw) => !SKIP.has(e.code)).map((e: Raw) => ({
    period: v(e.period), time: v(e.time), code: v(e.code), type: v(e.code_fi), team: teamName(e.team_id),
    player: e.player_name ? named(e.player_name, e.shirt_number) : null, player_id: v(e.player_id),
    player_2: e.player_2_name ? named(e.player_2_name, e.shirt_2_number) : null,
    score: e.s_A != null && e.s_B != null ? `${e.s_A}-${e.s_B}` : null, description: v(e.description_text || e.description),
  }))
  const periods = [1, 2, 3, 4, 5].map((n) => ({ period: n, home: v(m[`p${n}s_A`]), away: v(m[`p${n}s_B`]) })).filter((p) => p.home != null || p.away != null)
  return {
    meta: { source: EXPORT_SOURCE, endpoint: `getMatch?match_id=${m.match_id}`, fetched_at: fetchedAt, kind: 'match' },
    match: {
      match_id: v(m.match_id), date: v(m.date), time: v(m.time), status: v(m.status), live_period: v(m.live_period), live_time: v(m.live_time_mmss),
      competition: v(m.competition_name), category: v(m.category_name), group: v(m.group_name), venue: v(m.venue_name),
      home: v(m.team_A_name), away: v(m.team_B_name), score_home: v(m.fs_A), score_away: v(m.fs_B),
      track_scorers: v(m.track_scorers), track_assists: v(m.track_assists),
    },
    periods, lineups, events,
  }
}
export type MatchExport = ReturnType<typeof buildMatchExport>

// ---------- CSV ----------
function cell(x: unknown) {
  if (x == null) return ''
  const s = Array.isArray(x) ? x.join(' ') : String(x)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function toCsv(rows: Raw[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}
const metaCsv = (meta: Raw) => [...Object.entries(meta).map(([k, x]) => `# ${k}: ${x}`), `# haettu: ${helsinkiTime(String(meta.fetched_at))}`].join('\n')
export function playerCsv(x: PlayerExport) {
  return [metaCsv(x.meta), `# player: ${x.profile.name} (${x.profile.shirt_numbers.map((s) => '#' + s).join(' ')})`, '', '## matches', toCsv(x.matches),
    '', '## season_totals (TASO statistics)', toCsv(x.season_totals), '', '## series_totals (summed from match rows)', toCsv(x.series_totals),
    '', '## upcoming', toCsv(x.upcoming)].join('\n') + '\n'
}
export function matchCsv(x: MatchExport) {
  return [metaCsv(x.meta), `# ${x.match.home} - ${x.match.away} ${x.match.score_home ?? ''}-${x.match.score_away ?? ''} (${x.match.status})`, '',
    '## lineups', toCsv(x.lineups), '', '## events', toCsv(x.events), '', '## periods', toCsv(x.periods)].join('\n') + '\n'
}

// ---------- Prompt ----------
export const PROMPT_MAX = 24000
/** Human-readable Helsinki time for an ISO UTC timestamp (data keeps the ISO). */
export function helsinkiTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) + ' (Helsingin aikaa)'
}
/**
 * Fit JSON under `max` chars by dropping whole array items (oldest matches first —
 * arrays are newest-first — then other arrays' tail items). Never cuts characters,
 * so the result always parses. Returns how many matches were dropped.
 */
export function compactJson(x: unknown, max: number): { json: string; trimmed: boolean; droppedMatches: number; droppedOther: number } {
  let json = JSON.stringify(x)
  if (json.length <= max) return { json, trimmed: false, droppedMatches: 0, droppedOther: 0 }
  const c = JSON.parse(json) as Record<string, any>
  let droppedMatches = 0, droppedOther = 0
  const size = () => JSON.stringify(c).length
  if (Array.isArray(c.matches)) while (c.matches.length && size() > max) { c.matches.pop(); droppedMatches++ }
  const order = ['events', 'series_totals', 'season_totals', 'upcoming', 'previous_clubs', 'lineups', 'teams', 'periods']
  for (const key of order) if (Array.isArray(c[key])) while (c[key].length && size() > max) { c[key].pop(); droppedOther++ }
  json = JSON.stringify(c)
  return { json, trimmed: true, droppedMatches, droppedOther }
}
function trimNote(t: { trimmed: boolean; droppedMatches: number; droppedOther: number }) {
  if (!t.trimmed) return ''
  const parts = [`${t.droppedMatches} vanhinta ottelua pois`]
  if (t.droppedOther) parts.push(`${t.droppedOther} muuta riviä pois`)
  return `- Huom: data on lyhennetty (${parts.join(', ')}).`
}
const RULES = [
  'Käytä VAIN alla olevaa dataa. Älä keksi tilastoja, äläkä laske torjuntaprosentteja tai muita johdettuja lukuja, joita datassa ei ole.',
  'Jos jokin tieto puuttuu (tyhjä/null), sano se suoraan.',
  'Muista: U14-tasolla ja nuoremmissa pelaajatilastoja (maalit, syötöt, torjunnat) ei välttämättä kirjata lainkaan, joten nolla tai tyhjä ei tarkoita huonoa suoritusta.',
  'Numero (#) on pelinumero. Vastaa suomeksi, tiiviisti otsikoin.',
]
export function playerPrompt(x: PlayerExport, max = PROMPT_MAX) {
  const t = compactJson(x, max)
  const who = `${x.profile.shirt_numbers[0] ? '#' + x.profile.shirt_numbers[0] + ' ' : ''}${x.profile.name}`
  const ask = x.profile.goalie
    ? `Analysoi maalivahti ${who}: vire viimeisissä otteluissa, torjunnat ja päästetyt maalit siltä osin kuin TASO ne kirjasi, kehitys kausittain ja sarjoittain, vahvuudet, roolin eri joukkueissa ja ikäluokissa sekä seuraavat ottelut.`
    : `Analysoi pelaaja ${who}: vire viimeisissä otteluissa, vahvuudet, trendit kausittain ja sarjoittain, rooli eri joukkueissa ja ikäluokissa sekä seuraavat ottelut.`
  return [ask, ...RULES.map((r) => '- ' + r), trimNote(t), `Lähde: ${x.meta.source}, haettu ${helsinkiTime(x.meta.fetched_at)}.`, '', 'DATA (JSON):', t.json].filter(Boolean).join('\n')
}
export function matchPrompt(x: MatchExport, max = PROMPT_MAX) {
  const t = compactJson(x, max)
  return [`Analysoi salibandyottelu ${x.match.home} – ${x.match.away} (${x.match.date}, ${x.match.category}): ottelun kulku erittäin, ratkaisevat hetket, joukkueiden ja yksittäisten pelaajien (myös maalivahtien) suoritukset sekä huomiot kokoonpanoista (syntymävuodet, yli-ikäiset).`,
    ...RULES.map((r) => '- ' + r), trimNote(t), `Lähde: ${x.meta.source}, haettu ${helsinkiTime(x.meta.fetched_at)}.`, '', 'DATA (JSON):', t.json].filter(Boolean).join('\n')
}
