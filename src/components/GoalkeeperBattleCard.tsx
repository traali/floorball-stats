import React from 'react'
import type { SalibandyGoalkeeperStats } from '../types/salibandy'
import { Shield, Award } from 'lucide-react'

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
          Maalivahtien Taistelu (Torjunnat & T%)
        </h3>
        <span className="text-xs text-slate-400">Torjuntatilastot</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Home Goalie */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[120px]">{homeTeamName}</span>
          <div className="font-bold text-sm text-slate-200 mt-1">{goalkeepers.home.goalieName}</div>
          <div className="mt-3 bg-[#1C2541] px-3 py-1.5 rounded-lg border border-slate-700 w-full flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Torjunnat</span>
              <span className="font-bold text-emerald-400 text-sm">{goalkeepers.home.saves}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700"></div>
            <div>
              <span className="text-[10px] text-slate-400 block">Päästetyt</span>
              <span className="font-bold text-rose-400 text-sm">{goalkeepers.home.goalsConceded}</span>
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold text-[#6FFFE9]">
            Torjuntaprosentti: {goalkeepers.home.savePercentage}
          </div>
        </div>

        {/* Away Goalie */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-[#5BC0BE] truncate max-w-[120px]">{awayTeamName}</span>
          <div className="font-bold text-sm text-slate-200 mt-1">{goalkeepers.away.goalieName}</div>
          <div className="mt-3 bg-[#1C2541] px-3 py-1.5 rounded-lg border border-slate-700 w-full flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Torjunnat</span>
              <span className="font-bold text-emerald-400 text-sm">{goalkeepers.away.saves}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700"></div>
            <div>
              <span className="text-[10px] text-slate-400 block">Päästetyt</span>
              <span className="font-bold text-rose-400 text-sm">{goalkeepers.away.goalsConceded}</span>
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold text-[#6FFFE9] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Torjuntaprosentti: {goalkeepers.away.savePercentage}
          </div>
        </div>
      </div>
    </div>
  )
}
