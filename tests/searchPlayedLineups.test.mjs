// Bare-name player search keeps working after the game ends: real TASO 24.10.2026
// rows + getMatch 949684 (Simo Oinonen #55, Westend). 949684 was Live in the captured
// row and TASO reports it Played after the final whistle; both must find him.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resetSalibandyCaches, searchLiveLineups } from '../src/services/salibandyApi.ts'

const fx = (n) => JSON.parse(readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8'))
const rows = fx('oct24-getMatches-rows')
const match = fx('oct24-getMatch-949684-full')
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size } } }

function serve(status) {
  globalThis.fetch = async (url) => {
    const u = String(url)
    const body = u.includes('getMatches')
      ? { ...rows, matches: rows.matches.map((m) => (m.match_id === '949684' ? { ...m, status } : m)) }
      : u.includes('getMatch') ? { ...match, match: { ...match.match, status } } : { call: { status: 'ok' } }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

describe('bare-name search in today’s lineups', () => {
  beforeEach(() => { resetSalibandyCaches(); globalThis.localStorage = mem() })
  for (const status of ['Live', 'Played']) {
    it(`finds Simo Oinonen when 949684 is ${status}`, async () => {
      serve(status)
      const hits = await searchLiveLineups(['simo', 'oinonen'], '2026-10-24')
      const p = hits.find((h) => h.kind === 'player')
      assert.ok(p, 'player found')
      assert.match(p.title, /Oinonen/)
      assert.match(p.subtitle, status === 'Played' ? /pelasi tänään/ : /pelaa nyt/)
    })
  }
  it('skips games not started (Fixture)', async () => {
    serve('Fixture')
    const hits = await searchLiveLineups(['simo', 'oinonen'], '2026-10-24')
    assert.equal(hits.length, 0)
  })
})
