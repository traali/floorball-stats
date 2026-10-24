// Shirt number next to the name wherever TASO sent one (real 949684 events, 24.10.2026).
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { withShirt } from '../src/utils/shirt.ts'
import { parseFavorites } from '../src/utils/favoritesStore.ts'
import { fetchSalibandyMatch, computePlayerLeaders, enrichPlayerShirts, resetSalibandyCaches } from '../src/services/salibandyApi.ts'

const fx = (n) => readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8')
function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}
beforeEach(() => {
  resetSalibandyCaches()
  globalThis.localStorage = memoryStorage()
})

describe('withShirt', () => {
  it('prefixes only a real number', () => {
    assert.equal(withShirt('Simo Oinonen', '55'), '#55 Simo Oinonen')
    assert.equal(withShirt('Simo Oinonen', ''), 'Simo Oinonen')
    assert.equal(withShirt('Simo Oinonen', undefined), 'Simo Oinonen')
    assert.equal(withShirt('X', '0'), 'X')
  })
})

describe('949684 events carry shirt numbers', () => {
  it('scorer, assist, goalie and leaders', async () => {
    globalThis.fetch = async () => new Response(fx('oct24-getMatch-949684-events'), { status: 200 })
    const m = await fetchSalibandyMatch('949684')
    const g1 = m.goals[0]
    assert.equal(withShirt(g1.scorerName, g1.scorerShirtNumber), '#20 Wilén Emil')
    assert.equal(g1.assistShirtNumber, '11')
    assert.equal(g1.assistPlayerId, '107881')
    const leaders = computePlayerLeaders(m)
    assert.ok(leaders.length > 0)
    for (const l of leaders) assert.match(l.shirtNumber, /^\d+$/, l.playerName)
  })
})

describe('search + favourites', () => {
  it('player hit without a number gets it from getPlayer teams[]', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ call: { status: 'ok' }, player: { player_id: '119805', teams: [{ team_id: '25301', shirt_number: '55' }], matches: [], upcoming: [] } }), { status: 200 })
    const out = await enrichPlayerShirts([{ kind: 'player', id: '119805', title: 'Simo Oinonen', subtitle: 'WEI' }])
    assert.equal(withShirt(out[0].title, out[0].shirtNumber), '#55 Simo Oinonen')
  })
  it('favourite players keep shirtNumber through storage', () => {
    const [f] = parseFavorites(JSON.stringify([{ kind: 'player', id: '119805', name: 'Simo Oinonen', shirtNumber: '55' }]))
    assert.equal(f.shirtNumber, '55')
    const [t] = parseFavorites(JSON.stringify([{ kind: 'team', id: '25301', name: 'WEI Yellow', shirtNumber: '55' }]))
    assert.equal(t.shirtNumber, undefined)
  })
})
