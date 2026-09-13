import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractMatchRosters, mapRosterPlayer } from '../src/services/salibandyApi.ts'

describe('Match roster extraction (Ennakko player cards)', () => {
  it('maps TASO aliases into G+A+P', () => {
    const p = mapRosterPlayer({
      player_id: '99',
      first_name: 'Simo',
      last_name: 'Oinonen',
      shirt_number: '11',
      maalit: '3',
      syotot: '2',
    })
    assert.equal(p.fullName, 'Simo Oinonen')
    assert.equal(p.goals, 3)
    assert.equal(p.assists, 2)
    assert.equal(p.points, 5)
  })

  it('splits getMatch.players by team A/B', () => {
    const { home, away } = extractMatchRosters({
      team_A_id: '1',
      team_B_id: '2',
      players: [
        { player_id: '10', player_name: 'Koti MV', team: 'A', goals: 0, assists: 0 },
        { player_id: '11', first_name: 'Koti', last_name: 'Hyokkaaja', team: 'A', goals: 4, assists: 1 },
        { player_id: '20', player_name: 'Vieras', team: 'B', goals: 1, assists: 3 },
      ],
    })
    assert.equal(home.length, 2)
    assert.equal(away.length, 1)
    assert.equal(home[1].points, 5)
    assert.equal(away[0].fullName, 'Vieras')
  })

  it('reads team_A_players / lineup_B shapes', () => {
    const { home, away } = extractMatchRosters({
      team_A_players: [{ player_id: '1', name: 'Aada', goals: 2 }],
      lineup_B: [{ player_id: '2', player_name: 'Leevi' }],
    })
    assert.equal(home[0].fullName, 'Aada')
    assert.equal(away[0].fullName, 'Leevi')
  })
})
