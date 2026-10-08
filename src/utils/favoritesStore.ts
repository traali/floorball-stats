/**
 * Favourite teams, players and clubs, saved on the device (localStorage).
 * One store per page: every component reads the same list, and a change in
 * another tab arrives through the `storage` event.
 */

export type FavKind = 'team' | 'player' | 'club'

export interface FavoriteItem {
  kind: FavKind
  id: string
  name: string
  subtitle?: string
  /** Club behind a team or player; lets search look through that club's players. */
  clubId?: string
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export const FAVORITES_KEY = 'floorball.favorites.v1'
export const MAX_FAVORITES = 40
const KINDS: ReadonlySet<string> = new Set(['team', 'player', 'club'])
const ID_RE = /^\d+$/

/** A TASO id, from a bare number or a salibandy.fi / app URL. */
export function parseFavoriteId(kind: FavKind, value: unknown): string | undefined {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  if (ID_RE.test(text)) return text
  const re =
    kind === 'team'
      ? /(?:team_id=|[?&]team=|\/team\/|\/joukkueet\/)(\d+)/i
      : kind === 'player'
        ? /(?:player_id=|\/player\/|\/pelaajat\/)(\d+)/i
        : /(?:club_id=|\/club\/|\/seurat\/)(\d+)/i
  return text.match(re)?.[1]
}

/** Read the saved JSON, keeping only well-formed items with numeric ids. */
export function parseFavorites(raw: string | null): FavoriteItem[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const out: FavoriteItem[] = []
  const seen = new Set<string>()
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const rec = entry as Record<string, unknown>
    const kind = String(rec.kind || '')
    if (!KINDS.has(kind)) continue
    const id = parseFavoriteId(kind as FavKind, rec.id)
    const name = String(rec.name ?? '').trim()
    if (!id || !name) continue
    const key = `${kind}:${id}`
    if (seen.has(key)) continue
    seen.add(key)
    const clubId = kind === 'club' ? id : parseFavoriteId('club', rec.clubId)
    out.push({
      kind: kind as FavKind,
      id,
      name,
      ...(rec.subtitle ? { subtitle: String(rec.subtitle) } : {}),
      ...(clubId ? { clubId } : {}),
    })
  }
  return out.slice(0, MAX_FAVORITES)
}

export interface FavoritesStore {
  getSnapshot: () => FavoriteItem[]
  subscribe: (listener: () => void) => () => void
  toggle: (item: FavoriteItem) => boolean
  isFavorite: (kind: FavKind, id: string) => boolean
  /** Re-read storage (another tab wrote it). */
  refresh: () => void
}

const EMPTY: FavoriteItem[] = []

export function createFavoritesStore(getStorage: () => StorageLike | null | undefined): FavoritesStore {
  let items: FavoriteItem[] | null = null
  const listeners = new Set<() => void>()

  const load = (): FavoriteItem[] => {
    try {
      return parseFavorites(getStorage()?.getItem(FAVORITES_KEY) ?? null)
    } catch {
      return EMPTY
    }
  }
  const emit = () => listeners.forEach((l) => l())

  const store: FavoritesStore = {
    getSnapshot() {
      if (items === null) items = load()
      return items
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    isFavorite(kind, id) {
      return store.getSnapshot().some((f) => f.kind === kind && f.id === id)
    },
    toggle(item) {
      const id = parseFavoriteId(item.kind, item.id)
      const name = String(item.name ?? '').trim()
      if (!KINDS.has(item.kind) || !id || !name) return false
      const current = store.getSnapshot()
      const exists = current.some((f) => f.kind === item.kind && f.id === id)
      const clubId = item.kind === 'club' ? id : parseFavoriteId('club', item.clubId)
      const clean: FavoriteItem = {
        kind: item.kind,
        id,
        name,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}),
        ...(clubId ? { clubId } : {}),
      }
      const next = exists
        ? current.filter((f) => !(f.kind === item.kind && f.id === id))
        : [clean, ...current].slice(0, MAX_FAVORITES)
      items = next
      try {
        getStorage()?.setItem(FAVORITES_KEY, JSON.stringify(next))
      } catch {
        /* quota or private mode: the list still holds for this visit */
      }
      emit()
      return !exists
    },
    refresh() {
      items = load()
      emit()
    },
  }
  return store
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export const favoritesStore = createFavoritesStore(browserStorage)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === FAVORITES_KEY) favoritesStore.refresh()
  })
}

let persistAsked = false
/** Ask the browser not to evict our storage (Safari/Chrome may grant it). */
export function requestPersistentStorage() {
  if (persistAsked) return
  persistAsked = true
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (storage?.persist) {
      storage
        .persisted()
        .then((already) => (already ? true : storage.persist()))
        .catch(() => undefined)
    }
  } catch {
    /* not supported */
  }
}
