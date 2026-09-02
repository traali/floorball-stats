/**
 * SSBL Salibandy / Torneopal REST API Client
 * Base: https://salibandy-api.torneopal.net/taso/rest
 */

import type { SalibandyMatchDetail, SalibandyGoalEvent, SalibandyPenaltyEvent, SalibandyPeriodScore, SalibandyPlayerLeader } from '../types/salibandy'

const API_BASE = 'https://salibandy-api.torneopal.net/taso/rest'
const SALIBANDY_KEY = 'zsn3anknxzcfzc23k53jqdcd4pymutsf'

export async function fetchSalibandyMatch(matchId: string): Promise<SalibandyMatchDetail | null> {
  try {
    const url = `${API_BASE}/getMatch?match_id=${encodeURIComponent(matchId)}`
    const res = await fetch(url, {
      headers: {
        'Accept': `json/${SALIBANDY_KEY}`,
        'Referer': 'https://tulospalvelu.salibandy.fi/',
      },
    })

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
        })
      }
    }

    // 2. Parse Penalties
    const penalties: SalibandyPenaltyEvent[] = []
    for (const ev of rawEvents) {
      if (ev.code === '2min' || ev.code === '5min' || ev.code?.includes('rangaistus')) {
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

    // 3. Compute Period Scores
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
      scoreHome: Number(m.fs_A || goals[goals.length - 1]?.scoreHome || 0),
      scoreAway: Number(m.fs_B || goals[goals.length - 1]?.scoreAway || 0),
      isLive: m.status === 'Live',
      periods,
      goals,
      penalties,
      totalEvents: rawEvents.length,
    }
  } catch (err) {
    console.error('[SALIBANDY_API]', err)
    return null
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
