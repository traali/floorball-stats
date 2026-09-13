import { useEffect, useState } from 'react'
import { fetchSalibandyPlayer } from '../services/salibandyApi'
import type { SalibandyPlayerProfile } from '../types/salibandy'

export function useRosterPlayerForms(playerIds: string[]) {
  const [byId, setById] = useState<Record<string, SalibandyPlayerProfile>>({})

  useEffect(() => {
    const unique = [...new Set(playerIds.filter(Boolean))]
    if (!unique.length) {
      setById({})
      return
    }
    let cancelled = false
    const out: Record<string, SalibandyPlayerProfile> = {}
    ;(async () => {
      const conc = 4
      for (let i = 0; i < unique.length; i += conc) {
        const chunk = unique.slice(i, i + conc)
        const rows = await Promise.all(chunk.map((id) => fetchSalibandyPlayer(id)))
        if (cancelled) return
        chunk.forEach((id, j) => {
          if (rows[j]) out[id] = rows[j]!
        })
        setById({ ...out })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playerIds.join('|')])

  return byId
}
