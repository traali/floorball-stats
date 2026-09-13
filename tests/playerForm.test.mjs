import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { previousGamesForPlayer } from '../src/utils/playerForm.ts'

describe('player previous games', () => {
  it('lists newest first and greys team games the player missed', () => {
    const playerMatches = [
      {
        matchId: '1', date: '2026-09-06', time: '12:00', status: '1',
        homeTeam: 'Indians Yellow', awayTeam: 'Oilers', homeTeamId: 'y', awayTeamId: 'o', teamId: 'y',
        scoreHome: 5, scoreAway: 2, categoryName: 'U14', competitionName: 'x',
        goals: 1, assists: 0, points: 1, pim: 0,
      },
    ]
    const teamFixtures = [
      { matchId: '1', date: '2026-09-06', time: '12:00', homeTeam: 'Indians Yellow', awayTeam: 'Oilers', isHome: true, score: '5–2', scoreHome: 5, scoreAway: 2, isWin: true, venueName: '', categoryName: 'U14' },
      { matchId: '2', date: '2026-09-01', time: '12:00', homeTeam: 'Indians Yellow', awayTeam: 'Tiikerit', isHome: true, score: '3–4', scoreHome: 3, scoreAway: 4, isWin: false, isLoss: true, venueName: '', categoryName: 'U14' },
      { matchId: 'now', date: '2026-09-13', time: '16:00', homeTeam: 'Vantaa', awayTeam: 'Indians Yellow', isHome: false, venueName: '', categoryName: 'U14' },
    ]
    const rows = previousGamesForPlayer({
      playerMatches,
      teamFixtures,
      year: '2026',
      half: 'syksy',
      asOfDate: '2026-09-13',
      excludeMatchId: 'now',
    })
    assert.equal(rows[0].matchId, '1')
    assert.equal(rows[0].result, 'V')
    assert.equal(rows[0].goals, 1)
    assert.equal(rows[1].matchId, '2')
    assert.equal(rows[1].result, 'DNP')
    assert.equal(rows.some((r) => r.matchId === 'now'), false)
  })
})
