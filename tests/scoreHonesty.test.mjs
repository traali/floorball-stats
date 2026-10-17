// Scores, walkovers, tournament groups and player stats — real TASO payloads
// fetched 17.10.2026 (tests/fixtures/oct17, trimmed).
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { matchState, tasoScore, isWalkover, forfeitedBy } from '../src/utils/matchStatus.ts'
import { defaultGroupDay, groupDays, groupMatchScoreText } from '../src/utils/groupDays.ts'
import {
  fetchSalibandyMatch,
  fetchSalibandyGroup,
  fetchSalibandyTeamFixtures,
  groupStandingsSent,
  mapGroupTeamsToStandings,
  mapGroupMatch,
  mapRosterPlayer,
  mapPlayerMatch,
  resetSalibandyCaches,
} from '../src/services/salibandyApi.ts'

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/oct17/${name}.json`, import.meta.url), 'utf8'))
const rows = Object.fromEntries(fx('getMatches-rows').matches.map((m) => [m.match_id, m]))

function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), clear: () => map.clear() }
}

let routes = {}
beforeEach(() => {
  resetSalibandyCaches()
  globalThis.localStorage = memoryStorage()
  routes = {}
  globalThis.fetch = async (url) => {
    const u = new URL(String(url))
    const key = u.pathname.split('/').pop() + '?' + [...u.searchParams].filter(([k]) => k !== '_cb').map(([k, v]) => `${k}=${v}`).join('&')
    const body = routes[key]
    if (!body) return new Response(JSON.stringify({ call: { status: 'error', error: 'not mocked ' + key } }), { status: 200 })
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
})

describe('score only when TASO says the game happened', () => {
  it('Fixture with getMatch fs "0" → no score (954281)', () => {
    assert.equal(rows['954281'].status, 'Fixture')
    assert.equal(matchState(rows['954281']), 'upcoming')
    assert.equal(tasoScore(rows['954281']), undefined)
  })
  it('2022 game still Fixture 0–0 → no score, not a draw (444223)', () => {
    assert.equal(rows['444223'].date, '2022-10-15')
    assert.equal(tasoScore(rows['444223']), undefined)
  })
  it('Played → final score (954276 SB-Pro Musta 11–4 Oilers)', () => {
    assert.deepEqual(tasoScore(rows['954276']), { home: 11, away: 4 })
  })
  it('Live → running score, Break → running score with break state', () => {
    assert.equal(matchState(rows['954282']), 'live')
    assert.deepEqual(tasoScore(rows['954282']), { home: 1, away: 0 })
    assert.equal(matchState(rows['944994']), 'break')
    assert.deepEqual(tasoScore(rows['944994']), { home: 3, away: 3 })
  })
  it('Forfeited rows are walkovers; "-2" is a sentinel, never a score', () => {
    assert.equal(matchState(rows['951963']), 'walkover')
    assert.deepEqual(tasoScore(rows['951963']), { home: 0, away: 10 })
    assert.equal(forfeitedBy(rows['951963']), 'home')
    const m954 = fx('getMatch-951954').match
    assert.equal(m954.status, 'Played', 'getMatch says Played…')
    assert.ok(isWalkover(m954), '…but walkover 1 / forfeit_B "match"')
    assert.equal(tasoScore(m954), undefined)
  })
})

describe('match page walkovers (getMatch)', () => {
  it('951963: «Luovutus: Ilves Green luovutti», 0–10 kept', async () => {
    routes['getMatch?match_id=951963'] = fx('getMatch-951963')
    const d = await fetchSalibandyMatch('951963')
    assert.equal(d.walkover, 'Luovutus: Ilves Green luovutti')
    assert.equal(d.phase, 'played')
    assert.deepEqual([d.scoreHome, d.scoreAway], [0, 10])
    assert.equal(d.noScore, undefined)
  })
  it('951954: no numbers at all (fs "-2"), forfeit by the away side', async () => {
    routes['getMatch?match_id=951954'] = fx('getMatch-951954')
    const d = await fetchSalibandyMatch('951954')
    assert.equal(d.walkover, 'Luovutus: Ilves Green luovutti')
    assert.equal(d.noScore, true)
    assert.ok(!d.periods.length)
  })
})

describe('team fixtures', () => {
  it('a live score is not a win yet; walkovers are tagged', async () => {
    routes['getMatches?team_id=29904'] = { call: { status: 'ok' }, matches: [rows['954282']] }
    const [live] = await fetchSalibandyTeamFixtures('29904')
    assert.equal(live.state, 'live')
    assert.equal(live.score, '1–0')
    assert.equal(live.isWin, false)
    routes['getMatches?team_id=30283'] = { call: { status: 'ok' }, matches: [rows['951963'], rows['951954']] }
    const ff = await fetchSalibandyTeamFixtures('30283')
    assert.deepEqual(ff.map((f) => f.score), ['0–10 luov.', 'Luovutus'])
    assert.equal(ff[0].isLoss, true)
  })
})

describe('tournament groups', () => {
  it('standings only where TASO sends them', () => {
    assert.equal(groupStandingsSent(fx('getGroup-sb2026es-627-1').group), false, 'U12T: calculate_points 0, all null')
    assert.equal(groupStandingsSent(fx('getGroup-sb2025es-2195-5').group), false, 'Jatkopelit knockout: all null')
    assert.equal(groupStandingsSent(fx('getGroup-sb2025es-2195-1').group), true, 'B-A lohko: 1. Hawks 3 p')
    assert.deepEqual(mapGroupTeamsToStandings([{ teamId: '1', teamName: 'x', rank: 0, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, diff: 0 }], [], false), [])
  })

  it('getGroup has no games; they come from getMatches by group, on two courts (lopputurnaus 25.4.2026)', async () => {
    assert.equal(fx('getGroup-sb2025es-2195-5').group.matches, undefined)
    routes['getGroup?competition_id=sb2025es&category_id=2195&group_id=5'] = fx('getGroup-sb2025es-2195-5')
    routes['getMatches?competition_id=sb2025es&category_id=2195&group_id=5'] = fx('getMatches-group-sb2025es-2195-5')
    const g = await fetchSalibandyGroup('sb2025es', '2195', '5')
    assert.equal(g.standingsSent, false)
    assert.equal(g.matches.length, 12)
    assert.deepEqual([...new Set(g.matches.map((m) => m.venueName))].sort(), ['AC Ruskeasuo kenttä 1', 'AC Ruskeasuo kenttä 2'])
    assert.ok(g.matches.every((m) => m.state === 'played' && m.scoreHome != null))
    assert.equal(defaultGroupDay(g.matches, '2026-10-17'), '2026-04-25')
  })

  it("today's round day (U12T ES 627/1, 17.10.): live game marked, unplayed games show no score", async () => {
    routes['getGroup?competition_id=sb2026es&category_id=627&group_id=1'] = fx('getGroup-sb2026es-627-1')
    routes['getMatches?competition_id=sb2026es&category_id=627&group_id=1'] = fx('getMatches-group-sb2026es-627-1')
    const g = await fetchSalibandyGroup('sb2026es', '627', '1')
    assert.deepEqual(groupDays(g.matches), ['2026-10-17'])
    const live = g.matches.find((m) => m.matchId === '954282')
    assert.equal(live.state, 'live')
    const unplayed = g.matches.filter((m) => m.state === 'upcoming')
    assert.ok(unplayed.length >= 5)
    assert.ok(unplayed.every((m) => m.scoreHome == null && groupMatchScoreText(m, () => 'X') === 'vs'))
    assert.equal(mapGroupTeamsToStandings(g.teams, g.matches, g.standingsSent).length, 0)
  })

  it('walkover row text', () => {
    assert.equal(groupMatchScoreText(mapGroupMatch(rows['951963']), (h, a) => `${h}–${a}`), '0–10 luov.')
    assert.equal(groupMatchScoreText(mapGroupMatch(rows['951954']), (h, a) => `${h}–${a}`), 'Luovutus')
  })
})

describe('player stats only when TASO sent them', () => {
  it('getTeam roster has no goals/assists/points fields → statsSent false', () => {
    const p = mapRosterPlayer(fx('getTeam-30070').team.players[0])
    assert.equal(p.statsSent, false)
  })
  it('match lineups with numbers → statsSent true', () => {
    assert.equal(mapRosterPlayer({ player_id: '1', first_name: 'A', last_name: 'B', goals: 0, assists: 1 }).statsSent, true)
  })
  it('getPlayer game log with player_goals "" → statsSent false, score still from Played', () => {
    const [m] = fx('getPlayer-120359').player.matches.map(mapPlayerMatch)
    assert.equal(fx('getPlayer-120359').player.matches[0].player_goals, '')
    assert.equal(m.statsSent, false)
    assert.deepEqual([m.scoreHome, m.scoreAway], [3, 14])
  })
})

describe('preview markdown', async () => {
  const { buildFloorballPreviewMd } = await import('../src/utils/buildFloorballPreviewMd.ts')
  it('walkover 951954 prints Luovutus, never -2 or 0–0', async () => {
    routes['getMatch?match_id=951954'] = fx('getMatch-951954')
    const match = await fetchSalibandyMatch('951954')
    const md = buildFloorballPreviewMd({ match, leaders: [] })
    assert.match(md, /Luovutus: Ilves Green luovutti/)
    assert.doesNotMatch(md, /(^|[\s–])-2\b|\b0–0\b/m)
  })
})
