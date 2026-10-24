// Overage badge data + higher-level chip + season series, from trimmed real
// TASO payloads fetched 24.10.2026 (getMatch 949684/949686, getPlayer).
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  extractMatchRosters,
  mapRosterPlayer,
  mergeOverage,
  mapPlayerMatch,
  historyRowsFromPlayer,
  fetchPlayerHistory,
  resetSalibandyCaches,
  PLAYER_HISTORY_KEY,
} from '../src/services/salibandyApi.ts'
import { ageRank, higherLevels, seriesThisSeason, seasonIdFor } from '../src/utils/playerLevels.ts'

const fx = (n) => JSON.parse(readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8'))
const profile = (n) => {
  const p = fx('oct24-getPlayer-' + n).player
  return { playerId: p.player_id, matches: p.matches.map(mapPlayerMatch) }
}
function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}
const SEASON = '2026-2027'
const U14 = 'U14 Pojat VALK B ES'

describe('overage flag (TASO only)', () => {
  it('949684: SB Vantaa Valkoinen has Y on Wilén #20, Meskanen #24, Tamminen #57 only', () => {
    const { away } = extractMatchRosters(fx('oct24-getMatch-949684').match)
    assert.deepEqual(away.filter((p) => p.overage).map((p) => `${p.lastName} #${p.shirtNumber}`).sort(), ['Meskanen #24', 'Tamminen #57', 'Wilén #20'])
  })
  it('born 2012 without the TASO flag is not overage (Seppä, Gräsbeck, Häkkinen)', () => {
    const { home, away } = extractMatchRosters(fx('oct24-getMatch-949684').match)
    for (const p of [...home, ...away].filter((x) => x.birthYear === '2012' && !['Wilén', 'Meskanen', 'Tamminen'].includes(x.lastName))) assert.equal(p.overage, false, p.fullName)
  })
  it('949686: nobody flagged', () => {
    const { home, away } = extractMatchRosters(fx('oct24-getMatch-949686').match)
    assert.ok(home.length + away.length > 20)
    assert.equal([...home, ...away].some((p) => p.overage), false)
  })
  it('getTeam roster replacing the lineup keeps the lineup flag', () => {
    const team = [mapRosterPlayer({ player_id: '55582', first_name: 'Emil', last_name: 'Wilén' })]
    const lineup = [mapRosterPlayer({ player_id: '55582', first_name: 'Emil', last_name: 'Wilén', overage: '1' })]
    assert.equal(mergeOverage(team, lineup)[0].overage, true)
  })
})

describe('higher-level chip', () => {
  it('ageRank', () => {
    assert.equal(ageRank('U15 Pojat HAASTAJA ES'), 15)
    assert.equal(ageRank('P13-14 HARRASTE (SYKSY) ES'), 13)
    assert.equal(ageRank('U16-17 Tytöt+KS'), 16)
    assert.equal(ageRank('Miehet IV-divisioona'), 100)
    assert.equal(ageRank('Etelä-Suomi 2026-27'), null)
    assert.equal(seasonIdFor('2026-10-24'), SEASON)
    assert.equal(seasonIdFor('2027-03-01'), SEASON)
  })
  it('Emil Wilén: U15 Pojat HAASTAJA, games counted without not_participated', () => {
    const p = profile('55582')
    const hl = higherLevels(historyRowsFromPlayer(p), SEASON, U14)
    assert.equal(hl.length, 1)
    assert.equal(hl[0].category, 'U15 Pojat HAASTAJA')
    assert.ok(hl[0].games >= 1)
  })
  it('Mila Piirainen: U16-17 girls and U15 boys, not the U14 girls path', () => {
    const hl = higherLevels(historyRowsFromPlayer(profile('107881')), SEASON, U14).map((h) => h.category)
    assert.ok(hl.some((c) => c.startsWith('U16-17')))
    assert.ok(hl.includes('U15 Pojat HAASTAJA'))
    assert.ok(!hl.some((c) => /U14/.test(c)))
  })
  it('Simo Oinonen: no chip (only U14 this season; last season ignored)', () => {
    assert.deepEqual(higherLevels(historyRowsFromPlayer(profile('119805')), SEASON, U14), [])
  })
  it('not_participated games are dropped', () => {
    const rows = [
      { seasonId: SEASON, category: 'U15 Pojat HAASTAJA ES', teamName: 'X', teamId: '1', notParticipated: true, goals: 0, played: true },
    ]
    assert.deepEqual(higherLevels(rows, SEASON, U14), [])
  })
})

describe('season series', () => {
  it('Simo: U14 Pojat VALK B · Westend Indians Yellow', () => {
    const s = seriesThisSeason(historyRowsFromPlayer(profile('119805')), SEASON)
    assert.equal(s.length, 1)
    assert.equal(s[0].category, 'U14 Pojat VALK B')
    assert.equal(s[0].teamName, 'Westend Indians Yellow')
    assert.ok(s[0].games >= 1)
  })
})

describe('fetchPlayerHistory cache', () => {
  beforeEach(() => {
    resetSalibandyCaches()
    globalThis.localStorage = memoryStorage()
  })
  it('signed getPlayer once, then served from localStorage for 12 h', async () => {
    const urls = []
    globalThis.fetch = async (u) => {
      urls.push(String(u))
      return new Response(JSON.stringify({ call: { status: 'ok' }, ...fx('oct24-getPlayer-55582') }), { status: 200 })
    }
    const a = await fetchPlayerHistory('55582', 1000)
    resetSalibandyCaches()
    const b = await fetchPlayerHistory('55582', 1000 + 11 * 3600e3)
    assert.equal(urls.length, 1)
    assert.match(urls[0], /getPlayer\?player_id=55582&hash=[0-9a-f]{64}/)
    assert.deepEqual(a, b)
    assert.ok(localStorage.getItem(PLAYER_HISTORY_KEY))
    await fetchPlayerHistory('55582', 1000 + 13 * 3600e3)
    assert.equal(urls.length, 2)
  })
})
