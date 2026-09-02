import React from 'react'
import type { SalibandyPlayerLeader } from '../types/salibandy'
import { Award } from 'lucide-react'

interface LeaderboardTableProps {
  leaders: SalibandyPlayerLeader[]
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ leaders }) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#F59E0B]" />
          Pistetilasto (Maalit + Syötöt)
        </h3>
        <span className="text-xs text-slate-400">Pelaajatilastot</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-2 px-3 font-semibold">Pelaaja</th>
              <th className="py-2 px-3 font-semibold">Joukkue</th>
              <th className="py-2 px-2 text-center font-semibold">M</th>
              <th className="py-2 px-2 text-center font-semibold">S</th>
              <th className="py-2 px-2 text-center font-semibold text-[#6FFFE9]">Pisteet</th>
              <th className="py-2 px-2 text-center font-semibold text-amber-400">RM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leaders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">Ei pelaajatilastoja saatavilla.</td>
              </tr>
            ) : (
              leaders.slice(0, 10).map((player, idx) => (
                <tr key={`${player.playerName}-${player.teamName}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-2">
                    <span className="font-mono text-slate-400">{idx + 1}.</span>
                    <span>{player.playerName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]">{player.teamName}</td>
                  <td className="py-2.5 px-2 text-center font-medium text-slate-300">{player.goals}</td>
                  <td className="py-2.5 px-2 text-center font-medium text-slate-300">{player.assists}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-[#6FFFE9] bg-[#3A506B]/20 rounded">
                    {player.points}
                  </td>
                  <td className="py-2.5 px-2 text-center text-amber-400/80">{player.penaltiesMin > 0 ? `${player.penaltiesMin}m` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
