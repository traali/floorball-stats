/**
 * SSBL Salibandy / Torneopal REST API Client
 * Base: https://salibandy-api.torneopal.net/taso/rest
 */

import type {
  SalibandyMatchDetail,
  SalibandyGoalEvent,
  SalibandyPenaltyEvent,
  SalibandySaveEvent,
  SalibandyPeriodScore,
  SalibandyPlayerLeader,
  SalibandyRosterPlayer,
  SalibandyTeamFixture,
  SalibandyStandingRow,
  SalibandyTeamProfile,
  SalibandySeasonGroup,
  SalibandyClubSummary,
  SalibandyClubDetail,
  SalibandyClubTeam,
  SalibandyCompetition,
  SalibandyCategory,
  SalibandyGroupSummary,
  SalibandyGroupDetail,
  SalibandyGroupTeam,
  SalibandyGroupMatch,
  SalibandyPlayerProfile,
  SalibandyPlayerMatch,
  SalibandyPlayerTeam,
  DiscoveryHit,
} from '../types/salibandy'
import { formatClock, helsinkiDateISO, isKickoffUpcoming } from '../utils/matchContext.ts'
import { resultBreakdown, scoreWithSuffix } from '../utils/matchResult.ts'
import { goalRowsById, resolveScorer } from '../utils/goalScorer.ts'

/** 0–0 on a game that has not started is a Torneopal placeholder, not a draw. */
export function floorballScore(
  m: Record<string, unknown>,
  events?: Array<{ code?: string }>,
): { home: number; away: number } | undefined {
  const rawA = m.fs_A
  const rawB = m.fs_B
  if (rawA == null || rawA === '' || rawB == null || rawB === '') return undefined
  const home = Number(rawA)
  const away = Number(rawB)
  if (!Number.isFinite(home) || !Number.isFinite(away)) return undefined
  if (home !== 0 || away !== 0) return { home, away }
  const st = String(m.status || '').toLowerCase()
  const time = String(m.time || '')
  if (st === 'live' || st.includes('live') || st === '2' || time.includes("'")) return { home, away }
  const date = String(m.date || '')
  if (date === '' || isKickoffUpcoming(date, time) || date >= helsinkiDateISO()) return undefined
  if (events) {
    const eventful = events.some((ev) => {
      const c = String(ev.code || '')
      return c === 'maali' || c === 'syotto' || c.includes('min') || c === 'torjunta'
    })
    if (!eventful) return undefined
  }
  return { home, away }
}

const API_BASE = 'https://salibandy-api.torneopal.net/taso/rest'
// Public key the official tulospalvelu.salibandy.fi front end uses. It rides in
// Accept (a CORS-safelisted header, so no preflight). Torneopal also wants a
// Referer, which the browser sends on its own. The shared taso-proxy Worker got
// upstream 403 on every uncached salibandy call, so it is no longer tried.
const SALIBANDY_KEY = 'zsn3anknxzcfzc23k53jqdcd4pymutsf'

const reqHeaders = {
  Accept: `json/${SALIBANDY_KEY}`,
}

type CacheEntry = { at: number; data: unknown; ttl: number }
const memCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000
const CLUBS_TTL_MS = 5 * 60 * 1000
const UPCOMING_TTL_MS = 30 * 1000
const ROSTER_TTL_MS = 60 * 1000
const LIVE_STATUSES = new Set(['live', 'started', 'playing', 'inplay', 'in_play', 'ongoing', '2', 'interrupted'])

function matchPhase(data: unknown): 'live' | 'upcoming' | 'played' | 'none' {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const match = (rec?.match && typeof rec.match === 'object' ? rec.match : rec) as Record<string, unknown> | null
  if (!match) return 'none'
  const st = String(match.status || '').toLowerCase().trim()
  if (LIVE_STATUSES.has(st) || st.includes('live') || String(match.time || '').includes("'")) return 'live'
  if (st === 'played' || st === '1' || st === 'finished') return 'played'
  if ('status' in match || 'team_A_name' in match || 'match_id' in match) return 'upcoming'
  return 'none'
}

function ttlForPayload(path: string, data: unknown, fallback: number): number {
  const phase = matchPhase(data)
  if (phase === 'live') return 0
  if (path.startsWith('getMatch')) return phase === 'played' ? CACHE_TTL_MS : UPCOMING_TTL_MS
  if (path.startsWith('getMatches')) {
    const matches = data && typeof data === 'object' ? (data as { matches?: unknown[] }).matches : null
    if (Array.isArray(matches) && matches.some((m) => matchPhase(m) === 'live')) return 0
    return UPCOMING_TTL_MS
  }
  if (path.startsWith('getPlayers')) return fallback
  if (path.startsWith('getTeam') || path.startsWith('getPlayer') || path.startsWith('getGroup')) return ROSTER_TTL_MS
  return fallback
}

