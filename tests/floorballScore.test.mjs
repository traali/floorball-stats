import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { floorballScore } from '../src/services/salibandyApi.ts'

describe('floorballScore', () => {
  it('drops a future 0-0', () => {
    const scored = floorballScore({
      fs_A: '0',
      fs_B: '0',
      date: '2099-01-01',
      time: '18:00',
      status: '1',
    })
    assert.equal(scored, undefined)
  })

  it('keeps a real score', () => {
    const scored = floorballScore({
      fs_A: '4',
      fs_B: '2',
      date: '2020-01-01',
      time: '18:00',
      status: '1',
    })
    assert.deepEqual(scored, { home: 4, away: 2 })
  })

  it('does not call a past 0-0 with no events a draw', () => {
    const scored = floorballScore(
      { fs_A: '0', fs_B: '0', date: '2020-01-01', time: '18:00', status: 'played' },
      [],
    )
    assert.equal(scored, undefined)
  })
})
