import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { SalibandyMatchDetail } from '../types/salibandy'
import { MapPin, Calendar, Clock, Trophy } from 'lucide-react'

interface PeriodScoreCardProps {
  match: SalibandyMatchDetail
}

export const PeriodScoreCard: React.FC<PeriodScoreCardProps> = ({ match }) => {
  const navigate = useNavigate()
  const future = Boolean(match.date && match.date > new Date().toISOString().slice(0, 10))
  const upcoming = match.phase === 'upcoming' || future
  const live = match.phase === 'live' && !future
  const isHomeWinner = !upcoming && !live && match.scoreHome > match.scoreAway
  const isAwayWinner = !upcoming && !live && match.scoreAway > match.scoreHome

  const badge = upcoming
    ? { label: 'Ennakko', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30' }
    : live
      ? { label: 'Käynnissä', className: 'text-rose-300 bg-rose-500/10 border-rose-500/30' }
      : { label: 'Lopputulos (3 erää)', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }

  return (
    <div className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-700/50">
        <span className="font-semibold text-[#5BC0BE] tracking-wide">{match.competitionName} • {match.categoryName}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {match.date}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {match.time}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 items-center text-center my-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl mb-2 border border-slate-700">
            ⚪
          </div>
          {match.homeTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.homeTeamId}`)}
              className="font-bold text-base sm:text-lg text-slate-100 hover:text-[#6FFFE9]"
            >
              {match.homeTeamName}
            </button>
          ) : (
            <h2 className="font-bold text-base sm:text-lg text-slate-100">{match.homeTeamName}</h2>
          )}
          <span className="text-xs text-slate-400 mt-0.5">Kotijoukkue</span>
          {isHomeWinner && (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <Trophy className="w-3 h-3" /> Voittaja
            </span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-[#0B132B] px-5 py-3 rounded-2xl border border-slate-700/80 shadow-inner">
            <div className="text-3xl sm:text-4xl font-black tracking-widest text-[#6FFFE9]">
              {upcoming ? 'vs' : `${match.scoreHome} – ${match.scoreAway}`}
            </div>
          </div>
          <span className={`text-[11px] font-medium mt-2 px-2.5 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-xl mb-2 border border-amber-500/40">
            🟡
          </div>
          {match.awayTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.awayTeamId}`)}
              className="font-bold text-base sm:text-lg text-[#6FFFE9] hover:underline"
            >
              {match.awayTeamName}
            </button>
          ) : (
            <h2 className="font-bold text-base sm:text-lg text-[#6FFFE9]">{match.awayTeamName}</h2>
          )}
          <span className="text-xs text-slate-400 mt-0.5">Vierasjoukkue</span>
          {isAwayWinner && (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <Trophy className="w-3 h-3" /> Voittaja
            </span>
          )}
        </div>
      </div>

      {!upcoming && (
        <div className="mt-6 bg-[#0B132B]/80 rounded-xl p-4 border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Eräkohtaiset Tulokset</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {match.periods.map((p) => (
              <div key={p.period} className="bg-[#1C2541] p-3 rounded-xl border border-slate-700/50">
                <div className="text-[11px] font-medium text-slate-400">{p.period}. Erä</div>
                <div className="text-base font-bold text-slate-100 mt-1">
                  {p.scoreHome} – {p.scoreAway}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="w-4 h-4 text-[#5BC0BE]" />
          {match.venueName}
        </span>
        <span className="text-slate-400">Torneopal Match #{match.matchNumber || match.matchId}</span>
      </div>
    </div>
  )
}
