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
} from '../types/salibandy'

const API_BASE = 'https://salibandy-api.torneopal.net/taso/rest'
const SALIBANDY_KEY = 'zsn3anknxzcfzc23k53jqdcd4pymutsf'

const reqHeaders = {
  Accept: `json/${SALIBANDY_KEY}`,
  Referer: 'https://tulospalvelu.salibandy.fi/',
}

export async function fetchSalibandyMatch(matchId: string): Promise<SalibandyMatchDetail | null> {
  try {
    const url = `${API_BASE}/getMatch?match_id=${encodeURIComponent(matchId)}`
    const res = await fetch(url, { headers: reqHeaders })

    if (!res.ok) return null
    const data = await res.json()
    if (data.call?.status !== 'ok' || !data.match) return null

    const m = data.match
    const rawEvents: any[] = Array.isArray(m.events) ? m.events : []

    // 1. Parse Goals & Assists
    const goals: SalibandyGoalEvent[] = []
    const assistsMap = new Map<string, string>() // time+team -> assistPlayer

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
          assistName: assistsMap.get(key) || undefined,
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

    // 2. Parse Penalties
    const penalties: SalibandyPenaltyEvent[] = []
    for (const ev of rawEvents) {
      if (ev.code === '2min' || ev.code === '5min' || ev.code === '2+2min' || ev.code?.includes('rangaistus')) {
        penalties.push({
          eventId: String(ev.event_id || Math.random()),
          code: (ev.code as any) || '2min',
          time: String(ev.time || '00:00'),
          period: String(ev.period || '1'),
          playerName: String(ev.player_name || 'Pelaaja'),
          shirtNumber: String(ev.shirt_number || ''),
          team: ev.team === 'A' ? 'home' : 'away',
          reasonCode: String(ev.description || '2min'),
          reasonText: String(ev.description_text || 'Rangaistus'),
        })
      }
    }

    // 3. Parse Goalkeeper Saves
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

    // 4. Compute Period Scores
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

/**
 * Fetches Team Roster and Players
 */
export async function fetchSalibandyTeamRoster(teamId: string): Promise<SalibandyRosterPlayer[]> {
  try {
    const url = `${API_BASE}/getTeam?team_id=${encodeURIComponent(teamId)}`
    const res = await fetch(url, { headers: reqHeaders })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.team?.players) return []

    return data.team.players.map((p: any) => ({
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
    }))
  } catch (err) {
    console.error('[SALIBANDY_ROSTER_API]', err)
    return []
  }
}

/**
 * Fetches Team Fixtures and Match History
 */
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

      return {
        matchId: String(m.match_id),
        date: String(m.date || ''),
        time: String(m.time || ''),
        homeTeam: String(m.team_A_name || 'Koti'),
        awayTeam: String(m.team_B_name || 'Vieras'),
        score: hasScore ? `${scoreHome}–${scoreAway}` : undefined,
        isHome,
        isWin,
        isDraw,
        isLoss,
        venueName: String(m.venue_name || 'Kenttä'),
        categoryName: String(m.category_name || ''),
      }
    })
  } catch (err) {
    console.error('[SALIBANDY_FIXTURES_API]', err)
    return []
  }
}

/**
 * Computes Player Points Leaders (Goals + Assists = G+A)
 */
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

export function fetchSalibandyStandings(): SalibandyStandingRow[] {
  const rawRows = [
    { rank: 1, teamId: '25301', teamName: 'Westend Indians', matchesPlayed: 8, wins: 7, draws: 0, losses: 1, goalsFor: 64, goalsAgainst: 28, form: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'D' | 'L')[] },
    { rank: 2, teamId: 'oilers-ed', teamName: 'Esport Oilers', matchesPlayed: 8, wins: 6, draws: 1, losses: 1, goalsFor: 58, goalsAgainst: 32, form: ['W', 'W', 'D', 'W', 'W'] as ('W' | 'D' | 'L')[] },
    { rank: 3, teamId: 'eraviikingit-p', teamName: 'EräViikingit', matchesPlayed: 8, wins: 4, draws: 1, losses: 3, goalsFor: 46, goalsAgainst: 41, form: ['L', 'W', 'W', 'D', 'L'] as ('W' | 'D' | 'L')[] },
    { rank: 4, teamId: 'classic-p', teamName: 'Classic Juniorit', matchesPlayed: 8, wins: 3, draws: 0, losses: 5, goalsFor: 38, goalsAgainst: 52, form: ['L', 'L', 'W', 'L', 'W'] as ('W' | 'D' | 'L')[] },
    { rank: 5, teamId: 'tps-p', teamName: 'TPS Salibandy', matchesPlayed: 8, wins: 2, draws: 1, losses: 5, goalsFor: 34, goalsAgainst: 56, form: ['W', 'L', 'L', 'L', 'D'] as ('W' | 'D' | 'L')[] },
    { rank: 6, teamId: 'happee-p', teamName: 'Happee Juniorit', matchesPlayed: 8, wins: 0, draws: 1, losses: 7, goalsFor: 22, goalsAgainst: 53, form: ['L', 'L', 'L', 'D', 'L'] as ('W' | 'D' | 'L')[] },
  ]

  return rawRows.map(row => ({
    ...row,
    diff: row.goalsFor - row.goalsAgainst,
    // SSBL: 2 points for win, 1 point for draw, 0 for loss
    totalPoints: (row.wins * 2) + (row.draws * 1),
  }))
}