function cacheGet<T>(key: string): T | null {
  const hit = memCache.get(key)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data as T
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`sb:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (Date.now() - parsed.at < (parsed.ttl || CACHE_TTL_MS)) {
      memCache.set(key, parsed)
      return parsed.data as T
    }
  } catch {
    /* ignore */
  }
  return null
}

function cacheSet(key: string, data: unknown, ttl: number) {
  if (ttl <= 0) return
  const entry: CacheEntry = { at: Date.now(), data, ttl }
  memCache.set(key, entry)
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`sb:${key}`, JSON.stringify(entry))
  } catch {
    /* quota */
  }
}

/** Pull the JSON body out of a Torneopal reply (it sometimes prefixes PHP dumps). */
export function parseTasoBody<T>(text: string): T | null {
  const start = text.indexOf('{"')
  if (start < 0) return null
  try {
    const data = JSON.parse(text.slice(start)) as T & { call?: { status?: string } }
    const status = String(data?.call?.status || '').toLowerCase()
    if (status && status !== 'ok') return null
    return data
  } catch {
    return null
  }
}

/** True when Torneopal answered with JSON saying `status: error` (e.g. not found). */
export function isTasoError(text: string): boolean {
  const start = text.indexOf('{"')
  if (start < 0) return false
  try {
    const data = JSON.parse(text.slice(start)) as { call?: { status?: string } }
    return String(data?.call?.status || '').toLowerCase() === 'error'
  } catch {
    return false
  }
}

/**
 * Direct to Torneopal, then the same URL with a cache-buster: the Torneopal edge
 * caches a 403 for 60 s per URL, so the busted URL gets past a poisoned entry.
 */
async function tasoFetch<T>(path: string): Promise<T | null> {
  const sep = path.includes('?') ? '&' : '?'
  const urls = [`${API_BASE}/${path}`, `${API_BASE}/${path}${sep}_cb=${Date.now()}`]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: reqHeaders })
      if (!res.ok) continue
      const text = await res.text()
      const data = parseTasoBody<T>(text)
      if (data) return data
      // A clean JSON error («Player not found») is an answer; only a 403 page
      // or a non-JSON body is worth the cache-busted retry.
      if (isTasoError(text)) return null
    } catch (err) {
      console.warn('[SALIBANDY_API]', url, err)
    }
  }
  return null
}

async function tasoGet<T>(path: string, cacheKey?: string, ttl?: number): Promise<T | null> {
  const key = cacheKey || path
  const cached = cacheGet<T>(key)
  if (cached) return cached
  const data = await tasoFetch<T>(path)
  if (data) cacheSet(key, data, ttlForPayload(path, data, ttl ?? CACHE_TTL_MS))
  return data
}

/** Test hook: forget the in-memory caches. */
export function resetSalibandyCaches() {
  memCache.clear()
  teamIndexMem = null
  teamIndexInflight = null
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v).trim()
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function numericId(v: unknown): string | undefined {
  const s = str(v)
  return /^\d+$/.test(s) ? s : undefined
}

export function normalizeSearch(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseSalibandyQuery(raw: string):
  | { kind: 'match'; id: string }
  | { kind: 'team'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'club'; id: string }
  | { kind: 'id'; id: string }
  | { kind: 'text'; q: string } {
  const val = raw.trim()
  if (!val) return { kind: 'text', q: '' }

  const matchUrl = val.match(/(?:ottelu|match(?:_id)?)[=/](\d+)/i)
  if (matchUrl) return { kind: 'match', id: matchUrl[1] }

  const teamUrl = val.match(/(?:joukkue|team(?:_id)?)[=/](\d+)/i)
  if (teamUrl) return { kind: 'team', id: teamUrl[1] }

  const playerUrl = val.match(/(?:pelaaja|player(?:_id)?)[=/](\d+)/i)
  if (playerUrl) return { kind: 'player', id: playerUrl[1] }

  const clubUrl = val.match(/(?:seura|club(?:_id)?)[=/](\d+)/i)
  if (clubUrl) return { kind: 'club', id: clubUrl[1] }

  if (/^\d{1,9}$/.test(val)) return { kind: 'id', id: val }

  return { kind: 'text', q: val }
}

export async function fetchSalibandyMatch(matchId: string): Promise<SalibandyMatchDetail | null> {
  try {
    const data = await tasoGet<{ match?: any }>(`getMatch?match_id=${encodeURIComponent(matchId)}`, `getMatch:${matchId}`, 60_000)
    if (!data?.match) return null

    const m = data.match
    const rawEvents: any[] = Array.isArray(m.events) ? m.events : []

    const goals: SalibandyGoalEvent[] = []
    const assistsMap = new Map<string, string>()

    for (const ev of rawEvents) {
      if (ev.code === 'syotto') {
        const key = `${ev.time}_${ev.team}`
        assistsMap.set(key, ev.player_name || '')
      }
    }

    const result = resultBreakdown(m)
    const goalRows = goalRowsById(m.goals)

    for (const ev of rawEvents) {
      if (ev.code === 'maali') {
        const key = `${ev.time}_${ev.team}`
        const fiText = String(ev.code_fi || '').toLowerCase()
        // The shootout winner's extra goal: period 5 «maali», with no player
        // (2026-27) or with the deciding shooter (older seasons, «maali (VL 5-4)»).
        const isShootoutGoal = Boolean(result.shootout) && String(ev.period) === '5'
        const scorer = isShootoutGoal ? resolveScorer(ev) : resolveScorer(ev, goalRows.get(String(ev.event_id ?? '')))
        goals.push({
          eventId: String(ev.event_id || Math.random()),
          code: 'maali',
          time: String(ev.time || '00:00'),
          period: String(ev.period || '1'),
          scorerName: isShootoutGoal && !scorer.name ? 'RL-kilpailun voittomaali' : scorer.name || 'Tuntematon',
          scorerShirtNumber: scorer.shirt || '',
          scorerPlayerId: scorer.playerId,
          assistName: scorer.kind === 'own' ? undefined : assistsMap.get(key) || undefined,
          assistPlayerId: undefined,
          team: ev.team === 'A' ? 'home' : 'away',
          scoreHome: Number(ev.s_A || 0),
          scoreAway: Number(ev.s_B || 0),
          description: ev.description_text || ev.code_fi,
          isPowerplayGoal: fiText.includes('yv') || fiText.includes('ylivoima'),
          isShorthandedGoal: fiText.includes('av') || fiText.includes('alivoima'),
          isEmptyNetGoal: fiText.includes('tm') || fiText.includes('tyhjä'),
          ...(isShootoutGoal ? { isShootoutGoal: true } : {}),
          ...(scorer.kind === 'own' ? { isOwnGoal: true } : {}),
        })
      }
    }

    const penalties: SalibandyPenaltyEvent[] = []
    for (const ev of rawEvents) {
      if (ev.code === '2min' || ev.code === '5min' || ev.code === '2+2min' || ev.code?.includes('rangaistus')) {
        penalties.push({
          eventId: String(ev.event_id || Math.random()),
          code: (ev.code as any) || '2min',
          time: String(ev.time || '00:00'),
          period: String(ev.period || '1'),
          playerName: String(ev.player_name || 'Pelaaja'),
          playerId: ev.player_id ? String(ev.player_id) : undefined,
          shirtNumber: String(ev.shirt_number || ''),
          team: ev.team === 'A' ? 'home' : 'away',
          reasonCode: String(ev.description || '2min'),
          reasonText: String(ev.description_text || 'Rangaistus'),
        })
      }
    }

    const saves: SalibandySaveEvent[] = []
    let homeSaves = 0
    let awaySaves = 0
    let homeGoalieName = 'Maalivahti'
    let awayGoalieName = 'Maalivahti'

    for (const ev of rawEvents) {
      if (ev.code === 'torjunta') {
        const isHome = ev.team === 'A'
        if (isHome) {
          homeSaves++
          if (ev.player_name) homeGoalieName = ev.player_name
        } else {
          awaySaves++
          if (ev.player_name) awayGoalieName = ev.player_name
        }
        saves.push({
          eventId: String(ev.event_id || Math.random()),
          code: 'torjunta',
          time: String(ev.time || '00:00'),
          period: String(ev.period || '1'),
          goalieName: String(ev.player_name || 'Maalivahti'),
          team: isHome ? 'home' : 'away',
        })
      }
    }

    // The shootout's extra goal is not a goal against a goalkeeper in play.
    const homeConceded = goals.filter(g => g.team === 'away' && !g.isShootoutGoal).length
    const awayConceded = goals.filter(g => g.team === 'home' && !g.isShootoutGoal).length

    const homeSavePct = homeSaves + homeConceded > 0
      ? `${((homeSaves / (homeSaves + homeConceded)) * 100).toFixed(1)}%`
      : '–'

    const awaySavePct = awaySaves + awayConceded > 0
      ? `${((awaySaves / (awaySaves + awayConceded)) * 100).toFixed(1)}%`
      : '–'

    const periods: SalibandyPeriodScore[] = []
    const pushPeriod = (period: 1 | 2 | 3, rawHome: unknown, rawAway: unknown) => {
      const blank = (v: unknown) => v == null || v === ''
      const inPeriod = goals.filter((g) => g.period === String(period))
      if (blank(rawHome) && blank(rawAway) && inPeriod.length === 0) return
      const scoreHome = blank(rawHome) ? inPeriod.filter((g) => g.team === 'home').length : Number(rawHome)
      const scoreAway = blank(rawAway) ? inPeriod.filter((g) => g.team === 'away').length : Number(rawAway)
      if (!Number.isFinite(scoreHome) || !Number.isFinite(scoreAway)) return
      periods.push({ period, scoreHome, scoreAway })
    }
    pushPeriod(1, m.p1s_A, m.p1s_B)
    pushPeriod(2, m.p2s_A, m.p2s_B)
    pushPeriod(3, m.p3s_A, m.p3s_B)

    const spectatorEvent = rawEvents.find(e => e.code === 'katsojia')
    const spectators = spectatorEvent ? Number(spectatorEvent.description || 0) : Number(m.attendance || 0)

    const st = String(m.status || '').toLowerCase().trim()
    const time = String(m.time || '')
    const live = st === 'live' || st.includes('live') || st === '2' || time.includes("'")
    const scored = floorballScore(m, rawEvents)
    const phase: SalibandyMatchDetail['phase'] = live
      ? 'live'
      : scored
        ? 'played'
        : 'upcoming'

    const hasScore = phase !== 'upcoming' && scored !== undefined

    const lineups = extractMatchRosters(m)

    return {
      matchId: String(m.match_id || matchId),
      matchNumber: m.match_number,
      competitionName: String(m.competition_name || 'Salibandyliiga / Sarja'),
      categoryName: String(m.category_name || ''),
      competitionId: m.competition_id ? String(m.competition_id) : undefined,
      categoryId: m.category_id ? String(m.category_id) : undefined,
      groupId: m.group_id ? String(m.group_id) : undefined,
      date: String(m.date || ''),
      time: formatClock(time) || time,
      venueName: String(m.venue_name || 'Peliareena'),
      venueLat: m.venue_lat ? Number(m.venue_lat) : undefined,
      venueLon: m.venue_lon ? Number(m.venue_lon) : undefined,
      homeTeamName: String(m.team_A_name || 'Koti'),
      awayTeamName: String(m.team_B_name || 'Vieras'),
      homeTeamId: m.team_A_id ? String(m.team_A_id) : undefined,
      awayTeamId: m.team_B_id ? String(m.team_B_id) : undefined,
      scoreHome: hasScore && scored ? scored.home : 0,
      scoreAway: hasScore && scored ? scored.away : 0,
      isLive: phase === 'live',
      phase,
      referee1: m.referee_1_name ? String(m.referee_1_name) : undefined,
      referee2: m.referee_2_name ? String(m.referee_2_name) : undefined,
      spectators: spectators || undefined,
      playingTimeMin: m.playing_time_min ? Number(m.playing_time_min) : 45,
      periods,
      ...(hasScore ? { result } : {}),
      goals,
      penalties,
      saves,
      goalkeepers: {
        home: {
          goalieName: homeGoalieName,
          saves: homeSaves,
          goalsConceded: homeConceded,
          savePercentage: homeSavePct,
        },
        away: {
          goalieName: awayGoalieName,
          saves: awaySaves,
          goalsConceded: awayConceded,
          savePercentage: awaySavePct,
        },
      },
      totalEvents: rawEvents.length,
      homeRoster: lineups.home,
      awayRoster: lineups.away,
    }
  } catch (err) {
    console.error('[SALIBANDY_API]', err)
    return null
  }
}

export async function fetchSalibandyTeamRoster(teamId: string): Promise<SalibandyRosterPlayer[]> {
  const paths = [
    `getTeam?team_id=${encodeURIComponent(teamId)}`,
    `getTeam?team_id=${encodeURIComponent(teamId)}&players=1`,
  ]
  for (const path of paths) {
    const data = await tasoGet<{ team?: { players?: unknown[] } }>(path, path.startsWith('getTeam?') ? `getTeam:${teamId}:${path.includes('players') ? 'p1' : 'plain'}` : path)
    const players = data?.team?.players
    if (Array.isArray(players) && players.length > 0) {
      return players.map((p) => mapRosterPlayer(p as Record<string, unknown>)).filter((p) => p.playerId && p.fullName)
    }
  }
  return []
}

export function mapRosterPlayer(p: Record<string, unknown>): SalibandyRosterPlayer {
  const first = str(p.first_name || p.firstname || '')
  const last = str(p.last_name || p.lastname || '')
  const full = `${first} ${last}`.trim() || str(p.player_name || p.name || p.fullname || '')
  const goals = pickNum(p, ['goals', 'g', 'maalit', 'player_goals', 'stat_goals'])
  const assists = pickNum(p, ['assists', 'a', 'syotot', 'syötöt', 'player_assists'])
  return {
    playerId: str(p.player_id || p.id || p.playerid),
    firstName: first,
    lastName: last,
    fullName: full,
    shirtNumber: str(p.shirt_number || p.number || p.jersey),
    birthYear: str(p.birthyear || p.birth_year || ''),
    isCaptain: p.captain === '1' || p.captain === 'yes' || p.captain === true,
    imageUrl: (p.img_url as string) || (p.image as string) || undefined,
    goals,
    assists,
    points: pickNum(p, ['points', 'p', 'tehopisteet'], goals + assists),
    penaltiesMin: pickNum(p, ['penalties_min', 'pim', 'rm']) || pickNum(p, ['suspensions', 'warnings']) * 2,
  }
}

function asPlayerList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>)
  return []
}

function sideOfPlayer(p: Record<string, unknown>, homeId?: string, awayId?: string): 'home' | 'away' | null {
  const team = str(p.team || p.team_code || p.side || p.team_ab).toUpperCase()
  if (team === 'A' || team === 'HOME' || team === '1' || team === 'KOTI') return 'home'
  if (team === 'B' || team === 'AWAY' || team === '2' || team === 'VIERAS') return 'away'
  const tid = str(p.team_id || p.teamId)
  if (homeId && tid && tid === homeId) return 'home'
  if (awayId && tid && tid === awayId) return 'away'
  return null
}

/** TASO getMatch lineup shapes: players[], team_A_players, lineups.A, team_A.players */
export function extractMatchRosters(m: Record<string, unknown>): { home: SalibandyRosterPlayer[]; away: SalibandyRosterPlayer[] } {
  const homeId = m?.team_A_id ? String(m.team_A_id) : undefined
  const awayId = m?.team_B_id ? String(m.team_B_id) : undefined
  const home: SalibandyRosterPlayer[] = []
  const away: SalibandyRosterPlayer[] = []
  const seenH = new Set<string>()
  const seenA = new Set<string>()

  const push = (raw: unknown, forced: 'home' | 'away' | null) => {
    if (!raw || typeof raw !== 'object') return
    const rec = raw as Record<string, unknown>
    const mapped = mapRosterPlayer(rec)
    if (!mapped.playerId || mapped.playerId === 'undefined') return
    if (!mapped.fullName) return
    const side = forced || sideOfPlayer(rec, homeId, awayId)
    if (side === 'home' && !seenH.has(mapped.playerId)) {
      seenH.add(mapped.playerId)
      home.push(mapped)
    } else if (side === 'away' && !seenA.has(mapped.playerId)) {
      seenA.add(mapped.playerId)
      away.push(mapped)
    }
  }

  for (const p of asPlayerList(m?.players)) push(p, null)
  for (const p of asPlayerList(m?.lineup)) push(p, null)
  for (const p of asPlayerList(m?.team_players)) push(p, null)
  for (const p of asPlayerList(m?.team_A_players)) push(p, 'home')
  for (const p of asPlayerList(m?.team_B_players)) push(p, 'away')
  for (const p of asPlayerList(m?.lineup_A)) push(p, 'home')
  for (const p of asPlayerList(m?.lineup_B)) push(p, 'away')
  const teamA = m?.team_A as Record<string, unknown> | undefined
  const teamB = m?.team_B as Record<string, unknown> | undefined
  for (const p of asPlayerList(teamA?.players)) push(p, 'home')
  for (const p of asPlayerList(teamB?.players)) push(p, 'away')
  const lu = m?.lineups as Record<string, unknown> | undefined
  if (lu && typeof lu === 'object' && !Array.isArray(lu)) {
    for (const p of asPlayerList(lu.A || lu.home || lu.team_A)) push(p, 'home')
    for (const p of asPlayerList(lu.B || lu.away || lu.team_B)) push(p, 'away')
  }

  return { home, away }
}

export function determineSeasonHalf(dateStr?: string, categoryName?: string): 'syksy' | 'kevat' {
  const cat = (categoryName || '').toUpperCase()
  if (cat.includes('SYKSY') || cat.includes('AUTUMN')) return 'syksy'
  if (cat.includes('KEVÄT') || cat.includes('KEVAT') || cat.includes('SPRING')) return 'kevat'
  if (dateStr && dateStr.length >= 7) {
    const month = parseInt(dateStr.slice(5, 7), 10)
    if (month >= 8 && month <= 12) return 'syksy'
    if (month >= 1 && month <= 7) return 'kevat'
  }
  return 'syksy'
}

export function getSeasonYear(dateStr?: string): string {
  if (dateStr && dateStr.length >= 4) {
    return dateStr.slice(0, 4)
  }
  return '2026'
}

export function pickHeroMatch(fixtures: SalibandyTeamFixture[], todayIso: string): SalibandyTeamFixture | null {
  if (!fixtures || fixtures.length === 0) return null
  const upcoming = fixtures
    .filter(f => f.date >= todayIso && !f.score)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  if (upcoming.length > 0) return upcoming[0]

  const played = fixtures
    .filter(f => Boolean(f.score))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  if (played.length > 0) return played[0]

  return fixtures[0] || null
}

export async function fetchSalibandyTeamFixtures(teamId: string): Promise<SalibandyTeamFixture[]> {
  const data = await tasoGet<{ matches?: Record<string, unknown>[] }>(
    `getMatches?team_id=${encodeURIComponent(teamId)}`,
    `getMatches:team:${teamId}`,
  )
  if (!Array.isArray(data?.matches)) return []

  return data.matches.map((m: Record<string, unknown>) => {
      const isHome = String(m.team_A_id) === teamId
      const scored = floorballScore(m)
      const scoreHome = scored?.home
      const scoreAway = scored?.away
      const decidedBy = resultBreakdown(m).decidedBy

      let isWin = false
      let isDraw = false
      let isLoss = false

      if (scored) {
        if (isHome) {
          isWin = scored.home > scored.away
          isDraw = scored.home === scored.away
          isLoss = scored.home < scored.away
        } else {
          isWin = scored.away > scored.home
          isDraw = scored.home === scored.away
          isLoss = scored.away < scored.home
        }
      }

      const rawDate = String(m.date || '')
      const rawCat = String(m.category_name || '')
      const seasonHalf = determineSeasonHalf(rawDate, rawCat)
      const seasonYear = getSeasonYear(rawDate)

      return {
        matchId: String(m.match_id),
        matchNumber: m.match_number ? String(m.match_number) : undefined,
        date: rawDate,
        time: String(m.time || ''),
        homeTeam: String(m.team_A_name || 'Koti'),
        awayTeam: String(m.team_B_name || 'Vieras'),
        homeTeamId: m.team_A_id ? String(m.team_A_id) : undefined,
        awayTeamId: m.team_B_id ? String(m.team_B_id) : undefined,
        score: scored ? scoreWithSuffix(scored.home, scored.away, decidedBy) : undefined,
        scoreHome,
        scoreAway,
        ...(scored && decidedBy !== 'regulation' ? { decidedBy } : {}),
        isHome,
        isWin,
        isDraw,
        isLoss,
        venueName: String(m.venue_name || 'Kenttä'),
        categoryName: rawCat,
        competitionId: m.competition_id ? String(m.competition_id) : undefined,
        categoryId: m.category_id ? String(m.category_id) : undefined,
        status: String(m.status || ''),
        seasonYear,
        seasonHalf,
      }
    })
}

export async function fetchSalibandyTeamProfile(teamId: string): Promise<SalibandyTeamProfile | null> {
  try {
    const data = await tasoGet<{ call?: { status?: string }; team?: any }>(
      `getTeam?team_id=${encodeURIComponent(teamId)}`,
      `getTeam:${teamId}`,
    )
    if (!data?.team) return null

    const t = data.team
    const rawPlayers: any[] = Array.isArray(t.players) ? t.players : []
    const players: SalibandyRosterPlayer[] = rawPlayers.map((p: any) => mapRosterPlayer(p))

    const rawGroups: any[] = Array.isArray(t.groups) ? t.groups : []
    const groups: SalibandySeasonGroup[] = rawGroups.map((g: any) => ({
      competitionId: String(g.competition_id || ''),
      competitionName: String(g.competition_name || ''),
      categoryId: String(g.category_id || ''),
      categoryName: String(g.category_name || ''),
      groupId: String(g.group_id || ''),
      groupName: String(g.group_name || ''),
      seasonId: g.competition_season || undefined,
      isCurrent: g.group_current === '1' || g.competition_status === 'published',
      competitionStatus: g.competition_status ? String(g.competition_status) : undefined,
    }))

    const fixtures = await fetchSalibandyTeamFixtures(teamId)

    const published = groups.find(g => g.competitionStatus === 'published')
    const categoryName =
      published?.categoryName ||
      groups[0]?.categoryName ||
      String(t.primary_category?.category_name || '')

    return {
      teamId: String(t.team_id || teamId),
      teamName: String(t.team_name || 'Salibandyjoukkue'),
      clubName: String(t.club_name || ''),
      clubId: t.club_id ? String(t.club_id) : undefined,
      clubCrest: t.club_crest || t.crest || undefined,
      categoryName,
      players,
      fixtures,
      groups,
    }
  } catch (err) {
    console.error('[SALIBANDY_PROFILE_API]', err)
    return null
  }
}

export function pickCurrentGroup(groups: SalibandySeasonGroup[]): SalibandySeasonGroup | null {
  if (!groups.length) return null
  const published = groups.find(g => g.competitionStatus === 'published')
  if (published) return published
  const current = groups.find(g => g.isCurrent)
  if (current) return current
  const season2026 = groups.find(g => (g.seasonId || '').includes('2026'))
  return season2026 || groups[0]
}

export function computePlayerLeaders(match: SalibandyMatchDetail): SalibandyPlayerLeader[] {
  const leadersMap = new Map<string, SalibandyPlayerLeader>()

  for (const g of match.goals) {
    if (g.isShootoutGoal || g.isOwnGoal) continue
    const key = `${g.scorerName}_${g.team}`
    const existing = leadersMap.get(key) || {
      playerName: g.scorerName,
      shirtNumber: g.scorerShirtNumber,
      teamName: g.team === 'home' ? match.homeTeamName : match.awayTeamName,
      goals: 0,
      assists: 0,
      points: 0,
      penaltiesMin: 0,
    }
    existing.goals += 1
    existing.points += 1
    leadersMap.set(key, existing)

    if (g.assistName) {
      const aKey = `${g.assistName}_${g.team}`
      const aExisting = leadersMap.get(aKey) || {
        playerName: g.assistName,
        shirtNumber: '',
        teamName: g.team === 'home' ? match.homeTeamName : match.awayTeamName,
        goals: 0,
        assists: 0,
        points: 0,
        penaltiesMin: 0,
      }
      aExisting.assists += 1
      aExisting.points += 1
      leadersMap.set(aKey, aExisting)
    }
  }

  for (const p of match.penalties) {
    const key = `${p.playerName}_${p.team}`
    const existing = leadersMap.get(key) || {
      playerName: p.playerName,
      shirtNumber: p.shirtNumber,
      teamName: p.team === 'home' ? match.homeTeamName : match.awayTeamName,
      goals: 0,
      assists: 0,
      points: 0,
      penaltiesMin: 0,
    }
    existing.penaltiesMin += 2
    leadersMap.set(key, existing)
  }

  return Array.from(leadersMap.values()).sort((a, b) => b.points - a.points || b.goals - a.goals)
}

export function lastFormForTeam(
  teamId: string,
  matches: SalibandyGroupMatch[],
): ('V' | 'T' | 'H')[] {
  return matches
    .filter(
      (m) =>
        m.scoreHome != null &&
        m.scoreAway != null &&
        (m.homeTeamId === teamId || m.awayTeamId === teamId),
    )
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5)
    .map((m) => {
      if (m.scoreHome === m.scoreAway) return 'T' as const
      const home = m.homeTeamId === teamId
      const won = home ? m.scoreHome! > m.scoreAway! : m.scoreAway! > m.scoreHome!
      return won ? ('V' as const) : ('H' as const)
    })
    .reverse()
}

export function mapGroupTeamsToStandings(
  teams: SalibandyGroupTeam[],
  matches: SalibandyGroupMatch[] = [],
): SalibandyStandingRow[] {
  return [...teams]
    .sort((a, b) => a.rank - b.rank || b.points - a.points)
    .map((t) => ({
      rank: t.rank || 0,
      teamId: t.teamId,
      teamName: t.teamName,
      matchesPlayed: t.played,
      wins: t.wins,
      draws: t.draws,
      losses: t.losses,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      diff: t.diff,
      totalPoints: t.points,
      form: lastFormForTeam(t.teamId, matches),
    }))
}

/** @deprecated Use fetchSalibandyGroup standings. Kept for offline fallback only. */
export function fetchSalibandyStandings(): SalibandyStandingRow[] {
  return []
}

export async function fetchSalibandyCompetitions(): Promise<SalibandyCompetition[]> {
  const data = await tasoGet<{ competitions?: any[] }>('getCompetitions?current=1', 'getCompetitions', CLUBS_TTL_MS)
  const list = Array.isArray(data?.competitions) ? data!.competitions : []
  return list.map((c: any) => ({
    competitionId: str(c.competition_id),
    competitionName: str(c.competition_name),
    seasonId: str(c.season_id),
    status: str(c.competition_status),
    startDate: c.competition_start_date ? str(c.competition_start_date) : undefined,
    endDate: c.competition_end_date ? str(c.competition_end_date) : undefined,
    organiser: c.organiser_name ? str(c.organiser_name) : str(c.organiser) || undefined,
    locationName: c.competition_location_name ? str(c.competition_location_name) : undefined,
  }))
}

export async function fetchSalibandyCategories(competitionId: string): Promise<SalibandyCategory[]> {
  const data = await tasoGet<{ categories?: any[] }>(
    `getCategories?competition_id=${encodeURIComponent(competitionId)}`,
    `getCategories:${competitionId}`,
  )
  const list = Array.isArray(data?.categories) ? data!.categories : []
  return list.map((c: any) => ({
    categoryId: str(c.category_id),
    categoryName: str(c.category_name),
    competitionId: str(c.competition_id || competitionId),
    competitionName: str(c.competition_name),
    groupCount: c.group_count != null ? num(c.group_count) : undefined,
    teamCount: c.team_count != null ? num(c.team_count) : undefined,
    ageGroup: c.category_age_group ? str(c.category_age_group) : undefined,
    gender: c.category_gender_fi ? str(c.category_gender_fi) : str(c.category_gender) || undefined,
  }))
}

export async function fetchSalibandyGroups(competitionId: string, categoryId: string): Promise<SalibandyGroupSummary[]> {
  const data = await tasoGet<{ groups?: any[] }>(
    `getGroups?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}`,
    `getGroups:${competitionId}:${categoryId}`,
  )
  const list = Array.isArray(data?.groups) ? data!.groups : []
  return list.map((g: any) => ({
    groupId: str(g.group_id),
    groupName: str(g.group_name),
    competitionId: str(g.competition_id || competitionId),
    competitionName: str(g.competition_name),
    categoryId: str(g.category_id || categoryId),
    categoryName: str(g.category_name),
    teamCount: Array.isArray(g.teams) ? g.teams.length : num(g.team_count),
  }))
}

function mapGroupTeam(t: Record<string, unknown>): SalibandyGroupTeam {
  return {
    teamId: str(t.team_id),
    teamName: str(t.team_name),
    clubId: t.club_id ? str(t.club_id) : undefined,
    crest: (t.crest as string) || undefined,
    rank: num(t.current_standing || t.final_group_standing),
    points: num(t.points),
    played: num(t.matches_played),
    wins: num(t.matches_won),
    draws: num(t.matches_tied),
    losses: num(t.matches_lost),
    goalsFor: num(t.goals_for),
    goalsAgainst: num(t.goals_against),
    diff: num(t.goals_diff, num(t.goals_for) - num(t.goals_against)),
  }
}

function mapGroupMatch(m: Record<string, unknown>): SalibandyGroupMatch {
  const scored = floorballScore(m)
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    scoreHome: scored?.home,
    scoreAway: scored?.away,
    ...(scored && resultBreakdown(m).decidedBy !== 'regulation' ? { decidedBy: resultBreakdown(m).decidedBy } : {}),
    status: str(m.status),
    venueName: m.venue_name ? str(m.venue_name) : undefined,
  }
}

export async function fetchSalibandyGroup(
  competitionId: string,
  categoryId: string,
  groupId: string,
): Promise<SalibandyGroupDetail | null> {
  const data = await tasoGet<{ group?: any }>(
    `getGroup?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}&group_id=${encodeURIComponent(groupId)}`,
    `getGroup:${competitionId}:${categoryId}:${groupId}`,
    3 * 60 * 1000,
  )
  const g = data?.group
  if (!g) return null
  const teams = Array.isArray(g.teams) ? (g.teams as Record<string, unknown>[]).map(mapGroupTeam) : []
  const matches = Array.isArray(g.matches) ? (g.matches as Record<string, unknown>[]).map(mapGroupMatch) : []
  return {
    groupId: str(g.group_id || groupId),
    groupName: str(g.group_name),
    competitionId: str(g.competition_id || competitionId),
    competitionName: str(g.competition_name),
    categoryId: str(g.category_id || categoryId),
    categoryName: str(g.category_name),
    teams,
    matches,
  }
}

export async function fetchSalibandyClubs(): Promise<SalibandyClubSummary[]> {
  const data = await tasoGet<{ clubs?: any[] }>('getClubs', 'getClubs', CLUBS_TTL_MS)
  const list = Array.isArray(data?.clubs) ? data!.clubs : []
  return list
    .filter((c: any) => str(c.archived) !== '1' && str(c.name) && !str(c.name).startsWith('#'))
    .map((c: any) => ({
      clubId: str(c.club_id),
      name: str(c.name),
      abbreviation: str(c.abbrevation || c.abbreviation),
      cityName: str(c.city_name),
      crest: c.crest || undefined,
      region: c.region ? str(c.region) : undefined,
    }))
}

function mapClubTeam(t: any): SalibandyClubTeam {
  const pc = t.primary_category || {}
  return {
    teamId: str(t.team_id),
    teamName: str(t.team_name || pc.category_team_name),
    status: str(t.status, 'active'),
    categoryName: str(pc.category_name),
    competitionName: str(pc.competition_name || pc.tournament_name),
    competitionId: pc.competition_id ? str(pc.competition_id) : undefined,
    categoryId: pc.category_id ? str(pc.category_id) : undefined,
    season: pc.competition_season ? str(pc.competition_season) : undefined,
    venueName: t.home_venue_name ? str(t.home_venue_name) : undefined,
  }
}

export async function fetchSalibandyClub(clubId: string): Promise<SalibandyClubDetail | null> {
  const data = await tasoGet<{ club?: any }>(
    `getClub?club_id=${encodeURIComponent(clubId)}`,
    `getClub:${clubId}`,
  )
  const c = data?.club
  if (!c) return null
  const teams = Array.isArray(c.teams) ? c.teams.map(mapClubTeam) : []
  return {
    clubId: str(c.club_id || clubId),
    name: str(c.name),
    abbreviation: str(c.abbrevation || c.abbreviation),
    cityName: str(c.city_name),
    crest: c.crest || undefined,
    www: c.www ? str(c.www) : undefined,
    districtName: c.district_name ? str(c.district_name) : undefined,
    venueName: c.home_venue_name ? str(c.home_venue_name) : undefined,
    teams,
  }
}

function pickNum(obj: any, keys: string[], fallback = 0): number {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') {
      const n = num(obj[k], Number.NaN)
      if (Number.isFinite(n)) return n
    }
  }
  return fallback
}

function mapPlayerMatch(m: any): SalibandyPlayerMatch {
  const scoreHome = m.fs_A != null && m.fs_A !== '' ? num(m.fs_A) : undefined
  const scoreAway = m.fs_B != null && m.fs_B !== '' ? num(m.fs_B) : undefined
  const stats = m.stats || m.player_stats || m.statistics || {}
  const goals = pickNum(m, ['player_goals', 'goals', 'g', 'maalit', 'stat_goals'], pickNum(stats, ['goals', 'g', 'maalit']))
  const assists = pickNum(m, ['player_assists', 'assists', 'a', 'syotot', 'syötöt'], pickNum(stats, ['assists', 'a']))
  const pim = pickNum(m, ['suspensions', 'penalties_min', 'pim', 'rangaistusminuutit', 'penalty_minutes', 'rm'], pickNum(stats, ['suspensions', 'pim']))
  const plusMinus = pickNum(m, ['plusminus', 'plus_minus', 'pm'], pickNum(stats, ['plusminus', 'plus_minus']))
  const shots = pickNum(m, ['shots', 'shots_total', 'laukaukset'], pickNum(stats, ['shots']))
  const saves = pickNum(m, ['saves', 'torjunnat', 'saves_total'], pickNum(stats, ['saves']))
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    status: str(m.status),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    teamId: numericId(m.team_id),
    scoreHome,
    scoreAway,
    categoryName: str(m.category_name),
    competitionName: str(m.competition_name),
    seasonId: m.season_id ? str(m.season_id) : undefined,
    goals,
    assists,
    points: pickNum(m, ['player_points', 'points'], goals + assists),
    pim,
    plusMinus,
    shots,
    saves,
    venueName: m.venue_name ? str(m.venue_name) : undefined,
  }
}

export async function fetchSalibandyPlayer(playerId: string): Promise<SalibandyPlayerProfile | null> {
  const data = await tasoGet<{ player?: any }>(
    `getPlayer?player_id=${encodeURIComponent(playerId)}`,
    `getPlayer:${playerId}`,
    5 * 60 * 1000,
  )
  const p = data?.player
  if (!p) return null
  const teams: SalibandyPlayerTeam[] = (Array.isArray(p.teams) ? p.teams : []).map((t: any) => ({
    teamId: str(t.team_id),
    teamName: str(t.team_name),
    clubName: t.club_name ? str(t.club_name) : undefined,
    categoryName: t.primary_category?.category_name ? str(t.primary_category.category_name) : undefined,
    competitionName: t.primary_category?.competition_name ? str(t.primary_category.competition_name) : undefined,
    shirtNumber: t.shirt_number ? str(t.shirt_number) : undefined,
  }))
  const matches = (Array.isArray(p.matches) ? p.matches : []).map(mapPlayerMatch)
  const upcoming = (Array.isArray(p.upcoming) ? p.upcoming : []).map(mapPlayerMatch)
  return {
    playerId: str(p.player_id || playerId),
    firstName: str(p.first_name),
    lastName: str(p.last_name),
    fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Pelaaja #${playerId}`,
    birthYear: p.birthyear ? str(p.birthyear) : undefined,
    age: p.age != null ? num(p.age) : undefined,
    clubId: p.club_id ? str(p.club_id) : undefined,
    clubName: p.club_name ? str(p.club_name) : undefined,
    imageUrl: p.img_url || undefined,
    ageGroup: p.age_group ? str(p.age_group) : undefined,
    teams,
    matches,
    upcoming,
  }
}

