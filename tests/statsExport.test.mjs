// Stats export + analysis prompt from real trimmed TASO payloads (player 43328 Eliot Seppä, match 949684, 24.10.2026).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPlayerExport, buildMatchExport, playerCsv, matchCsv, playerPrompt, matchPrompt, playerMatchRow } from '../src/utils/statsExport.ts'

const fx = (n) => JSON.parse(readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8'))
const AT = '2026-10-24T12:45:00.000Z'

describe('player export (43328)', () => {
  const x = buildPlayerExport(fx('oct24-getPlayer-43328').player, AT)
  it('profile with shirt, birth year, goalie, flags', () => {
    assert.equal(x.profile.name, 'Eliot Seppä')
    assert.deepEqual(x.profile.shirt_numbers, ['1'])
    assert.equal(x.profile.birth_year, '2012')
    assert.equal(x.profile.goalie, true)
    assert.equal(x.teams[0].overage, false)
    assert.equal(x.meta.fetched_at, AT)
  })
  it('goalie saves only as TASO sent them; none for non-played', () => {
    const played = x.matches.filter((m) => m.status === 'Played' && m.goalkeeper_played === true)
    assert.ok(played.length > 0)
    assert.ok(played.every((m) => m.saves != null))
    const s = x.season_totals.find((t) => t.category === 'U15 Pojat HAASTAJA ES')
    assert.equal(s.saves, 112); assert.equal(s.conceded, 35)
    assert.ok(!JSON.stringify(x).includes('save_pct'))
  })
  it('result only when Played', () => {
    const r = playerMatchRow({ status: 'Fixture', fs_A: '0', fs_B: '0', team_id: '1', team_A_id: '1' })
    assert.equal(r.result, null); assert.equal(r.score, null); assert.equal(r.goals, null)
  })
  it('CSV has match rows and totals; upcoming include 949684', () => {
    const csv = playerCsv(x)
    assert.match(csv, /^# source: TASO/m)
    assert.match(csv, /## season_totals/)
    assert.ok(x.upcoming.some((u) => u.match_id === '949684'))
  })
  it('prompt is Finnish goalie version with rules and is compact', () => {
    const p = playerPrompt(x)
    assert.match(p, /^Analysoi maalivahti #1 Eliot Seppä/)
    assert.match(p, /U14/); assert.match(p, /VAIN/)
    assert.ok(p.length < 26000)
    assert.ok(playerPrompt(x, 3000).length < 4000)
  })
})

describe('match export (949684)', () => {
  const x = buildMatchExport(fx('oct24-getMatch-949684-full').match, AT)
  it('lineups with numbers, birth years, flags', () => {
    const e = x.lineups.find((l) => l.player_id === '55582')
    assert.equal(e.name, '#20 Wilén Emil'); assert.equal(e.overage, true); assert.ok(e.birth_year)
  })
  it('events carry shirts; CSV + prompt', () => {
    assert.ok(x.events.some((e) => e.code === 'maali' && e.player?.startsWith('#')))
    assert.match(matchCsv(x), /## lineups/)
    assert.match(matchPrompt(x), /^Analysoi salibandyottelu Westend Indians Yellow – SB Vantaa Valkoinen/)
  })
})

describe('prompt JSON stays valid when trimmed (real 43328 data)', () => {
  const x = buildPlayerExport(fx('oct24-getPlayer-43328').player, AT)
  const jsonOf = (p) => JSON.parse(p.slice(p.indexOf('DATA (JSON):\n') + 'DATA (JSON):\n'.length))
  it('default prompt JSON parses and fits', () => {
    const p = playerPrompt(x)
    assert.ok(p.length < 26000)
    const j = jsonOf(p)
    assert.equal(j.profile.player_id, '43328')
    assert.equal(j.meta.fetched_at, AT)
  })
  for (const max of [6000, 5000, 4000]) {
    it(`max ${max}: drops oldest whole matches, JSON parses, note counts them`, () => {
      const p = playerPrompt(x, max)
      const j = jsonOf(p)
      const dropped = x.matches.length - j.matches.length
      assert.ok(dropped > 0)
      assert.deepEqual(j.matches, x.matches.slice(0, j.matches.length)) // newest kept, oldest dropped
      assert.match(p, new RegExp(`data on lyhennetty \\(${dropped} vanhinta ottelua pois`))
      assert.ok(JSON.stringify(j).length <= max)
    })
  }
  it('very small max: all matches dropped, other whole items dropped, still parses', () => {
    const p = playerPrompt(x, 2000)
    const j = jsonOf(p)
    assert.equal(j.matches.length, 0)
    assert.match(p, new RegExp(`lyhennetty \\(${x.matches.length} vanhinta ottelua pois, \\d+ muuta riviä pois`))
  })
  it('match prompt JSON parses when trimmed (949684)', () => {
    const m = buildMatchExport(fx('oct24-getMatch-949684-full').match, AT)
    const j = jsonOf(matchPrompt(m, 4000))
    assert.equal(j.match.match_id, '949684')
  })
  it('fetched_at shown in Helsinki time, ISO kept in data', () => {
    const p = playerPrompt(x)
    assert.match(p, /haettu 24\.10\.2026 klo 15\.45 \(Helsingin aikaa\)/)
    assert.match(playerCsv(x), /# fetched_at: 2026-10-24T12:45:00\.000Z/)
  })
})
