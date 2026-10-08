// Own goals and placeholder ids, using real TASO getMatch payloads
// (trimmed copies in tests/fixtures; fetched 2026-10-08).
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { goalRowsById, resolveScorer, realPlayerId, isOwnGoalRow, OWN_GOAL_LABEL } from '../src/utils/goalScorer.ts'
import { fetchSalibandyMatch, computePlayerLeaders, resetSalibandyCaches } from '../src/services/salibandyApi.ts'
import { buildFloorballPreviewMd } from '../src/utils/buildFloorballPreviewMd.ts'

const fixture = (id) => JSON.parse(readFileSync(new URL(`./fixtures/taso-getMatch-${id}.json`, import.meta.url), 'utf8'))

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  }
}

beforeEach(() => {
  resetSalibandyCaches()
  globalThis.localStorage = memoryStorage()
  globalThis.fetch = async (url) => {
    const id = new URL(String(url)).searchParams.get('match_id')
    return new Response(JSON.stringify(fixture(id)), { status: 200, headers: { 'content-type': 'application/json' } })
  }
})

describe('the real 929721 19:33 goal', () => {
  const m = fixture('929721').match
  const ev = m.events.find((e) => e.code === 'maali' && e.time === '19:33')
  const row = goalRowsById(m.goals).get(ev.event_id)

  it('the event itself is blank (placeholder player_id 1)', () => {
    assert.equal(ev.player_name, '')
    assert.equal(ev.shirt_number, '')
    assert.equal(ev.lineup_id, '')
    assert.equal(ev.player_id, 1)
  })

  it('the goals[] row with the same event_id says own goal', () => {
    assert.equal(row.player_shirt_number, 'OM')
    assert.equal(row.player_name, 'maali Oma')
    assert.equal(row.player_id, '')
    assert.ok(isOwnGoalRow(row))
    assert.deepEqual(resolveScorer(ev, row), { kind: 'own', name: OWN_GOAL_LABEL })
  })

  it('no Indians player is credited in the lineup stats either (3 named goals + 1 own = 4 in play)', () => {
    const indians = m.lineups.filter((l) => l.team_id === m.team_A_id)
    assert.equal(indians.reduce((s, l) => s + Number(l.goals || 0), 0), 3)
  })
})

describe('resolveScorer', () => {
  it('uses the event player when present', () => {
    const m = fixture('929721').match
    const ev = m.events.find((e) => e.code === 'maali' && e.time === '5:48')
    assert.deepEqual(resolveScorer(ev, goalRowsById(m.goals).get(ev.event_id)), {
      kind: 'player',
      name: 'Repo Juho',
      playerId: '50091',
      shirt: '12',
    })
  })

  it('falls back to a named goals[] row when the event is blank', () => {
    const ev = { player_id: 1, player_name: '', lineup_id: '', shirt_number: '' }
    const row = { event_id: '9', player_id: '123', lineup_id: '77', player_shirt_number: '8', player_name: 'Pelaaja Oikea' }
    assert.deepEqual(resolveScorer(ev, row), { kind: 'player', name: 'Pelaaja Oikea', playerId: '123', shirt: '8' })
  })

  it('stays unknown when no source names anyone (never invents)', () => {
    const ev = { player_id: 1, player_name: '', lineup_id: '', shirt_number: '' }
    assert.deepEqual(resolveScorer(ev, undefined), { kind: 'unknown' })
    assert.deepEqual(resolveScorer(ev, { event_id: '1', player_id: '', player_name: '', player_shirt_number: '' }), { kind: 'unknown' })
  })

  it('placeholder ids are not linkable players', () => {
    assert.equal(realPlayerId(1, '', ''), undefined)
    assert.equal(realPlayerId('4', 'x', ''), undefined)
    assert.equal(realPlayerId('50091', 'Repo Juho', '9835923'), '50091')
  })
})

describe('fetchSalibandyMatch with own goals', () => {
  for (const [id, time, team] of [['929721', '19:33', 'home'], ['929741', '46:52', 'home']]) {
    it(`${id} ${time}: «Oma maali», no link, no assist, no player goal`, async () => {
      const d = await fetchSalibandyMatch(id)
      const g = d.goals.find((x) => x.time === time)
      assert.equal(g.scorerName, 'Oma maali')
      assert.equal(g.isOwnGoal, true)
      assert.equal(g.team, team)
      assert.equal(g.scorerPlayerId, undefined)
      assert.equal(g.scorerShirtNumber, '')
      assert.equal(g.assistName, undefined)
      assert.ok(!d.goals.some((x) => x.scorerName === 'Tuntematon'))
      assert.ok(!d.goals.some((x) => x.scorerPlayerId && /^\d$/.test(x.scorerPlayerId)), 'no placeholder links')
      const leaders = computePlayerLeaders(d)
      assert.ok(!leaders.some((l) => l.playerName === 'Oma maali' || l.playerName === 'Tuntematon'))
    })
  }

  it('own goals still count against the goalie, as TASO lineup «conceded» does', async () => {
    const d = await fetchSalibandyMatch('929741')
    const raw = fixture('929741').match
    const conceded = (teamId) => raw.lineups.filter((l) => l.team_id === teamId).reduce((s, l) => s + Number(l.conceded || 0), 0)
    assert.equal(d.goalkeepers.away.goalsConceded, conceded(raw.team_B_id))
    assert.equal(d.goalkeepers.home.goalsConceded, conceded(raw.team_A_id))
  })

  it('AI briefing writes the own goal', async () => {
    const d = await fetchSalibandyMatch('929721')
    const md = buildFloorballPreviewMd({ match: d, standings: [], leaders: [] })
    assert.match(md, /19:33 e1 Indians: Oma maali 2–1/)
  })
})
