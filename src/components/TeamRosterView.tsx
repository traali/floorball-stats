import React from 'react'
import type { SalibandyRosterPlayer } from '../types/salibandy'
import { Users, User, Star } from 'lucide-react'

interface TeamRosterViewProps {
  roster: SalibandyRosterPlayer[]
  teamName: string
}

export const TeamRosterView: React.FC<TeamRosterViewProps> = ({ roster, teamName }) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#5BC0BE]" />
          {teamName} — Joukkueen Kokoonpano ({roster.length} Pelaajaa)
        </h3>
        <span className="text-xs text-slate-400">Virallinen SSBL pelaajalista</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {roster.map((player) => (
          <div
            key={player.playerId}
            className="p-3 rounded-xl bg-[#0B132B]/60 border border-slate-800 flex items-center gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-[#6FFFE9] border border-slate-700 overflow-hidden shrink-0">
              {player.imageUrl ? (
                <img
                  src={player.imageUrl}
                  alt={player.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback on missing image
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200 truncate">
                  {player.shirtNumber ? `#${player.shirtNumber} ` : ''}{player.fullName}
                </span>
                {player.isCaptain && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Star className="w-2.5 h-2.5" /> C
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>Synt. {player.birthYear || '2013'}</span>
                {player.points > 0 && (
                  <span className="font-bold text-[#6FFFE9]">
                    {player.goals}+{player.assists}={player.points}p
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
