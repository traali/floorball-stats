import { useCallback, useEffect, useState } from 'react'

export type FavKind = 'team' | 'player' | 'club'

export interface FavoriteItem {
  kind: FavKind
  id: string
  name: string
  subtitle?: string
}

const KEY = 'floorball.favorites.v1'

function read(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items: FavoriteItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)))
  } catch {
    /* quota */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  useEffect(() => {
    setFavorites(read())
  }, [])

  const isFavorite = useCallback(
    (kind: FavKind, id: string) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  )

  const toggle = useCallback((item: FavoriteItem) => {
    setFavorites((current) => {
      const exists = current.some((f) => f.kind === item.kind && f.id === item.id)
      const next = exists
        ? current.filter((f) => !(f.kind === item.kind && f.id === item.id))
        : [item, ...current]
      write(next)
      return next
    })
  }, [])

  return { favorites, isFavorite, toggle }
}
