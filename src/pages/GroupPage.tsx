import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchSalibandyGroup, mapGroupTeamsToStandings } from '../services/salibandyApi'
import type { SalibandyGroupDetail } from '../types/salibandy'
import { FloorballStandingsTable } from '../components/FloorballStandingsTable'
import { decidedTitle, scoreWithSuffix } from '../utils/matchResult'
import { helsinkiDateISO } from '../utils/matchContext'
import { defaultGroupDay, groupDays, groupMatchScoreText } from '../utils/groupDays'

export function GroupPage() {
  const { compId = '', catId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState<SalibandyGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalibandyGroup(compId, catId, groupId)
      .then(setGroup)
      .finally(() => setLoading(false))
  }, [compId, catId, groupId])

  const standings = group ? mapGroupTeamsToStandings(group.teams, group.matches, group.standingsSent !== false) : []
  const matches = useMemo(() => group?.matches || [], [group])
  const days = useMemo(() => groupDays(matches), [matches])
  const [pickedDay, setPickedDay] = useState<string | undefined>()
  const day = pickedDay ?? defaultGroupDay(matches, helsinkiDateISO())
  const dayGames = matches.filter((m) => m.date === day)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <button type="button" onClick={() => navigate(`/competition/${compId}/category/${catId}`)} className="text-xs text-slate-400 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Sarja
      </button>
      {loading ? (
        <div className="animate-pulse h-40 rounded-2xl bg-[#1C2541]" />
      ) : group ? (
        <>
          <div>
            <h1 className="text-2xl font-black">{group.groupName}</h1>
            <p className="text-xs text-slate-400">{group.competitionName} · {group.categoryName}</p>
          </div>
          {days.length > 0 && (
            <section className="space-y-2" data-testid="group-games">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ottelut</h2>
              {days.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {days.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPickedDay(d)}
                      className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg font-semibold ${
                        d === day ? 'bg-[#3A506B] text-[#6FFFE9] border border-[#5BC0BE]/40' : 'bg-[#1C2541] text-slate-400'
                      }`}
                    >
                      {d.slice(8, 10)}.{d.slice(5, 7)}.
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500" data-testid="group-day">{day}</p>
              {dayGames.map((m) => {
                const live = m.state === 'live' || m.state === 'break'
                return (
                  <button
                    key={m.matchId}
                    type="button"
                    data-testid="group-game"
                    data-state={m.state || ''}
                    onClick={() => navigate(`/match/${m.matchId}`)}
                    className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-2.5 hover:border-[#5BC0BE]/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.homeTeam} – {m.awayTeam}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {m.time?.slice(0, 5)}
                        {m.venueName ? ` · ${m.venueName}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-[#6FFFE9] font-mono font-bold" title={decidedTitle(m.decidedBy)}>
                        {groupMatchScoreText(m, (h, a) => scoreWithSuffix(h, a, m.decidedBy))}
                      </p>
                      {live && (
                        <p className="text-[10px] font-bold text-rose-300">{m.state === 'break' ? 'Erätauko' : 'Käynnissä'}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </section>
          )}
          <FloorballStandingsTable standings={standings} />
        </>
      ) : (
        <p className="text-sm text-rose-400">Lohkoa ei löytynyt.</p>
      )}
    </div>
  )
}
