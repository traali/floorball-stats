import React from 'react'
import type { SalibandyGoalEvent, SalibandyPenaltyEvent } from '../types/salibandy'
import { Zap, TrendingUp } from 'lucide-react'

interface SpecialTeamsCardProps {
  goals: SalibandyGoalEvent[]
  penalties: SalibandyPenaltyEvent[]
  homeTeamName: string
  awayTeamName: string
}

export const SpecialTeamsCard: React.FC<SpecialTeamsCardProps> = ({
  goals,
  penalties,
  homeTeamName,
  awayTeamName,
}) => {
  // 1. Calculate Powerplay & Penalty Kill
  const homePenalties = penalties.filter((p) => p.team === 'home').length
  const awayPenalties = penalties.filter((p) => p.team === 'away').length

  const homeYvGoals = goals.filter((g) => g.team === 'home' && g.isPowerplayGoal).length
  const awayYvGoals = goals.filter((g) => g.team === 'away' && g.isPowerplayGoal).length

  const homeAvGoalsAllowed = goals.filter((g) => g.team === 'away' && g.isPowerplayGoal).length
  const awayAvGoalsAllowed = goals.filter((g) => g.team === 'home' && g.isPowerplayGoal).length

  const dash = '–'
  const homeYvPct = awayPenalties > 0 ? `${((homeYvGoals / awayPenalties) * 100).toFixed(0)}%` : dash
  const awayYvPct = homePenalties > 0 ? `${((awayYvGoals / homePenalties) * 100).toFixed(0)}%` : dash

  const homeAvPct = homePenalties > 0 ? `${(((homePenalties - homeAvGoalsAllowed) / homePenalties) * 100).toFixed(0)}%` : dash
  const awayAvPct = awayPenalties > 0 ? `${(((awayPenalties - awayAvGoalsAllowed) / awayPenalties) * 100).toFixed(0)}%` : dash

  const periodGoals = (period: string) => goals.filter((g) => g.period === period).length
  const periodDiff = (period: string) =>
    goals.filter((g) => g.period === period && g.team === 'away').length -
    goals.filter((g) => g.period === period && g.team === 'home').length
  const momentum = (period: string) => {
    const count = periodGoals(period)
    if (count === 0) return { label: dash, width: 0 }
    const diff = periodDiff(period)
    const label = diff > 0 ? `+${diff} maalia` : diff < 0 ? `${diff} maalia` : '0'
    return { label, width: Math.min(100, Math.max(12, Math.abs(diff) * 25)) }
  }
  const p1 = momentum('1')
  const p2 = momentum('2')
  const p3 = momentum('3')

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#F59E0B]" />
          Erikoistilanteet (Ylivoima YV% & Alivoima AV%)
        </h3>
        <span className="text-xs text-slate-400">Torneopal Analytics</span>
      </div>

      {/* Special Teams Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Home Team Special Teams */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-200 block truncate">{homeTeamName}</span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-[#1C2541] p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Ylivoima (YV%)</span>
              <span className="font-bold text-[#6FFFE9] text-base">{homeYvPct}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{homeYvGoals}/{awayPenalties} YV</span>
            </div>
            <div className="bg-[#1C2541] p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Alivoima (AV%)</span>
              <span className="font-bold text-emerald-400 text-base">{homeAvPct}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{homePenalties} Jäähyä</span>
            </div>
          </div>
        </div>

        {/* Away Team Special Teams */}
        <div className="bg-[#0B132B]/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-[#5BC0BE] block truncate">{awayTeamName}</span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-[#1C2541] p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Ylivoima (YV%)</span>
              <span className="font-bold text-[#6FFFE9] text-base">{awayYvPct}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{awayYvGoals}/{homePenalties} YV</span>
            </div>
            <div className="bg-[#1C2541] p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Alivoima (AV%)</span>
              <span className="font-bold text-emerald-400 text-base">{awayAvPct}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{awayPenalties} Jäähyä</span>
            </div>
          </div>
        </div>
      </div>

      {/* Period Momentum Breakdown */}
      <div className="bg-[#0B132B]/80 p-4 rounded-xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Eräkohtainen Maalimomentum ({awayTeamName})
        </h4>

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2.5 bg-[#1C2541] rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">1. Erä Momentum</span>
            <span className="font-bold text-emerald-400 text-sm">{p1.label}</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${p1.width}%` }}></div>
            </div>
          </div>
          <div className="p-2.5 bg-[#1C2541] rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">2. Erä Momentum</span>
            <span className="font-bold text-emerald-400 text-sm">{p2.label}</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${p2.width}%` }}></div>
            </div>
          </div>
          <div className="p-2.5 bg-[#1C2541] rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">3. Erä Momentum</span>
            <span className="font-bold text-emerald-400 text-sm">{p3.label}</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${p3.width}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
