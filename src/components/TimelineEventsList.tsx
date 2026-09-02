import React from 'react'
import type { SalibandyGoalEvent, SalibandyPenaltyEvent } from '../types/salibandy'
import { Goal, AlertTriangle, User } from 'lucide-react'

interface TimelineEventsListProps {
  goals: SalibandyGoalEvent[]
  penalties: SalibandyPenaltyEvent[]
}

export const TimelineEventsList: React.FC<TimelineEventsListProps> = ({ goals, penalties }) => {
  // Merge and sort events by period and time
  const combined = [
    ...goals.map(g => ({ type: 'goal' as const, data: g, timeSec: parseTimeToSeconds(g.time), period: Number(g.period) })),
    ...penalties.map(p => ({ type: 'penalty' as const, data: p, timeSec: parseTimeToSeconds(p.time), period: Number(p.period) })),
  ].sort((a, b) => a.period - b.period || a.timeSec - b.timeSec)

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Goal className="w-4 h-4 text-[#5BC0BE]" />
          Ottelutapahtumat & Aikajana
        </h3>
        <span className="text-xs text-slate-400">{goals.length} Maalia • {penalties.length} Rangaistusta</span>
      </div>

      <div className="space-y-3">
        {combined.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Ei kirjattuja tapahtumia.</p>
        ) : (
          combined.map((item, idx) => {
            if (item.type === 'goal') {
              const g = item.data as SalibandyGoalEvent
              return (
                <div
                  key={`goal-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B132B]/60 border border-slate-700/40 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#5BC0BE] bg-[#3A506B]/30 px-2 py-1 rounded">
                      {g.time}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          {g.scorerShirtNumber ? `#${g.scorerShirtNumber} ` : ''}{g.scorerName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {g.scoreHome} – {g.scoreAway}
                        </span>
                      </div>
                      {g.assistName && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-500" />
                          Syöttäjä: {g.assistName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {g.period}. Erä
                  </span>
                </div>
              )
            } else {
              const p = item.data as SalibandyPenaltyEvent
              return (
                <div
                  key={`pen-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                      {p.time}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-200">
                          {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.playerName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300/80 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Syy: {p.reasonText || p.reasonCode}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400/70">
                    {p.period}. Erä
                  </span>
                </div>
              )
            }
          })
        )}
      </div>
    </div>
  )
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1])
  }
  return 0
}
