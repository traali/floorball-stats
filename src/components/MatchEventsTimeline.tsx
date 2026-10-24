import { useEffect, useState } from 'react'
import { fetchRawMatch } from '../services/salibandyApi'
import { buildTimeline, isLiveStatus, type TimelinePeriod } from '../utils/matchEvents'

const REFRESH_MS = 30_000

export function MatchEventsTimeline({ matchId, homeName, awayName }: { matchId: string; homeName: string; awayName: string }) {
  const [periods, setPeriods] = useState<TimelinePeriod[] | null>(null)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const raw = await fetchRawMatch(matchId)
        if (!alive) return
        setPeriods(raw ? buildTimeline(raw) : [])
        const isLive = isLiveStatus(raw?.status)
        setLive(isLive)
        if (isLive) timer = setTimeout(load, REFRESH_MS)
      } catch { if (alive) setPeriods((p) => p ?? []) }
    }
    load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [matchId])

  if (!periods || periods.length === 0) return null
  const team = (s: 'A' | 'B' | null) => (s === 'A' ? homeName : s === 'B' ? awayName : '')
  return (
    <section data-testid="match-events" className="rounded-2xl bg-[#1C2541] border border-slate-700/80 p-3 space-y-3">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">Ottelun tapahtumat {live && <span data-testid="match-events-live" className="text-[10px] font-semibold text-[#6FFFE9]">● päivittyy 30 s välein</span>}</h3>
      {periods.map((p) => (
        <div key={p.period} data-testid={`match-events-period-${p.period}`} className="space-y-1">
          <h4 className="text-[11px] uppercase tracking-wide text-slate-400 font-bold border-b border-slate-700/60 pb-0.5">{p.label}</h4>
          <ul className="space-y-1">
            {p.items.map((it) => (
              <li key={it.id + it.kind} className="text-xs text-slate-200 flex gap-2">
                <span className="w-12 shrink-0 tabular-nums text-slate-400">{it.time}</span>
                {it.kind === 'goal' && <span data-testid="ev-goal"><b className="text-[#6FFFE9]">Maali {it.score ?? ''}</b> {team(it.side)}: {it.scorer}{it.assist && <span className="text-slate-400"> (syöttö {it.assist})</span>}{it.goalie && <span className="text-slate-500"> · päästi {it.goalie}</span>}</span>}
                {it.kind === 'penalty' && <span data-testid="ev-penalty"><b className="text-amber-300">{it.minutes}</b> {team(it.side)}: {it.player}{it.reason && <span className="text-slate-400"> · {it.reason}{it.reasonText ? ` (${it.reasonText})` : ''}</span>}</span>}
                {it.kind === 'goalie' && <span data-testid="ev-goalie"><b className="text-sky-300">MV-vaihto</b> {team(it.side)}: {it.player}{it.note && <span className="text-slate-400"> · {it.note}</span>}</span>}
                {it.kind === 'marker' && <span className="text-slate-500 italic">{it.label}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
