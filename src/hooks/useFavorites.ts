import { useCallback, useSyncExternalStore } from 'react'
import {
  favoritesStore,
  requestPersistentStorage,
  type FavKind,
  type FavoriteItem,
} from '../utils/favoritesStore.ts'

export type { FavKind, FavoriteItem }

const serverSnapshot: FavoriteItem[] = []

export function useFavorites() {
  const favorites = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.getSnapshot, () => serverSnapshot)

  const isFavorite = useCallback(
    (kind: FavKind, id: string) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  )

  const toggle = useCallback((item: FavoriteItem) => {
    const added = favoritesStore.toggle(item)
    if (added) requestPersistentStorage()
  }, [])

  return { favorites, isFavorite, toggle }
}

/** Clubs behind saved favourites, for searching their players by name. */
export function favoriteClubIds(favorites: FavoriteItem[]): string[] {
  const ids = favorites.map((f) => (f.kind === 'club' ? f.id : f.clubId)).filter((id): id is string => Boolean(id))
  return [...new Set(ids)]
}
