import { withShirt } from '../utils/shirt'
import React from 'react'
import type { SalibandyGoalkeeperStats } from '../types/salibandy'
import { Shield } from 'lucide-react'

interface GoalkeeperBattleCardProps {
  goalkeepers: SalibandyGoalkeeperStats
  homeTeamName: string
  awayTeamName: string
}

export const GoalkeeperBattleCard: React.FC<GoalkeeperBattleCardProps> = ({
  goalkeepers,
  homeTeamName,
  awayTeamName,
}) => {
  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#5BC0BE]" />
          Maalivahdit (torjunnat & päästetyt)
        </h3>
        <span className="text-xs text-slate-400">Torjuntatilastot</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Home Goalie */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[120px]">{homeTeamName}</span>
          <div className="font-bold text-sm text-slate-200 mt-1">{withShirt(goalkeepers.home.goalieName, goalkeepers.home.shirtNumber)}</div>
          <div className="mt-3 bg-[#1C2541] px-3 py-1.5 rounded-lg border border-slate-700 w-full flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Torjunnat</span>
              <span className="font-bold text-emerald-400 text-sm">{goalkeepers.home.saves ?? <span data-testid="saves-not-recorded" className="text-slate-400 font-semibold text-xs">– (ei kirjattu)</span>}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700"></div>
            <div>
              <span className="text-[10px] text-slate-400 block">Päästetyt</span>
              <span className="font-bold text-rose-400 text-sm">{goalkeepers.home.goalsConceded}</span>
            </div>
          </div>
        </div>

        {/* Away Goalie */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-[#5BC0BE] truncate max-w-[120px]">{awayTeamName}</span>
          <div className="font-bold text-sm text-slate-200 mt-1">{withShirt(goalkeepers.away.goalieName, goalkeepers.away.shirtNumber)}</div>
          <div className="mt-3 bg-[#1C2541] px-3 py-1.5 rounded-lg border border-slate-700 w-full flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Torjunnat</span>
              <span className="font-bold text-emerald-400 text-sm">{goalkeepers.away.saves ?? <span data-testid="saves-not-recorded" className="text-slate-400 font-semibold text-xs">– (ei kirjattu)</span>}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700"></div>
            <div>
              <span className="text-[10px] text-slate-400 block">Päästetyt</span>
              <span className="font-bold text-rose-400 text-sm">{goalkeepers.away.goalsConceded}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
