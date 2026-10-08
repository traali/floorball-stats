import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSalibandyQuery,
  parseTasoBody,
  resetSalibandyCaches,
  searchSalibandy,
  TEAM_INDEX_KEY,
} from '../src/services/salibandyApi.ts'

// Test doubles for the TASO API. Search must show these and nothing else.
const ok = (method, body) => JSON.stringify({ call: { method, status: 'ok' }, ...body })
const err = (method, error) => JSON.stringify({ call: { method, status: 'error', error } })

const CLUBS = [
  { club_id: '757', name: 'WESTEND INDIANS', abbrevation: 'Westend Indians', city_name: 'Espoo' },
  { club_id: '21', name: 'BANDY BOYS-88', abbrevation: 'BB-88', city_name: 'Sysmä' },
]
const TEAMS = {
  sb2026: [
    { team_id: '6055', club_id: '757', team_name: 'Westend Indians', category_name: 'Naisten Suomisarja', competition_id: 'sb2026' },
    { team_id: '2440', club_id: '21', team_name: 'BB-88', category_name: 'Suomen Cup miehet', competition_id: 'sb2026' },
  ],
  sb2026es: [
    { team_id: '28971', club_id: '757', team_name: 'Westend Indians Black', category_name: 'P14', competition_id: 'sb2026es' },
  ],
}
const PLAYERS = {
  757: [
    { player_id: '19202', first_name: 'Wilma', last_name: 'Virtanen', birth_year: '2011', club_id: '757', season_match_count: '3' },
    { player_id: '18866', first_name: 'Salla', last_name: 'Nuorteva', birth_year: '1993', club_id: '757', season_match_count: '0' },
  ],
  21: [{ player_id: '30001', first_name: 'Eino', last_name: 'Kaunisvaara', birth_year: '2011', club_id: '21', season_match_count: '2' }],
}
const KNOWN_IDS = new Set([
  ...CLUBS.map((c) => `club:${c.club_id}`),
  ...Object.values(TEAMS).flat().map((t) => `team:${t.team_id}`),
  ...Object.values(PLAYERS).flat().map((p) => `player:${p.player_id}`),
  'competition:sb2026',
  'competition:sb2026es',
])

let calls = []
let down = false

function fakeTaso(url) {
  const u = new URL(url)
  const method = u.pathname.split('/').pop()
  const p = u.searchParams
  calls.push(method + (p.toString() ? `?${p.toString().replace(/&?_cb=\d+/, '')}` : ''))
  switch (method) {
    case 'getClubs':
      return ok(method, { clubs: CLUBS })
    case 'getCompetitions':
      return ok(method, {
        competitions: [
          { competition_id: 'sb2026', competition_name: 'Valtakunnalliset sarjat 2026-27', season_id: '2026-2027' },
          { competition_id: 'sb2026es', competition_name: 'Etelä-Suomi 2026-27', season_id: '2026-2027' },
        ],
      })
    case 'getTeams':
      return ok(method, { teams: TEAMS[p.get('competition_id')] || [] })
    case 'getPlayers':
      return ok(method, { players: PLAYERS[p.get('club_id')] || [] })
    case 'getCategories':
      return ok(method, { categories: [] })
    case 'getTeam':
      if (p.get('team_id') === '6055') return ok(method, { team: { team_id: '6055', team_name: 'Westend Indians', club_id: '757', club_name: 'Westend Indians' } })
      return 'object(joukkue)#20 (76) {\n  ["ID"]=>\n  string(7) "joukkue"\n}\n' // what Torneopal really sends for an unknown team
    case 'getPlayer':
      return err(method, 'Player not found')
    case 'getClub':
      return err(method, 'Club not found')
    case 'getMatch':
      return err(method, null)
    default:
      return err(method, 'Unkown method')
  }
}

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    get size() {
      return map.size
    },
  }
}

beforeEach(() => {
  calls = []
  down = false
  resetSalibandyCaches()
  globalThis.localStorage = memoryStorage()
  globalThis.fetch = async (url) => {
    if (down) return new Response('<html>403</html>', { status: 403 })
    return new Response(fakeTaso(String(url)), { status: 200, headers: { 'content-type': 'application/json' } })
  }
})

function assertAllFromApi(hits) {
  for (const h of hits) {
    assert.ok(KNOWN_IDS.has(`${h.kind}:${h.id}`), `hit ${h.kind}:${h.id} (${h.title}) was not returned by the API`)
  }
}

