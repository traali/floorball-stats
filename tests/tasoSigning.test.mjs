// TASO signed requests (tulospalvelu.salibandy.fi assets/index-CkQ23erR.js) and
// «Not allowed» handling. Hashes below were accepted by Torneopal on 24.10.2026.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  signTasoPath,
  fetchSalibandyMatch,
  getTasoFailure,
  searchSalibandy,
  searchLiveLineups,
  resetSalibandyCaches,
} from '../src/services/salibandyApi.ts'

const fx = (n) => JSON.parse(readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8'))
function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), clear: () => map.clear() }
}
let seen = []
beforeEach(() => {
  resetSalibandyCaches()
  globalThis.localStorage = memoryStorage()
  seen = []
})

describe('signTasoPath', () => {
  it('sha256("<method>?<salt>&k=v…") appended as hash (real accepted hashes)', async () => {
    assert.equal(await signTasoPath('getMatch?match_id=949684'), 'getMatch?match_id=949684&hash=8d5b358fd582cd0420ab581105a5cb1e60933015d25d57c1e1a396127c10a44e')
    assert.equal(await signTasoPath('getMatches?date=2026-10-24'), 'getMatches?date=2026-10-24&hash=20a28efb263d83e0de46dd294e5c9e5d25590d7a26673853253cf76edb47de8c')
  })
  it('hashes raw values but keeps the URL encoded; no params → salt only', async () => {
    const enc = await signTasoPath('getPlayers?club_id=1&q=%C3%85IF%20Bl%C3%A5')
    const raw = await signTasoPath('getPlayers?club_id=1&q=ÅIF Blå')
    assert.equal(enc.split('hash=')[1], raw.split('hash=')[1])
    assert.ok(enc.startsWith('getPlayers?club_id=1&q=%C3%85IF%20Bl%C3%A5&hash='))
    assert.match(await signTasoPath('getClubs'), /^getClubs\?hash=[0-9a-f]{64}$/)
  })
  it('every request carries a valid hash, the cache-buster included', async () => {
    globalThis.fetch = async (url) => {
      seen.push(String(url))
      return new Response('{"call":{"status":"ok"},"match":null}', { status: 200 })
    }
    await fetchSalibandyMatch('1')
    for (const u of seen) {
      const path = u.split('/rest/')[1]
      const unsigned = path.replace(/&hash=[0-9a-f]+$/, '')
      assert.equal(await signTasoPath(unsigned), path)
    }
  })
})

describe('«Not allowed» is an error, never an empty result', () => {
  beforeEach(() => {
    globalThis.fetch = async () => new Response('Not allowed 2', { status: 200, headers: { 'content-type': 'text/html' } })
  })
  it('getMatch → null and the failure is recorded for the UI banner', async () => {
    assert.equal(await fetchSalibandyMatch('949684'), null)
    assert.deepEqual([getTasoFailure().status, getTasoFailure().body], [200, 'Not allowed 2'])
  })
  it('search rejects instead of saying «no hits»', async () => {
    await assert.rejects(searchSalibandy('Simo Oinonen'), /Not allowed 2/)
  })
})

describe('bare player name finds players in live games (Simo Oinonen, 24.10.2026)', () => {
  it('Westend Indians Yellow #55, live in 949684', async () => {
    globalThis.fetch = async (url) => {
      const u = String(url)
      if (u.includes('/getMatches?date=2026-10-24')) return new Response(JSON.stringify(fx('oct24-getMatches-rows')))
      if (u.includes('/getMatch?match_id=949684')) return new Response(JSON.stringify(fx('oct24-getMatch-949684')))
      return new Response('{"call":{"status":"error","error":"x"}}')
    }
    const hits = await searchLiveLineups(['simo', 'oinonen'], '2026-10-24')
    const p = hits.find((h) => h.kind === 'player')
    assert.equal(p.id, '119805')
    assert.match(p.subtitle, /Westend Indians Yellow/)
    assert.equal(p.shirtNumber, '55')
    const m = hits.find((h) => h.kind === 'match')
    assert.equal(m.id, '949684')
    assert.match(m.subtitle, /Käynnissä/)
    assert.equal(seen.length, 0)
  })
})
