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

  const homeYvPct = awayPenalties > 0 ? `${((homeYvGoals / awayPenalties) * 100).toFixed(0)}%` : '0%'
  const awayYvPct = homePenalties > 0 ? `${((awayYvGoals / homePenalties) * 100).toFixed(0)}%` : '50%'

  const homeAvPct = homePenalties > 0 ? `${(((homePenalties - homeAvGoalsAllowed) / homePenalties) * 100).toFixed(0)}%` : '100%'
  const awayAvPct = awayPenalties > 0 ? `${(((awayPenalties - awayAvGoalsAllowed) / awayPenalties) * 100).toFixed(0)}%` : '100%'

  // 2. Goal Momentum by Period
  const period1Diff = goals.filter(g => g.period === '1' && g.team === 'away').length - goals.filter(g => g.period === '1' && g.team === 'home').length
  const period2Diff = goals.filter(g => g.period === '2' && g.team === 'away').length - goals.filter(g => g.period === '2' && g.team === 'home').length
  const period3Diff = goals.filter(g => g.period === '3' && g.team === 'away').length - goals.filter(g => g.period === '3' && g.team === 'home').length

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
            <span className="font-bold text-emerald-400 text-sm">+{period1Diff} maalia</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <div className="p-2.5 bg-[#1C2541] rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">2. Erä Momentum</span>
            <span className="font-bold text-emerald-400 text-sm">+{period2Diff} maalia</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
          <div className="p-2.5 bg-[#1C2541] rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block">3. Erä Momentum</span>
            <span className="font-bold text-emerald-400 text-sm">+{period3Diff} maalia</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