// ---------------------------------------------------------------------------
// Search. Every hit below comes from a Torneopal reply; nothing is invented.
// ---------------------------------------------------------------------------

export interface TeamIndexEntry {
  teamId: string
  clubId?: string
  teamName: string
  categoryName: string
  competitionId: string
  crest?: string
}

export interface ClubPlayer {
  playerId: string
  firstName: string
  lastName: string
  fullName: string
  birthYear?: string
  clubId: string
  seasonMatchCount: number
}

export interface SearchOptions {
  /** Clubs of saved favourites: their players are searched by name too. */
  favoriteClubIds?: string[]
}

export interface SearchResult {
  hits: DiscoveryHit[]
  /** Clubs whose player lists were searched for this query. */
  playerClubs: { clubId: string; name: string }[]
}

export const TEAM_INDEX_KEY = 'floorball.teamIndex.v1'
const TEAM_INDEX_TTL_MS = 12 * 60 * 60 * 1000
const TEAM_INDEX_RETRY_MS = 5 * 60 * 1000
const CLUB_PLAYERS_TTL_MS = 10 * 60 * 1000
const MAX_PLAYER_CLUBS = 4
const MAX_FAVORITE_CLUBS = 6

type SlimTeam = [string, string, string, string, string, string]
let teamIndexMem: { at: number; teams: TeamIndexEntry[] } | null = null
let teamIndexInflight: Promise<TeamIndexEntry[]> | null = null

function localStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readTeamIndex(): { at: number; teams: TeamIndexEntry[] } | null {
  if (teamIndexMem) return teamIndexMem
  const ls = localStore()
  if (!ls) return null
  try {
    const raw = ls.getItem(TEAM_INDEX_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: unknown; teams?: unknown }
    if (typeof parsed?.at !== 'number' || !Array.isArray(parsed.teams)) return null
    const teams = (parsed.teams as SlimTeam[])
      .filter((r) => Array.isArray(r) && numericId(r[0]) && str(r[2]))
      .map((r) => ({
        teamId: str(r[0]),
        clubId: numericId(r[1]),
        teamName: str(r[2]),
        categoryName: str(r[3]),
        competitionId: str(r[4]),
        crest: str(r[5]) || undefined,
      }))
    teamIndexMem = { at: parsed.at, teams }
    return teamIndexMem
  } catch {
    return null
  }
}

function writeTeamIndex(teams: TeamIndexEntry[]) {
  teamIndexMem = { at: Date.now(), teams }
  const ls = localStore()
  if (!ls) return
  const slim: SlimTeam[] = teams.map((t) => [t.teamId, t.clubId || '', t.teamName, t.categoryName, t.competitionId, t.crest || ''])
  try {
    ls.setItem(TEAM_INDEX_KEY, JSON.stringify({ at: teamIndexMem.at, teams: slim }))
  } catch {
    /* quota: the in-memory copy still serves this visit */
  }
}

