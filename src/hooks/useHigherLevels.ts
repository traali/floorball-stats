import { useEffect, useState } from 'react'
import { fetchPlayerHistory } from '../services/salibandyApi'
import { higherLevels, seasonIdFor, type HigherLevel } from '../utils/playerLevels'

/** Lazily loads cached getPlayer histories (4 at a time) and returns older-age-group series per player. */
export function useHigherLevels(playerIds: string[], currentCategory: string, matchDate: string) {
  const [byId, setById] = useState<Record<string, HigherLevel[]>>({})
  const key = `${playerIds.join('|')}#${currentCategory}#${matchDate}`

  useEffect(() => {
    const unique = [...new Set(playerIds.filter(Boolean))]
    if (!unique.length || !currentCategory || !matchDate) return
    const season = seasonIdFor(matchDate)
    let cancelled = false
    const out: Record<string, HigherLevel[]> = {}
    let next = 0
    const worker = async () => {
      while (!cancelled && next < unique.length) {
        const id = unique[next++]
        const rows = await fetchPlayerHistory(id).catch(() => null)
        if (cancelled) return
        if (rows) {
          const hl = higherLevels(rows, season, currentCategory)
          if (hl.length) {
            out[id] = hl
            setById({ ...out })
          }
        }
      }
    }
    void Promise.all([worker(), worker(), worker(), worker()])
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return byId
}
