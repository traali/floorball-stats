import React from 'react'
import { Swords, CheckCircle2, XCircle } from 'lucide-react'

interface OpponentMatch {
  teamName: string
  homeResult: { result: 'win' | 'draw' | 'loss'; score: string }
  awayResult: { result: 'win' | 'draw' | 'loss'; score: string }
}

interface CommonOpponentsProps {
  homeTeam: string
  awayTeam: string
}

export const CommonOpponents: React.FC<CommonOpponentsProps> = ({ homeTeam, awayTeam }) => {
  // Sample common opponents comparison from season schedule
  const commonList: OpponentMatch[] = [
    {
      teamName: 'EräViikingit Sininen',
      homeResult: { result: 'win', score: '8–4' },
      awayResult: { result: 'win', score: '11–2' },
    },
    {
      teamName: 'Oilers White',
      homeResult: { result: 'loss', score: '3–6' },
      awayResult: { result: 'win', score: '7–5' },
    },
    {
      teamName: 'Tiikerit Sininen',
      homeResult: { result: 'win', score: '9–5' },
      awayResult: { result: 'win', score: '12–3' },
    },
  ]

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#5BC0BE]" />
          Yhteiset Vastustajat & Kuntopuntari
        </h3>
        <span className="text-xs text-slate-400">Vertailu</span>
      </div>

      <div className="space-y-3">
        {commonList.map((opp) => (
          <div
            key={opp.teamName}
            className="p-3 rounded-xl bg-[#0B132B]/60 border border-slate-800 flex items-center justify-between"
          >
            <div className="font-bold text-xs text-slate-200">{opp.teamName}</div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] truncate max-w-[80px]">{homeTeam}:</span>
                <span className="font-bold text-slate-200">{opp.homeResult.score}</span>
                {opp.homeResult.result === 'win' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>

              <div className="h-4 w-[1px] bg-slate-700"></div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#5BC0BE] text-[11px] truncate max-w-[80px]">{awayTeam}:</span>
                <span className="font-bold text-slate-200">{opp.awayResult.score}</span>
                {opp.awayResult.result === 'win' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