/**
 * Every team registered in the current competitions (getCompetitions?current=1,
 * then getTeams per competition). Kept ~12 h in localStorage.
 */
export async function fetchTeamIndex(): Promise<TeamIndexEntry[]> {
  const cached = readTeamIndex()
  if (cached && cached.teams.length > 0 && Date.now() - cached.at < TEAM_INDEX_TTL_MS) return cached.teams
  if (teamIndexInflight) return teamIndexInflight
  teamIndexInflight = (async () => {
    const comps = await fetchSalibandyCompetitions()
    const lists = await Promise.all(
      comps.map((c) => tasoFetch<{ teams?: any[] }>(`getTeams?competition_id=${encodeURIComponent(c.competitionId)}`)),
    )
    const byId = new Map<string, TeamIndexEntry>()
    let complete = comps.length > 0
    for (const data of lists) {
      if (!data || !Array.isArray(data.teams)) {
        complete = false
        continue
      }
      for (const t of data.teams) {
        const teamId = numericId(t?.team_id)
        const teamName = str(t?.team_name)
        if (!teamId || !teamName) continue
        const categoryName = str(t.category_name)
        const existing = byId.get(teamId)
        if (existing) {
          if (categoryName && !existing.categoryName.includes(categoryName) && existing.categoryName.split(' / ').length < 3) {
            existing.categoryName = existing.categoryName ? `${existing.categoryName} / ${categoryName}` : categoryName
          }
          continue
        }
        byId.set(teamId, {
          teamId,
          clubId: numericId(t.club_id),
          teamName,
          categoryName,
          competitionId: str(t.competition_id),
          crest: str(t.crest) || undefined,
        })
      }
    }
    const teams = [...byId.values()]
    if (teams.length > 0 && complete) writeTeamIndex(teams)
    else if (teams.length > 0) teamIndexMem = { at: Date.now() - TEAM_INDEX_TTL_MS + TEAM_INDEX_RETRY_MS, teams }
    return teams.length > 0 ? teams : cached?.teams ?? []
  })().finally(() => {
    teamIndexInflight = null
  })
  return teamIndexInflight
}

