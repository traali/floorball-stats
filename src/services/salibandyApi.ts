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

const API_BASE = 'https://salibandy-api.torneopal.net/taso/rest'
const TASO_PROXY = 'https://taso-proxy.sakkoja.workers.dev/ssbl'
const SALIBANDY_KEY = 'zsn3anknxzcfzc23k53jqdcd4pymutsf'

const reqHeaders = {
  Accept: `json/${SALIBANDY_KEY}`,
  Referer: 'https://tulospalvelu.salibandy.fi/',
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

async function tasoGet<T>(path: string, cacheKey?: string, ttl?: number): Promise<T | null> {
  const key = cacheKey || path
  const cached = cacheGet<T>(key)
  if (cached) return cached

  const sep = path.includes('?') ? '&' : '?'
  const urls = [
    `${TASO_PROXY}/${path}`,
    `${API_BASE}/${path}`,
    `${API_BASE}/${path}${sep}_cb=${Date.now()}`,
  ]

  for (const url of urls) {
    try {
      const viaProxy = url.includes('taso-proxy')
      const res = await fetch(url, {
        headers: viaProxy ? { Accept: 'application/json' } : reqHeaders,
      })
      if (!res.ok) continue
      const text = await res.text()
      const start = text.indexOf('{')
      if (start < 0) continue
      const data = JSON.parse(text.slice(start)) as T & { call?: { status?: string } }
      const status = String(data?.call?.status || '').toLowerCase()
      if (status && status !== 'ok') continue
      cacheSet(key, data, ttlForPayload(path, data, ttl ?? CACHE_TTL_MS))
      return data
    } catch (err) {
      console.warn('[SALIBANDY_API]', url, err)
    }
  }
  return null
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

  if (/^\d{4,8}$/.test(val)) return { kind: 'match', id: val }

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

    for (const ev of rawEvents) {
      if (ev.code === 'maali') {
        const key = `${ev.time}_${ev.team}`
        const fiText = String(ev.code_fi || '').toLowerCase()
        goals.push({
          eventId: String(ev.event_id || Math.random()),
          code: 'maali',
          time: String(ev.time || '00:00'),
          period: String(ev.period || '1'),
          scorerName: String(ev.player_name || 'Tuntematon'),
          scorerShirtNumber: String(ev.shirt_number || ''),
          scorerPlayerId: ev.player_id ? String(ev.player_id) : undefined,
          assistName: assistsMap.get(key) || undefined,
          assistPlayerId: undefined,
          team: ev.team === 'A' ? 'home' : 'away',
          scoreHome: Number(ev.s_A || 0),
          scoreAway: Number(ev.s_B || 0),
          description: ev.description_text || ev.code_fi,
          isPowerplayGoal: fiText.includes('yv') || fiText.includes('ylivoima'),
          isShorthandedGoal: fiText.includes('av') || fiText.includes('alivoima'),
          isEmptyNetGoal: fiText.includes('tm') || fiText.includes('tyhjä'),
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

    const homeConceded = goals.filter(g => g.team === 'away').length
    const awayConceded = goals.filter(g => g.team === 'home').length

    const homeSavePct = homeSaves + homeConceded > 0
      ? `${((homeSaves / (homeSaves + homeConceded)) * 100).toFixed(1)}%`
      : '100%'

    const awaySavePct = awaySaves + awayConceded > 0
      ? `${((awaySaves / (awaySaves + awayConceded)) * 100).toFixed(1)}%`
      : '100%'

    const periods: SalibandyPeriodScore[] = []
    const p1Home = Number(m.p1s_A || (goals.filter(g => g.period === '1' && g.team === 'home').length))
    const p1Away = Number(m.p1s_B || (goals.filter(g => g.period === '1' && g.team === 'away').length))
    periods.push({ period: 1, scoreHome: p1Home, scoreAway: p1Away })

    const p2Home = Number(m.p2s_A || (goals.filter(g => g.period === '2' && g.team === 'home').length))
    const p2Away = Number(m.p2s_B || (goals.filter(g => g.period === '2' && g.team === 'away').length))
    periods.push({ period: 2, scoreHome: p2Home, scoreAway: p2Away })

    const p3Home = Number(m.p3s_A || (goals.filter(g => g.period === '3' && g.team === 'home').length))
    const p3Away = Number(m.p3s_B || (goals.filter(g => g.period === '3' && g.team === 'away').length))
    periods.push({ period: 3, scoreHome: p3Home, scoreAway: p3Away })

    const spectatorEvent = rawEvents.find(e => e.code === 'katsojia')
    const spectators = spectatorEvent ? Number(spectatorEvent.description || 0) : Number(m.attendance || 0)

    return {
      matchId: String(m.match_id || matchId),
      matchNumber: m.match_number,
      competitionName: String(m.competition_name || 'Salibandyliiga / Sarja'),
      categoryName: String(m.category_name || ''),
      competitionId: m.competition_id ? String(m.competition_id) : undefined,
      categoryId: m.category_id ? String(m.category_id) : undefined,
      groupId: m.group_id ? String(m.group_id) : undefined,
      date: String(m.date || ''),
      time: String(m.time || ''),
      venueName: String(m.venue_name || 'Peliareena'),
      venueLat: m.venue_lat ? Number(m.venue_lat) : undefined,
      venueLon: m.venue_lon ? Number(m.venue_lon) : undefined,
      homeTeamName: String(m.team_A_name || 'Koti'),
      awayTeamName: String(m.team_B_name || 'Vieras'),
      homeTeamId: m.team_A_id ? String(m.team_A_id) : undefined,
      awayTeamId: m.team_B_id ? String(m.team_B_id) : undefined,
      scoreHome: Number(m.fs_A || goals[goals.length - 1]?.scoreHome || 0),
      scoreAway: Number(m.fs_B || goals[goals.length - 1]?.scoreAway || 0),
      isLive: m.status === 'Live',
      referee1: m.referee_1_name ? String(m.referee_1_name) : undefined,
      referee2: m.referee_2_name ? String(m.referee_2_name) : undefined,
      spectators: spectators || undefined,
      playingTimeMin: m.playing_time_min ? Number(m.playing_time_min) : 45,
      periods,
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
    }
  } catch (err) {
    console.error('[SALIBANDY_API]', err)
    return null
  }
}

export async function fetchSalibandyTeamRoster(teamId: string): Promise<SalibandyRosterPlayer[]> {
  try {
    const url = `${API_BASE}/getTeam?team_id=${encodeURIComponent(teamId)}`
    const res = await fetch(url, { headers: reqHeaders })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.team?.players) return []

    return data.team.players.map((p: any) => mapRosterPlayer(p))
  } catch (err) {
    console.error('[SALIBANDY_ROSTER_API]', err)
    return []
  }
}

function mapRosterPlayer(p: any): SalibandyRosterPlayer {
  return {
    playerId: String(p.player_id),
    firstName: String(p.first_name || ''),
    lastName: String(p.last_name || ''),
    fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    shirtNumber: String(p.shirt_number || ''),
    birthYear: String(p.birthyear || ''),
    isCaptain: p.captain === '1' || p.captain === 'yes',
    imageUrl: p.img_url || undefined,
    goals: Number(p.goals || 0),
    assists: Number(p.assists || 0),
    points: Number(p.goals || 0) + Number(p.assists || 0),
    penaltiesMin: Number(p.suspensions || p.warnings || 0) * 2,
  }
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
  try {
    const url = `${API_BASE}/getMatches?team_id=${encodeURIComponent(teamId)}`
    const res = await fetch(url, { headers: reqHeaders })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.matches)) return []

    return data.matches.map((m: any) => {
      const isHome = String(m.team_A_id) === teamId
      const scoreHome = m.fs_A != null && m.fs_A !== '' ? Number(m.fs_A) : undefined
      const scoreAway = m.fs_B != null && m.fs_B !== '' ? Number(m.fs_B) : undefined
      const hasScore = scoreHome !== undefined && scoreAway !== undefined

      let isWin = false
      let isDraw = false
      let isLoss = false

      if (hasScore) {
        if (isHome) {
          isWin = scoreHome > scoreAway
          isDraw = scoreHome === scoreAway
          isLoss = scoreHome < scoreAway
        } else {
          isWin = scoreAway > scoreHome
          isDraw = scoreHome === scoreAway
          isLoss = scoreAway < scoreHome
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
        score: hasScore ? `${scoreHome}–${scoreAway}` : undefined,
        scoreHome,
        scoreAway,
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
  } catch (err) {
    console.error('[SALIBANDY_FIXTURES_API]', err)
    return []
  }
}

export async function fetchSalibandyTeamProfile(teamId: string): Promise<SalibandyTeamProfile | null> {
  try {
    const url = `${API_BASE}/getTeam?team_id=${encodeURIComponent(teamId)}`
    const res = await fetch(url, { headers: reqHeaders })
    if (!res.ok) return null
    const data = await res.json()
    if (data.call?.status !== 'ok' || !data.team) return null

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

function mapGroupTeam(t: any): SalibandyGroupTeam {
  return {
    teamId: str(t.team_id),
    teamName: str(t.team_name),
    clubId: t.club_id ? str(t.club_id) : undefined,
    crest: t.crest || undefined,
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

function mapGroupMatch(m: any): SalibandyGroupMatch {
  const scoreHome = m.fs_A != null && m.fs_A !== '' ? num(m.fs_A) : undefined
  const scoreAway = m.fs_B != null && m.fs_B !== '' ? num(m.fs_B) : undefined
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    scoreHome,
    scoreAway,
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
    `getGroup?competition_id=${encodeURIComponent(competitionId)}&category_id=${encodeURIComponent(categoryId)}&group_id=${encodeURIComponent(groupId)}&matches=1`,
    `getGroup:${competitionId}:${categoryId}:${groupId}`,
    3 * 60 * 1000,
  )
  const g = data?.group
  if (!g) return null
  const teams = Array.isArray(g.teams) ? g.teams.map(mapGroupTeam) : []
  const matches = Array.isArray(g.matches) ? g.matches.map(mapGroupMatch) : []
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

function mapPlayerMatch(m: any): SalibandyPlayerMatch {
  const scoreHome = m.fs_A != null && m.fs_A !== '' ? num(m.fs_A) : undefined
  const scoreAway = m.fs_B != null && m.fs_B !== '' ? num(m.fs_B) : undefined
  return {
    matchId: str(m.match_id),
    date: str(m.date),
    time: str(m.time),
    status: str(m.status),
    homeTeam: str(m.team_A_name, 'Koti'),
    awayTeam: str(m.team_B_name, 'Vieras'),
    homeTeamId: numericId(m.team_A_id),
    awayTeamId: numericId(m.team_B_id),
    scoreHome,
    scoreAway,
    categoryName: str(m.category_name),
    competitionName: str(m.competition_name),
    seasonId: m.season_id ? str(m.season_id) : undefined,
    goals: num(m.player_goals),
    assists: num(m.player_assists),
    points: num(m.player_points, num(m.player_goals) + num(m.player_assists)),
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

export async function searchDiscovery(query: string): Promise<DiscoveryHit[]> {
  const parsed = parseSalibandyQuery(query)
  const hits: DiscoveryHit[] = []

  if (parsed.kind === 'match') {
    hits.push({ kind: 'match', id: parsed.id, title: `Ottelu #${parsed.id}`, subtitle: 'Avaa ottelu' })
    hits.push({ kind: 'team', id: parsed.id, title: `Joukkue #${parsed.id}`, subtitle: 'Kokeile joukkueena' })
    hits.push({ kind: 'player', id: parsed.id, title: `Pelaaja #${parsed.id}`, subtitle: 'Kokeile pelaajana' })
    return hits
  }
  if (parsed.kind === 'team') {
    hits.push({ kind: 'team', id: parsed.id, title: `Joukkue #${parsed.id}`, subtitle: 'Avaa joukkue' })
    return hits
  }
  if (parsed.kind === 'player') {
    hits.push({ kind: 'player', id: parsed.id, title: `Pelaaja #${parsed.id}`, subtitle: 'Avaa pelaaja' })
    return hits
  }
  if (parsed.kind === 'club') {
    hits.push({ kind: 'club', id: parsed.id, title: `Seura #${parsed.id}`, subtitle: 'Avaa seura' })
    return hits
  }

  const q = normalizeSearch(parsed.q)
  if (q.length < 2) return []

  const clubs = await fetchSalibandyClubs()
  const tokens = q.split(' ').filter(Boolean)
  const clubHits = clubs.filter((c) => {
    const hay = normalizeSearch(`${c.name} ${c.abbreviation} ${c.cityName}`)
    return tokens.every((t) => hay.includes(t)) || hay.includes(q)
  })

  const topClubs = clubHits.slice(0, 8)
  for (const c of topClubs) {
    hits.push({
      kind: 'club',
      id: c.clubId,
      title: c.abbreviation || c.name,
      subtitle: [c.cityName, 'Seura'].filter(Boolean).join(' · '),
      crest: c.crest,
    })
  }

  const clubsToExpand = (topClubs.length > 0 ? topClubs : clubs.filter((c) => {
    const hay = normalizeSearch(`${c.name} ${c.abbreviation}`)
    return tokens.some((t) => t.length >= 3 && hay.includes(t))
  })).slice(0, 5)

  const clubDetails = await Promise.all(clubsToExpand.map((c) => fetchSalibandyClub(c.clubId)))
  const seenTeams = new Set<string>()
  for (const detail of clubDetails) {
    if (!detail) continue
    const active = detail.teams.filter((t) => t.status === 'active')
    const pool = active.length ? active : detail.teams
    for (const t of pool) {
      const hay = normalizeSearch(`${t.teamName} ${t.categoryName} ${detail.name}`)
      const matchesAll = tokens.every((tok) => hay.includes(tok))
      if (!matchesAll && topClubs.length === 0) continue
      if (!matchesAll && tokens.length > 1) {
        const last = tokens[tokens.length - 1]
        if (!normalizeSearch(t.teamName).includes(last) && !hay.includes(last)) continue
      }
      if (seenTeams.has(t.teamId)) continue
      seenTeams.add(t.teamId)
      hits.push({
        kind: 'team',
        id: t.teamId,
        title: t.teamName,
        subtitle: [t.categoryName, t.season || detail.name].filter(Boolean).join(' · '),
      })
      if (hits.filter((h) => h.kind === 'team').length >= 12) break
    }
    if (hits.filter((h) => h.kind === 'team').length >= 12) break
  }

  const comps = await fetchSalibandyCompetitions().catch(() => [])
  for (const c of comps) {
    const hay = normalizeSearch(`${c.competitionName} ${c.organiser || ''} ${c.locationName || ''}`)
    if (tokens.every((t) => hay.includes(t)) || hay.includes(q)) {
      hits.push({
        kind: 'competition',
        id: c.competitionId,
        title: c.competitionName,
        subtitle: c.seasonId,
      })
    }
  }

  const catSources = comps
    .filter((c) => c.competitionId.startsWith('sb2026') || (c.seasonId || '').includes('2026'))
    .slice(0, 8)
  const catLists = await Promise.all(
    catSources.map((c) => fetchSalibandyCategories(c.competitionId).catch(() => [])),
  )
  for (const list of catLists) {
    for (const cat of list) {
      if (!normalizeSearch(cat.categoryName).includes(q) && !tokens.some((t) => normalizeSearch(cat.categoryName).includes(t))) continue
      hits.push({
        kind: 'category',
        id: `${cat.competitionId}::${cat.categoryId}`,
        title: cat.categoryName,
        subtitle: cat.competitionName,
      })
    }
  }

  const playerTeamIds = ['25301', '25748', '6546', '45210', ...[...seenTeams].slice(0, 4)]
  const profiles = await Promise.all(
    [...new Set(playerTeamIds)].slice(0, 8).map((id) => fetchSalibandyTeamProfile(id).catch(() => null)),
  )
  const seenPlayers = new Set<string>()
  for (const team of profiles) {
    if (!team) continue
    for (const p of team.players) {
      const hay = normalizeSearch(`${p.fullName} ${p.lastName} ${p.firstName}`)
      if (!hay.includes(q) && !tokens.some((t) => hay.includes(t))) continue
      if (seenPlayers.has(p.playerId)) continue
      seenPlayers.add(p.playerId)
      hits.push({
        kind: 'player',
        id: p.playerId,
        title: p.fullName,
        subtitle: team.teamName,
      })
    }
  }

  return hits.slice(0, 30)
}
