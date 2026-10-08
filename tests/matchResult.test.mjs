// Regulation, overtime and shootout, using real TASO getMatch payloads
// (trimmed copies in tests/fixtures; fetched 2026-10-08 from salibandy-api.torneopal.net).
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  resultBreakdown,
  scoreWithSuffix,
  finalScoreLabel,
  extraPeriodsText,
  periodLabel,
} from '../src/utils/matchResult.ts'
import { fetchSalibandyMatch, computePlayerLeaders, resetSalibandyCaches } from '../src/services/salibandyApi.ts'
import { buildFloorballPreviewMd } from '../src/utils/buildFloorballPreviewMd.ts'

const fixture = (id) => JSON.parse(readFileSync(new URL(`./fixtures/taso-getMatch-${id}.json`, import.meta.url), 'utf8'))
const REGULATION = '929695' // Indians 6–5 O2-Jyväskylä
const OVERTIME = '929774' // OLS 3–4 O2-Jyväskylä
const SHOOTOUT = '929721' // Indians 4–5 SPV
const SHOOTOUT_OLD = '518748' // Indians 5–4 TPS, 2017-18 shape (p4s holds the +1)

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

const sum = (periods, side) => periods.reduce((s, p) => s + p[side], 0)

describe('resultBreakdown on real TASO fields', () => {
  it('regulation: es/ps blank, p4s 0–0 is ignored', () => {
    const m = fixture(REGULATION).match
    assert.equal(m.es_A, '')
    assert.equal(m.p4s_A, '0')
    assert.deepEqual(resultBreakdown(m), { decidedBy: 'regulation' })
  })

  it('overtime: es 3–3, p4s 0–1, no shootout', () => {
    assert.deepEqual(resultBreakdown(fixture(OVERTIME).match), {
      decidedBy: 'overtime',
      regulation: { home: 3, away: 3 },
      overtime: { home: 0, away: 1 },
    })
  })

  it('shootout: es 4–4, p4s 0–0, ps 0–1', () => {
    assert.deepEqual(resultBreakdown(fixture(SHOOTOUT).match), {
      decidedBy: 'shootout',
      regulation: { home: 4, away: 4 },
      overtime: { home: 0, away: 0 },
      shootout: { home: 0, away: 1 },
    })
  })

  it('old shootout shape: p4s 1–0 is the shootout +1, overtime was really 0–0', () => {
    const m = fixture(SHOOTOUT_OLD).match
    assert.equal(m.p4s_A, '1')
    assert.equal(m.p5s_A, '')
    assert.deepEqual(resultBreakdown(m), {
      decidedBy: 'shootout',
      regulation: { home: 4, away: 4 },
      overtime: { home: 0, away: 0 },
      shootout: { home: 2, away: 1 },
    })
  })

  it('list rows (getMatches) with only es/ps/p4s work too', () => {
    const row = { fs_A: '4', fs_B: '5', es_A: '4', es_B: '4', p4s_A: '0', p4s_B: '0', ps_A: '0', ps_B: '1' }
    assert.equal(resultBreakdown(row).decidedBy, 'shootout')
    const noP4 = { fs_A: '3', fs_B: '4', es_A: '3', es_B: '3', p4s_A: '', p4s_B: '', ps_A: '', ps_B: '' }
    assert.deepEqual(resultBreakdown(noP4).overtime, { home: 0, away: 1 })
    const shootoutNoP4 = { ...row, p4s_A: '', p4s_B: '' }
    assert.equal(resultBreakdown(shootoutNoP4).overtime, undefined, 'no overtime row unless TASO sent one')
  })
})

describe('labels', () => {
  it('final label says how the game was decided', () => {
    assert.equal(finalScoreLabel('regulation', 3), 'Lopputulos (3 erää)')
    assert.equal(finalScoreLabel('overtime', 3), 'Lopputulos (jatkoaika)')
    assert.equal(finalScoreLabel('shootout', 3), 'Lopputulos (RL-kilpailu)')
    assert.equal(finalScoreLabel(undefined, 2), 'Lopputulos')
  })

  it('list scores carry ja / rl', () => {
    assert.equal(scoreWithSuffix(6, 5, 'regulation'), '6–5')
    assert.equal(scoreWithSuffix(3, 4, 'overtime'), '3–4 ja')
    assert.equal(scoreWithSuffix(4, 5, 'shootout'), '4–5 rl')
  })

  it('period labels for overtime and shootout events', () => {
    assert.equal(periodLabel('2'), '2. Erä')
    assert.equal(periodLabel('4'), 'Jatkoaika')
    assert.equal(periodLabel(5), 'RL-kilpailu')
  })

  it('extra periods text', () => {
    assert.equal(extraPeriodsText(resultBreakdown(fixture(REGULATION).match)), '')
    assert.equal(
      extraPeriodsText(resultBreakdown(fixture(SHOOTOUT).match)),
      'Varsinainen peliaika 4–4, Jatkoaika 0–0, RL-kilpailu 0–1',
    )
    assert.equal(extraPeriodsText(resultBreakdown(fixture(OVERTIME).match), 'en'), 'regulation 3–3, overtime 0–1')
  })
})

