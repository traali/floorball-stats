import { useEffect, useState } from 'react'
import { getTasoFailure, TASO_FAILURE_EVENT, type TasoFailure } from '../services/salibandyApi'

/** Shown while the last TASO call failed (403, «Not allowed …», non-JSON). */
export function TasoErrorBanner() {
  const [failure, setFailure] = useState<TasoFailure | null>(getTasoFailure())
  useEffect(() => {
    const on = (e: Event) => setFailure((e as CustomEvent<TasoFailure | null>).detail ?? null)
    window.addEventListener(TASO_FAILURE_EVENT, on)
    return () => window.removeEventListener(TASO_FAILURE_EVENT, on)
  }, [])
  if (!failure) return null
  return (
    <div role="alert" data-testid="taso-error" className="mx-3 my-2 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3 py-2 text-xs text-rose-200">
      Salibandyliiton tulospalvelu hylkäsi haun ({failure.status || 'verkko'}
      {failure.body ? ` · «${failure.body.slice(0, 40)}»` : ''}). Tiedot voivat puuttua — ne eivät ole tyhjiä.
    </div>
  )
}
