// Ottelun tapahtumat timeline from real TASO getMatch 949684 events (24.10.2026, live).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTimeline, isLiveStatus } from '../src/utils/matchEvents.ts'

const m = JSON.parse(readFileSync(new URL('./fixtures/oct24-getMatch-949684-full.json', import.meta.url), 'utf8')).match

describe('match events timeline (949684)', () => {
  const t = buildTimeline(m)
  const all = t.flatMap((p) => p.items)
  it('grouped by period, no vaihto/yhteyspalasi', () => {
    assert.deepEqual(t.map((p) => p.label), ['1. erä', '2. erä'])
    assert.ok(!JSON.stringify(t).includes('Yhteyspalasi'))
  })
  it('goals pair with assists and conceding goalie', () => {
    const goals = all.filter((i) => i.kind === 'goal')
    assert.equal(goals.length, 7)
    const g = goals[0]
    assert.equal(g.time, '2:54'); assert.equal(g.score, '0-1')
    assert.equal(g.scorer, '#20 Wilén Emil'); assert.equal(g.assist, '#11 Piirainen Mila')
    assert.equal(g.goalie, '#30 Marjamäki Lenni')
    assert.equal(goals.filter((x) => x.assist).length, 5) // 6 syotto, one sent without a name → blank
  })
  it('penalty with minutes, player and reason code', () => {
    const p = all.find((i) => i.kind === 'penalty')
    assert.equal(p.minutes, '2min'); assert.equal(p.player, '#26 Vagaitsev Iaroslav'); assert.equal(p.reason, 'LMP')
  })
  it('goalie changes shown', () => assert.equal(all.filter((i) => i.kind === 'goalie').length, 2))
  it('no events → empty; live status', () => {
    assert.deepEqual(buildTimeline({ events: [] }), [])
    assert.ok(isLiveStatus('Live')); assert.ok(isLiveStatus('Käynnissä')); assert.ok(!isLiveStatus('Played'))
  })
})
describe('timeline order', () => {
  it('period 1 chronological, Erä Loppui last', () => {
    const p1 = buildTimeline(m)[0].items
    assert.equal(p1.at(-1).label, 'Erä Loppui')
    const goals = p1.filter((i) => i.kind === 'goal').map((g) => g.time)
    assert.deepEqual(goals, ['2:54', '3:15', '3:56', '8:58'])
  })
})
