import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatClock,
  isKickoffUpcoming,
  headToHead,
  commonOpponents,
  recentForm,
  sameDayPool,
} from '../src/utils/matchContext.ts'

describe('match clock + upcoming', () => {
  it('strips seconds from TASO time', () => {
    assert.equal(formatClock('16:00:00'), '16:00')
    assert.equal(formatClock('9:05'), '09:05')
  })

  it('treats today 16:00 as upcoming at 15:30 Helsinki', () => {
    const now = new Date('2026-09-13T12:30:00Z') // 15:30 EEST
    assert.equal(isKickoffUpcoming('2026-09-13', '16:00:00', now), true)
    assert.equal(isKickoffUpcoming('2026-09-13', '15:00', now), false)
  })
})

describe('form / h2h / common opponents', () => {
  const homeFx = [
    { matchId: '1', date: '2026-09-06', time: '12:00', homeTeam: 'A', awayTeam: 'C', homeTeamId: 'a', awayTeamId: 'c', score: '5–2', scoreHome: 5, scoreAway: 2, isHome: true, isWin: true, isDraw: false, isLoss: false, venueName: '', categoryName: '' },
    { matchId: '2', date: '2026-09-01', time: '12:00', homeTeam: 'B', awayTeam: 'A', homeTeamId: 'b', awayTeamId: 'a', score: '3–4', scoreHome: 3, scoreAway: 4, isHome: false, isWin: true, isDraw: false, isLoss: false, venueName: '', categoryName: '' },
    { matchId: 'now', date: '2026-09-13', time: '16:00', homeTeam: 'A', awayTeam: 'B', homeTeamId: 'a', awayTeamId: 'b', isHome: true, venueName: '', categoryName: '' },
  ]
  const awayFx = [
    { matchId: '3', date: '2026-09-07', time: '12:00', homeTeam: 'B', awayTeam: 'C', homeTeamId: 'b', awayTeamId: 'c', score: '1–8', scoreHome: 1, scoreAway: 8, isHome: true, isWin: false, isDraw: false, isLoss: true, venueName: '', categoryName: '' },
    { matchId: '2', date: '2026-09-01', time: '12:00', homeTeam: 'B', awayTeam: 'A', homeTeamId: 'b', awayTeamId: 'a', score: '3–4', scoreHome: 3, scoreAway: 4, isHome: true, isWin: false, isDraw: false, isLoss: true, venueName: '', categoryName: '' },
  ]

  it('recent form skips the current fixture', () => {
    assert.equal(recentForm(homeFx, 'now', 5).length, 2)
  })

  it('finds previous H2H', () => {
    const h = headToHead(homeFx, 'b', 'B', 'now')
    assert.equal(h.length, 1)
    assert.equal(h[0].matchId, '2')
  })

  it('lists C as common opponent, not H2H', () => {
    const rows = commonOpponents(homeFx, awayFx, 'a', 'b', 'now')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].opponent, 'C')
    assert.equal(rows[0].home.score, '5–2')
    assert.equal(rows[0].away.score, '1–8')
  })
})

describe('same-day tournament pool', () => {
  it('puts both games on one card in kickoff order', () => {
    const current = {
      matchId: '949661', date: '2026-09-13', time: '16:00:00',
      homeTeam: 'SB Vantaa Orange', awayTeam: 'Westend Indians Yellow',
      isHome: true, venueName: 'Tuusula', categoryName: 'U14',
    }
    const later = {
      matchId: '949662', date: '2026-09-13', time: '17:45:00',
      homeTeam: 'Westend Indians Yellow', awayTeam: 'Oilers',
      isHome: false, venueName: 'Tuusula', categoryName: 'U14',
    }
    const otherDay = { ...later, matchId: 'x', date: '2026-09-14' }
    const pool = sameDayPool([[later, otherDay]], '2026-09-13', current)
    assert.equal(pool.length, 2)
    assert.equal(pool[0].matchId, '949661')
    assert.equal(pool[1].time, '17:45:00')
  })
})