/** Players registered to a club (getPlayers?club_id). */
export async function fetchClubPlayers(clubId: string): Promise<ClubPlayer[]> {
  const id = numericId(clubId)
  if (!id) return []
  const data = await tasoGet<{ players?: any[] }>(`getPlayers?club_id=${id}`, `getPlayers:club:${id}`, CLUB_PLAYERS_TTL_MS)
  const list = Array.isArray(data?.players) ? data!.players : []
  return list.flatMap((p: any) => {
    const playerId = numericId(p?.player_id)
    const firstName = str(p?.first_name)
    const lastName = str(p?.last_name)
    const fullName = `${firstName} ${lastName}`.trim()
    if (!playerId || !fullName) return []
    return [
      {
        playerId,
        firstName,
        lastName,
        fullName,
        birthYear: str(p.birth_year || p.birthyear) || undefined,
        clubId: numericId(p.club_id) || id,
        seasonMatchCount: num(p.season_match_count),
      },
    ]
  })
}

async function lookupTeamHit(id: string): Promise<DiscoveryHit | null> {
  const data = await tasoGet<{ team?: any }>(`getTeam?team_id=${encodeURIComponent(id)}`, `getTeam:${id}`)
  const t = data?.team
  const title = str(t?.team_name)
  if (!t || !title) return null
  return {
    kind: 'team',
    id: numericId(t.team_id) || id,
    title,
    subtitle: [str(t.club_abbrevation) || str(t.club_name), str(t.primary_category?.category_name)].filter(Boolean).join(' · ') || 'Joukkue',
    clubId: numericId(t.club_id),
    crest: str(t.crest) || undefined,
  }
}

