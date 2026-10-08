import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFavoritesStore, FAVORITES_KEY, parseFavorites } from '../src/utils/favoritesStore.ts'

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) }
}

describe('favourites store', () => {
  it('survives a reload (new store, same phone storage)', () => {
    const phone = memoryStorage()
    const first = createFavoritesStore(() => phone)
    assert.equal(first.toggle({ kind: 'team', id: '6055', name: 'Westend Indians', clubId: '757' }), true)
    assert.equal(first.toggle({ kind: 'player', id: '19202', name: 'Wilma Virtanen', clubId: '757' }), true)

    const afterReload = createFavoritesStore(() => phone)
    const items = afterReload.getSnapshot()
    assert.deepEqual(items.map((f) => `${f.kind}:${f.id}`), ['player:19202', 'team:6055'])
    assert.ok(afterReload.isFavorite('team', '6055'))
    assert.equal(items[1].clubId, '757')
  })

  it('keeps the v1 key and reads existing saved favourites', () => {
    const legacy = JSON.stringify([
      { kind: 'team', id: 'https://salibandy.fi/tulospalvelu/joukkueet/25301', name: 'Old team', subtitle: 'P14' },
      { kind: 'club', id: '757', name: 'Westend Indians' },
      { kind: 'player', id: '12345', name: 'Old player' },
    ])
    const store = createFavoritesStore(() => memoryStorage({ [FAVORITES_KEY]: legacy }))
    assert.deepEqual(
      store.getSnapshot().map((f) => [f.kind, f.id, f.clubId]),
      [
        ['team', '25301', undefined],
        ['club', '757', '757'],
        ['player', '12345', undefined],
      ],
    )
  })

  it('drops non-numeric ids for every kind and rejects them on toggle', () => {
    const parsed = parseFavorites(
      JSON.stringify([
        { kind: 'team', id: 'westend-indians', name: 'Sample' },
        { kind: 'player', id: 'abc', name: 'Sample' },
        { kind: 'club', id: '', name: 'Sample' },
        { kind: 'league', id: '1', name: 'Nope' },
        { kind: 'player', id: '7', name: '' },
      ]),
    )
    assert.deepEqual(parsed, [])
    const phone = memoryStorage()
    const store = createFavoritesStore(() => phone)
    assert.equal(store.toggle({ kind: 'player', id: 'abc', name: 'X' }), false)
    assert.equal(phone.getItem(FAVORITES_KEY), null)
  })

  it('toggling twice removes, and listeners hear every change', () => {
    const phone = memoryStorage()
    const store = createFavoritesStore(() => phone)
    let heard = 0
    const off = store.subscribe(() => heard++)
    store.toggle({ kind: 'team', id: '6055', name: 'Westend Indians' })
    const snap = store.getSnapshot()
    assert.equal(store.getSnapshot(), snap, 'snapshot is stable between changes')
    store.toggle({ kind: 'team', id: '6055', name: 'Westend Indians' })
    off()
    assert.equal(heard, 2)
    assert.deepEqual(JSON.parse(phone.getItem(FAVORITES_KEY)), [])
  })

  it('refresh picks up a change written by another tab', () => {
    const phone = memoryStorage()
    const tabA = createFavoritesStore(() => phone)
    const tabB = createFavoritesStore(() => phone)
    assert.deepEqual(tabB.getSnapshot(), [])
    tabA.toggle({ kind: 'club', id: '757', name: 'Westend Indians' })
    tabB.refresh()
    assert.deepEqual(tabB.getSnapshot().map((f) => f.id), ['757'])
  })
})
