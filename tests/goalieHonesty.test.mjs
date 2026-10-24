// Arto's rule: never invent save percentages. Real TASO getMatch 949684 (24.10.2026)
// has päästetty events but no torjunta events → saves are "not recorded" (null), not 0.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resetSalibandyCaches, fetchSalibandyMatch } from '../src/services/salibandyApi.ts'

const match = JSON.parse(readFileSync(new URL('./fixtures/oct24-getMatch-949684-full.json', import.meta.url), 'utf8'))
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size } } }
const serve = (body) => { globalThis.fetch = async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }) }

describe('goalkeeper stats honesty', () => {
  beforeEach(() => { resetSalibandyCaches(); globalThis.localStorage = mem() })
  it('949684: no torjunta from TASO → saves null, no save %', async () => {
    serve(match)
    const d = await fetchSalibandyMatch('949684')
    for (const g of [d.goalkeepers.home, d.goalkeepers.away]) {
      assert.equal(g.saves, null)
      assert.ok(!('savePercentage' in g))
    }
    assert.equal(d.goalkeepers.home.goalsConceded + d.goalkeepers.away.goalsConceded, 7)
    assert.notEqual(d.goalkeepers.home.goalieName, 'Maalivahti') // name from päästetty
    assert.ok(!JSON.stringify(d.goalkeepers).includes('%'))
  })
  it('torjunta events present → raw counts only, still no %', async () => {
    const ev = [...match.match.events, { event_id: 't1', code: 'torjunta', team: 'A', period: 1, time: '1:00', player_name: 'X' }]
    serve({ ...match, match: { ...match.match, events: ev } })
    const d = await fetchSalibandyMatch('949684')
    assert.equal(d.goalkeepers.home.saves, 1); assert.equal(d.goalkeepers.away.saves, 0)
    assert.ok(!JSON.stringify(d.goalkeepers).includes('%'))
  })
})