async function lookupPlayerHit(id: string): Promise<DiscoveryHit | null> {
  const data = await tasoGet<{ player?: any }>(`getPlayer?player_id=${encodeURIComponent(id)}`, `getPlayer:${id}`, 5 * 60 * 1000)
  const p = data?.player
  const title = `${str(p?.first_name)} ${str(p?.last_name)}`.trim()
  if (!p || !title) return null
  return {
    kind: 'player',
    id: numericId(p.player_id) || id,
    title,
    subtitle: [str(p.club_abbrevation) || str(p.club_name), p.birthyear ? `s. ${str(p.birthyear)}` : ''].filter(Boolean).join(' · ') || 'Pelaaja',
    clubId: numericId(p.club_id),
  }
}

async function lookupClubHit(id: string): Promise<DiscoveryHit | null> {
  const data = await tasoGet<{ club?: any }>(`getClub?club_id=${encodeURIComponent(id)}`, `getClub:${id}`)
  const c = data?.club
  const name = str(c?.name)
  if (!c || !name) return null
  return {
    kind: 'club',
    id: numericId(c.club_id) || id,
    title: str(c.abbrevation || c.abbreviation) || name,
    subtitle: [str(c.city_name), 'Seura'].filter(Boolean).join(' · '),
    clubId: numericId(c.club_id) || id,
    crest: str(c.crest) || undefined,
  }
}

async function lookupMatchHit(id: string): Promise<DiscoveryHit | null> {
  const data = await tasoGet<{ match?: any }>(`getMatch?match_id=${encodeURIComponent(id)}`, `getMatch:${id}`, 60_000)
  const m = data?.match
  const home = str(m?.team_A_name)
  const away = str(m?.team_B_name)
  if (!m || (!home && !away)) return null
  return {
    kind: 'match',
    id: numericId(m.match_id) || id,
    title: `${home || '?'} – ${away || '?'}`,
    subtitle: [str(m.date), str(m.time).slice(0, 5), str(m.category_name)].filter(Boolean).join(' · ') || 'Ottelu',
  }
}

