import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, User, Star } from 'lucide-react'
import type { SalibandyRosterPlayer } from '../types/salibandy'

function Column({
  teamName,
  roster,
}: {
  teamName: string
  roster: SalibandyRosterPlayer[]
}) {
  const navigate = useNavigate()
  const rows = [...roster].sort((a, b) => b.points - a.points || b.goals - a.goals)
  return (
    <div className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#5BC0BE]" />
          {teamName}
        </h3>
        <span className="text-[11px] text-slate-400">{rows.length} pelaajaa · kausi G+A</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">Kokoonpanoa ei saatu SSBL:stä.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((p) => (
            <li key={p.playerId}>
              <button
                type="button"
                onClick={() => navigate(`/player/${p.playerId}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#0B132B]/70 text-left"
              >
                <span className="w-7 text-[11px] font-bold text-slate-500 tabular-nums">
                  {p.shirtNumber ? `#${p.shirtNumber}` : '—'}
                </span>
                <span className="flex-1 min-w-0 text-xs font-semibold text-slate-200 truncate">
                  {p.fullName || 'Pelaaja'}
                  {p.isCaptain ? (
                    <Star className="inline w-3 h-3 ml-1 text-amber-400" />
                  ) : null}
                </span>
                <span className="text-[11px] font-bold text-[#6FFFE9] tabular-nums">
                  {p.goals}+{p.assists}={p.points}p
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function EnnakkoRosters({
  homeName,
  awayName,
  homeRoster,
  awayRoster,
}: {
  homeName: string
  awayName: string
  homeRoster: SalibandyRosterPlayer[]
  awayRoster: SalibandyRosterPlayer[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <User className="w-4 h-4 text-[#5BC0BE]" />
        Ennakko — molempien joukkueiden pelaajat ja kauden pisteet (maalit+syötöt).
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Column teamName={homeName} roster={homeRoster} />
        <Column teamName={awayName} roster={awayRoster} />
      </div>
    </section>
  )
}