describe('search shows only what the TASO API returned', () => {
  it('finds a team and its club by name from the team index', async () => {
    const { hits } = await searchSalibandy('Westend')
    assertAllFromApi(hits)
    const teams = hits.filter((h) => h.kind === 'team').map((h) => h.id)
    assert.deepEqual(teams.sort(), ['28971', '6055'])
    assert.ok(hits.some((h) => h.kind === 'club' && h.id === '757'))
    assert.ok(!hits.some((h) => h.id === '2440'), 'BB-88 does not match «Westend»')
    assert.ok(calls.some((c) => c.startsWith('getTeams?competition_id=sb2026es')), 'every current competition is indexed')
  })

  it('finds a player with club name + surname via getPlayers?club_id', async () => {
    const { hits, playerClubs } = await searchSalibandy('westend virtanen')
    assertAllFromApi(hits)
    const players = hits.filter((h) => h.kind === 'player')
    assert.deepEqual(players.map((p) => [p.id, p.title, p.clubId]), [['19202', 'Wilma Virtanen', '757']])
    assert.deepEqual(playerClubs.map((c) => c.clubId), ['757'])
    assert.ok(calls.includes('getPlayers?club_id=757'))
    assert.ok(!calls.includes('getPlayers?club_id=21'))
  })

  it('a plain name finds no player unless a favourite club has them', async () => {
    const plain = await searchSalibandy('Virtanen')
    assert.equal(plain.hits.filter((h) => h.kind === 'player').length, 0)
    assert.deepEqual(plain.playerClubs, [])

    const viaFavourite = await searchSalibandy('Virtanen', { favoriteClubIds: ['757'] })
    assertAllFromApi(viaFavourite.hits)
    assert.deepEqual(viaFavourite.hits.filter((h) => h.kind === 'player').map((h) => h.id), ['19202'])
  })

  it('shows nothing when the API is down (no fallback data)', async () => {
    down = true
    const { hits } = await searchSalibandy('Westend')
    assert.deepEqual(hits, [])
  })

  it('keeps the team index in localStorage for the next visit', async () => {
    await searchSalibandy('Westend')
    const saved = JSON.parse(globalThis.localStorage.getItem(TEAM_INDEX_KEY))
    assert.equal(saved.teams.length, 3)
    resetSalibandyCaches() // new page load, same phone
    calls = []
    const { hits } = await searchSalibandy('BB-88')
    assert.ok(hits.some((h) => h.kind === 'team' && h.id === '2440'))
    assert.ok(!calls.some((c) => c.startsWith('getTeams')), 'index came from localStorage')
  })
})

describe('numeric ids are looked up, never invented', () => {
  it('a bare number is an id query', () => {
    assert.deepEqual(parseSalibandyQuery('6055'), { kind: 'id', id: '6055' })
    assert.deepEqual(parseSalibandyQuery('https://tulospalvelu.salibandy.fi/team/6055'), { kind: 'team', id: '6055' })
  })

  it('a known team id returns only the team the API knows', async () => {
    const { hits } = await searchSalibandy('6055')
    assert.deepEqual(hits.map((h) => [h.kind, h.id, h.title]), [['team', '6055', 'Westend Indians']])
    for (const m of ['getClub', 'getTeam', 'getPlayer', 'getMatch']) {
      assert.ok(calls.some((c) => c.startsWith(m + '?')), `${m} was asked`)
    }
  })

  it('an unknown id shows nothing', async () => {
    const { hits } = await searchSalibandy('424242')
    assert.deepEqual(hits, [])
    const viaUrl = await searchSalibandy('https://tulospalvelu.salibandy.fi/ottelu/99999999')
    assert.deepEqual(viaUrl.hits, [])
  })

  it('a PHP dump with no JSON is not data', () => {
    assert.equal(parseTasoBody('object(joukkue)#20 (76) {\n  ["ID"]=>\n}'), null)
    assert.equal(parseTasoBody('{"call":{"status":"error"}}'), null)
    assert.deepEqual(parseTasoBody('notice\n{"call":{"status":"OK"},"x":1}'), { call: { status: 'OK' }, x: 1 })
  })
})

describe('retries', () => {
  beforeEach(() => {
    calls = []
    resetSalibandyCaches()
  })
  it('a clean JSON «not found» is not retried with a cache-buster', async () => {
    let n = 0
    globalThis.fetch = async () => {
      n++
      // real shape: parameters:{} comes before status
      return new Response('{"call":{"parameters":{},"logged_in":false,"method":"getPlayer","status":"error","error":"Player not found"}}', { status: 200 })
    }
    const { hits } = await searchSalibandy('https://tulospalvelu.salibandy.fi/pelaaja/424242')
    assert.deepEqual(hits, [])
    assert.equal(n, 1)
  })
  it('a 403 is retried once with a cache-buster and then served', async () => {
    const urls = []
    globalThis.fetch = async (url) => {
      urls.push(String(url))
      if (!String(url).includes('_cb=')) return new Response('<html>403</html>', { status: 403 })
      return new Response(ok('getClub', { club: { club_id: '757', name: 'WESTEND INDIANS', abbrevation: 'Westend Indians' } }), { status: 200 })
    }
    const { hits } = await searchSalibandy('https://tulospalvelu.salibandy.fi/seura/757')
    assert.deepEqual(hits.map((h) => [h.kind, h.id]), [['club', '757']])
    assert.equal(urls.length, 2)
    assert.ok(urls[1].includes('_cb='))
  })
})
