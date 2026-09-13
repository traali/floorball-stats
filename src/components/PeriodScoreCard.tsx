import { useNavigate } from 'react-router-dom'
import type { SalibandyMatchDetail, SalibandyTeamFixture } from '../types/salibandy'
import { MapPin, Calendar, Clock, Trophy } from 'lucide-react'
import { formatClock, isKickoffUpcoming } from '../utils/matchContext'

export function PeriodScoreCard({
  match,
  dayGames = [],
}: {
  match: SalibandyMatchDetail
  dayGames?: SalibandyTeamFixture[]
}) {
  const navigate = useNavigate()
  const upcoming = match.phase === 'upcoming'
  const live = match.phase === 'live'
  const isHomeWinner = !upcoming && !live && match.scoreHome > match.scoreAway
  const isAwayWinner = !upcoming && !live && match.scoreAway > match.scoreHome
  const clock = formatClock(match.time) || match.time
  const pool = dayGames.length >= 2 ? dayGames : []

  const badge = upcoming
    ? { label: 'Ennakko', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30' }
    : live
      ? { label: 'Käynnissä', className: 'text-rose-300 bg-rose-500/10 border-rose-500/30' }
      : { label: 'Lopputulos (3 erää)', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }

  return (
    <div className="bg-[#1C2541] rounded-2xl p-4 sm:p-6 border border-slate-700/60 shadow-xl">
      <div className="flex flex-col gap-2 text-xs text-slate-400 mb-4 pb-3 border-b border-slate-700/50">
        <span className="font-semibold text-[#5BC0BE] tracking-wide leading-snug">
          {match.competitionName}
          {match.categoryName ? ` · ${match.categoryName}` : ''}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {match.date}</span>
          {clock ? (
            <span className="flex items-center gap-1 text-base font-black text-[#6FFFE9] tabular-nums">
              <Clock className="w-4 h-4" /> {clock}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center my-3">
        <div className="flex flex-col items-center min-w-0 px-1">
          {match.homeTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.homeTeamId}`)}
              className="font-bold text-sm sm:text-lg text-slate-100 hover:text-[#6FFFE9] leading-tight break-words"
            >
              {match.homeTeamName}
            </button>
          ) : (
            <h2 className="font-bold text-sm sm:text-lg text-slate-100 leading-tight break-words">{match.homeTeamName}</h2>
          )}
          <span className="text-[10px] text-slate-400 mt-0.5">Koti</span>
          {isHomeWinner && (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <Trophy className="w-3 h-3" /> Voittaja
            </span>
          )}
        </div>

        <div className="flex flex-col items-center shrink-0">
          <div className="bg-[#0B132B] px-3 sm:px-5 py-2.5 rounded-2xl border border-slate-700/80">
            <div className="text-2xl sm:text-4xl font-black tracking-wide text-[#6FFFE9] tabular-nums">
              {upcoming ? 'vs' : `${match.scoreHome}–${match.scoreAway}`}
            </div>
          </div>
          <span className={`text-[11px] font-medium mt-2 px-2.5 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex flex-col items-center min-w-0 px-1">
          {match.awayTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.awayTeamId}`)}
              className="font-bold text-sm sm:text-lg text-[#6FFFE9] hover:underline leading-tight break-words"
            >
              {match.awayTeamName}
            </button>
          ) : (
            <h2 className="font-bold text-sm sm:text-lg text-[#6FFFE9] leading-tight break-words">{match.awayTeamName}</h2>
          )}
          <span className="text-[10px] text-slate-400 mt-0.5">Vieras</span>
          {isAwayWinner && (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <Trophy className="w-3 h-3" /> Voittaja
            </span>
          )}
        </div>
      </div>

      {pool.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#0B132B]/80 border border-slate-800 p-3 space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Päivän ottelut
          </h3>
          {pool.map((g) => {
            const here = g.matchId === match.matchId
            const t = formatClock(g.time) || g.time
            const unplayed = !g.score || isKickoffUpcoming(g.date, g.time)
            return (
              <button
                key={g.matchId}
                type="button"
                onClick={() => !here && navigate(`/match/${g.matchId}`)}
                className={`w-full text-left rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 ${
                  here ? 'bg-[#3A506B]/70 border border-[#5BC0BE]/40' : 'bg-[#1C2541] border border-slate-700/50'
                }`}
              >
                <span className="min-w-0">
                  <span className="font-black tabular-nums text-[#6FFFE9] mr-2">{t}</span>
                  <span className="text-xs font-semibold text-slate-100 break-words">
                    {g.homeTeam} – {g.awayTeam}
                  </span>
                  {here ? <span className="ml-1 text-[10px] text-amber-300">tämä</span> : null}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-300">
                  {unplayed ? 'vs' : g.score}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!upcoming && !live && (
        <div className="mt-4 bg-[#0B132B]/80 rounded-xl p-3 border border-slate-800">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Erät</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {match.periods.map((p) => (
              <div key={p.period} className="bg-[#1C2541] p-2 rounded-xl border border-slate-700/50">
                <div className="text-[10px] font-medium text-slate-400">{p.period}. erä</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5 tabular-nums">
                  {p.scoreHome}–{p.scoreAway}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300 min-w-0">
          <MapPin className="w-4 h-4 text-[#5BC0BE] shrink-0" />
          <span className="truncate">{match.venueName}</span>
        </span>
        <span className="text-slate-500">#{match.matchNumber || match.matchId}</span>
      </div>
    </div>
  )
}