async function lookupById(parsed: { kind: 'match' | 'team' | 'player' | 'club' | 'id'; id: string }): Promise<DiscoveryHit[]> {
  const lookups: Promise<DiscoveryHit | null>[] = []
  if (parsed.kind === 'club' || parsed.kind === 'id') lookups.push(lookupClubHit(parsed.id))
  if (parsed.kind === 'team' || parsed.kind === 'id') lookups.push(lookupTeamHit(parsed.id))
  if (parsed.kind === 'player' || parsed.kind === 'id') lookups.push(lookupPlayerHit(parsed.id))
  if (parsed.kind === 'match' || parsed.kind === 'id') lookups.push(lookupMatchHit(parsed.id))
  const settled = await Promise.all(lookups.map((p) => p.catch(() => null)))
  return settled.filter((h): h is DiscoveryHit => Boolean(h))
}

function textRank(name: string, q: string, tokens: string[]): number {
  if (name === q) return 0
  if (name.startsWith(q)) return 1
  if (tokens.every((t) => name.includes(t))) return 2
  return 3
}

export async function searchSalibandy(query: string, opts: SearchOptions = {}): Promise<SearchResult> {
  const parsed = parseSalibandyQuery(query)
  if (parsed.kind !== 'text') return { hits: await lookupById(parsed), playerClubs: [] }

  const q = normalizeSearch(parsed.q)
  if (q.length < 2) return { hits: [], playerClubs: [] }
  const tokens = q.split(' ').filter(Boolean)

  const [clubs, teams] = await Promise.all([
    fetchSalibandyClubs().catch(() => [] as SalibandyClubSummary[]),
    fetchTeamIndex().catch(() => [] as TeamIndexEntry[]),
  ])
  const clubById = new Map(clubs.map((c) => [c.clubId, c]))
  const hits: DiscoveryHit[] = []

  // Clubs: every token in name / abbreviation / city.
  const clubHits = clubs
    .map((c) => ({ c, hay: normalizeSearch(`${c.name} ${c.abbreviation} ${c.cityName}`), name: normalizeSearch(c.abbreviation || c.name) }))
    .filter(({ hay }) => tokens.every((t) => hay.includes(t)))
    .sort((a, b) => textRank(a.name, q, tokens) - textRank(b.name, q, tokens) || a.name.localeCompare(b.name))
    .slice(0, 8)
  for (const { c } of clubHits) {
    hits.push({
      kind: 'club',
      id: c.clubId,
      title: c.abbreviation || c.name,
      subtitle: [c.cityName, 'Seura'].filter(Boolean).join(' · '),
      clubId: c.clubId,
      crest: c.crest,
    })
  }

  // Teams: every token in team name / category / club.
  const teamHits = teams
    .map((t) => {
      const club = t.clubId ? clubById.get(t.clubId) : undefined
      return {
        t,
        club,
        name: normalizeSearch(t.teamName),
        hay: normalizeSearch(`${t.teamName} ${t.categoryName} ${club?.name ?? ''} ${club?.abbreviation ?? ''}`),
      }
    })
    .filter(({ hay }) => tokens.every((tok) => hay.includes(tok)))
    .sort((a, b) => textRank(a.name, q, tokens) - textRank(b.name, q, tokens) || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, 20)
  for (const { t, club } of teamHits) {
    hits.push({
      kind: 'team',
      id: t.teamId,
      title: t.teamName,
      subtitle: [t.categoryName, club?.abbreviation || club?.name].filter(Boolean).join(' · '),
      clubId: t.clubId,
      crest: t.crest,
    })
  }

  // Players: there is no name search in TASO. Search the player lists of clubs
  // named in the query (the rest of the query is the player's name) and of the
  // clubs behind saved favourites.
  const candidates: { club: SalibandyClubSummary; residual: string[]; score: number }[] = []
  for (const c of clubs) {
    const hay = normalizeSearch(`${c.name} ${c.abbreviation}`)
    const words = hay.split(' ')
    const matched = tokens.filter((t) => (t.length >= 3 && hay.includes(t)) || words.includes(t))
    if (matched.length === 0) continue
    const residual = tokens.filter((t) => !matched.includes(t))
    if (residual.length === 0) continue
    candidates.push({ club: c, residual, score: matched.length * 10 + (words.some((w) => matched.includes(w)) ? 1 : 0) })
  }
  candidates.sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name))
  const playerClubs = candidates.slice(0, MAX_PLAYER_CLUBS)
  const seenClubs = new Set(playerClubs.map((c) => c.club.clubId))
  for (const favId of (opts.favoriteClubIds || []).slice(0, MAX_FAVORITE_CLUBS)) {
    const club = clubById.get(favId)
    if (!club || seenClubs.has(club.clubId)) continue
    seenClubs.add(club.clubId)
    playerClubs.push({ club, residual: tokens, score: 0 })
  }
  const playerLists = await Promise.all(playerClubs.map((c) => fetchClubPlayers(c.club.clubId).catch(() => [] as ClubPlayer[])))
  const playerHits: { p: ClubPlayer; club: SalibandyClubSummary }[] = []
  const seenPlayers = new Set<string>()
  playerLists.forEach((list, i) => {
    const { club, residual } = playerClubs[i]
    for (const p of list) {
      const hay = normalizeSearch(p.fullName)
      if (!residual.every((t) => hay.includes(t))) continue
      if (seenPlayers.has(p.playerId)) continue
      seenPlayers.add(p.playerId)
      playerHits.push({ p, club })
    }
  })
  playerHits
    .sort((a, b) => b.p.seasonMatchCount - a.p.seasonMatchCount || a.p.fullName.localeCompare(b.p.fullName))
    .slice(0, 25)
    .forEach(({ p, club }) => {
      hits.push({
        kind: 'player',
        id: p.playerId,
        title: p.fullName,
        subtitle: [club.abbreviation || club.name, p.birthYear ? `s. ${p.birthYear}` : ''].filter(Boolean).join(' · '),
        clubId: club.clubId,
      })
    })

  // Competitions and categories from the live competition list.
  const comps = await fetchSalibandyCompetitions().catch(() => [] as SalibandyCompetition[])
  for (const c of comps) {
    const hay = normalizeSearch(`${c.competitionName} ${c.organiser || ''} ${c.locationName || ''}`)
    if (tokens.every((t) => hay.includes(t))) {
      hits.push({ kind: 'competition', id: c.competitionId, title: c.competitionName, subtitle: c.seasonId })
    }
  }
  if (teamHits.length < 6 && playerHits.length === 0) {
    const catLists = await Promise.all(comps.slice(0, 4).map((c) => fetchSalibandyCategories(c.competitionId).catch(() => [])))
    for (const list of catLists) {
      for (const cat of list) {
        const name = normalizeSearch(cat.categoryName)
        if (!tokens.every((t) => name.includes(t))) continue
        hits.push({
          kind: 'category',
          id: `${cat.competitionId}::${cat.categoryId}`,
          title: cat.categoryName,
          subtitle: cat.competitionName,
        })
      }
    }
  }

  return {
    hits,
    playerClubs: playerClubs.map(({ club }) => ({ clubId: club.clubId, name: club.abbreviation || club.name })),
  }
}

export async function searchDiscovery(query: string, opts?: SearchOptions): Promise<DiscoveryHit[]> {
  return (await searchSalibandy(query, opts)).hits
}
