import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseFederationTeamId,
  readLastTeamId,
  writeLastTeamId,
} from '../src/utils/teamSelection.ts'

function createStorage() {
  const map = new Map()
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

describe('team selection helpers', () => {
  it('parses real federation team ids from supported inputs', () => {
    assert.strictEqual(parseFederationTeamId('25301'), '25301')
    assert.strictEqual(parseFederationTeamId('https://salibandy.fi/tulospalvelu/joukkueet/25301'), '25301')
    assert.strictEqual(parseFederationTeamId('https://floorball-stats.pages.dev/#/?team=25748'), '25748')
    assert.strictEqual(parseFederationTeamId('/team/6546'), '6546')
  })

  it('rejects non-federation ids', () => {
    assert.strictEqual(parseFederationTeamId('westend-indians'), undefined)
    assert.strictEqual(parseFederationTeamId(''), undefined)
    assert.strictEqual(parseFederationTeamId(null), undefined)
  })

  it('persists and reads the last valid team id', () => {
    const storage = createStorage()
    writeLastTeamId('25301', storage)
    assert.strictEqual(readLastTeamId(storage), '25301')
  })

  it('ignores invalid team ids when persisting', () => {
    const storage = createStorage()
    writeLastTeamId('not-a-team', storage)
    assert.strictEqual(readLastTeamId(storage), undefined)
  })
})