describe('fetchSalibandyMatch: rows add up to the final', () => {
  it('regulation 929695: three periods = 6–5, no result rows', async () => {
    const d = await fetchSalibandyMatch(REGULATION)
    assert.equal(d.result.decidedBy, 'regulation')
    assert.equal(d.periods.length, 3)
    assert.deepEqual([sum(d.periods, 'scoreHome'), sum(d.periods, 'scoreAway')], [d.scoreHome, d.scoreAway])
    assert.deepEqual([d.scoreHome, d.scoreAway], [6, 5])
  })

  for (const id of [OVERTIME, SHOOTOUT, SHOOTOUT_OLD]) {
    it(`${id}: periods = regulation, regulation + overtime + shootout bonus = final`, async () => {
      const d = await fetchSalibandyMatch(id)
      const r = d.result
      assert.notEqual(r.decidedBy, 'regulation')
      assert.equal(d.periods.length, 3, 'the 3-period grid stays 3 columns')
      assert.deepEqual([sum(d.periods, 'scoreHome'), sum(d.periods, 'scoreAway')], [r.regulation.home, r.regulation.away])
      const bonus = r.shootout ? (r.shootout.home > r.shootout.away ? [1, 0] : [0, 1]) : [0, 0]
      const ot = r.overtime ?? { home: 0, away: 0 }
      assert.deepEqual(
        [r.regulation.home + ot.home + bonus[0], r.regulation.away + ot.away + bonus[1]],
        [d.scoreHome, d.scoreAway],
      )
    })
  }

  it('shootout 929721: the extra goal is not «Tuntematon» and not on the goalie', async () => {
    const d = await fetchSalibandyMatch(SHOOTOUT)
    assert.deepEqual([d.scoreHome, d.scoreAway], [4, 5])
    const so = d.goals.filter((g) => g.isShootoutGoal)
    assert.equal(so.length, 1)
    assert.equal(so[0].scorerName, 'RL-kilpailun voittomaali')
    assert.equal(so[0].team, 'away')
    // 19:33 Indians 2–1 really has no scorer in TASO; only the shootout goal is renamed.
    assert.equal(d.goals.filter((g) => g.scorerName === 'Tuntematon').length, 1)
    assert.equal(d.goals.find((g) => g.scorerName === 'Tuntematon').period, '1')
    assert.equal(d.goalkeepers.home.goalsConceded, 4, 'SPV scored 4 in play; the shootout +1 is not a goal against')
    assert.ok(!computePlayerLeaders(d).some((l) => l.playerName === 'RL-kilpailun voittomaali'))
  })

  it('old shootout 518748: the deciding shooter keeps his name, but it is not a player goal', async () => {
    const d = await fetchSalibandyMatch(SHOOTOUT_OLD)
    const so = d.goals.filter((g) => g.isShootoutGoal)
    assert.equal(so.length, 1)
    assert.equal(so[0].scorerName, 'Iiskola Heikki')
    const iiskola = computePlayerLeaders(d).find((l) => l.playerName === 'Iiskola Heikki')
    assert.equal(iiskola.goals, d.goals.filter((g) => g.scorerName === 'Iiskola Heikki' && !g.isShootoutGoal).length)
    assert.equal(d.goalkeepers.away.goalsConceded, 4)
  })

  it('AI briefing writes the shootout honestly', async () => {
    const d = await fetchSalibandyMatch(SHOOTOUT)
    const md = buildFloorballPreviewMd({ match: d, standings: [], leaders: [] })
    assert.match(md, /4–5 rl/)
    assert.match(md, /Varsinainen peliaika 4–4, Jatkoaika 0–0, RL-kilpailu 0–1/)
  })
})
