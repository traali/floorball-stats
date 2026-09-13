import { useNavigate } from 'react-router-dom'
import { Swords, History } from 'lucide-react'
import type { SalibandyTeamFixture } from '../types/salibandy'
import { commonOpponents, formLetter, headToHead, recentForm, type CommonRow } from '../utils/matchContext'

function Pill({ f }: { f?: SalibandyTeamFixture }) {
  if (!f?.score) return <span className="text-[11px] text-slate-500">–</span>
  const letter = formLetter(f)
  const cls =
    letter === 'V' ? 'text-emerald-300' : letter === 'H' ? 'text-rose-300' : 'text-slate-300'
  return (
    <span className={`font-mono text-xs font-bold ${cls}`}>
      {f.score} {letter}
    </span>
  )
}

function FormRow({ name, fixtures, excludeMatchId }: { name: string; fixtures: SalibandyTeamFixture[]; excludeMatchId?: string }) {
  const rows = recentForm(fixtures, excludeMatchId, 5)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold truncate">{name}</span>
      <span className="flex gap-1">
        {rows.length === 0 ? (
          <span className="text-[11px] text-slate-500">Ei pelattuja</span>
        ) : (
          rows.map((f) => {
            const l = formLetter(f)
            const bg = l === 'V' ? 'bg-emerald-500/80' : l === 'H' ? 'bg-rose-500/80' : 'bg-slate-500'
            return (
              <span
                key={f.matchId}
                title={`${f.date} ${f.homeTeam}–${f.awayTeam} ${f.score}`}
                className={`w-6 h-6 rounded-md ${bg} text-[11px] font-black text-white grid place-items-center`}
              >
                {l}
              </span>
            )
          })
        )}
      </span>
    </div>
  )
}

export function MatchFormAndHistory({
  homeName,
  awayName,
  homeId,
  awayId,
  homeFixtures,
  awayFixtures,
  excludeMatchId,
}: {
  homeName: string
  awayName: string
  homeId?: string
  awayId?: string
  homeFixtures: SalibandyTeamFixture[]
  awayFixtures: SalibandyTeamFixture[]
  excludeMatchId?: string
}) {
  const navigate = useNavigate()
  const h2h = headToHead(homeFixtures, awayId, awayName, excludeMatchId)
  const common: CommonRow[] = commonOpponents(homeFixtures, awayFixtures, homeId, awayId, excludeMatchId)

  return (
    <div className="space-y-4">
      <section className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
        <h3 className="font-bold text-sm mb-3">Edelliset ottelut</h3>
        <div className="space-y-2">
          <FormRow name={homeName} fixtures={homeFixtures} excludeMatchId={excludeMatchId} />
          <FormRow name={awayName} fixtures={awayFixtures} excludeMatchId={excludeMatchId} />
        </div>
        <p className="text-[10px] text-slate-500 mt-2">V = voitto, T = tasapeli, H = tappio · uusin vasemmalla</p>
      </section>

      <section className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-[#5BC0BE]" />
          Keskinäiset
        </h3>
        {h2h.length === 0 ? (
          <p className="text-xs text-slate-500">Ei aiempia kohtaamisia TASOssa.</p>
        ) : (
          <div className="space-y-2">
            {h2h.map((f) => (
              <button
                key={f.matchId}
                type="button"
                onClick={() => navigate(`/match/${f.matchId}`)}
                className="w-full text-left rounded-xl bg-[#0B132B]/70 border border-slate-800 px-3 py-2 flex items-center justify-between"
              >
                <span className="text-xs text-slate-300">
                  {f.date} · {f.homeTeam} – {f.awayTeam}
                </span>
                <span className="font-mono text-sm font-bold text-[#6FFFE9]">{f.score}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#5BC0BE]" />
          Yhteiset vastustajat
        </h3>
        {common.length === 0 ? (
          <p className="text-xs text-slate-500">Ei yhteisiä pelattuja vastustajia vielä tällä kaudella.</p>
        ) : (
          <div className="space-y-2">
            {common.map((row) => (
              <div key={row.opponent} className="rounded-xl bg-[#0B132B]/70 border border-slate-800 px-3 py-2">
                <p className="text-xs font-semibold text-slate-200 mb-1">{row.opponent}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate mr-2">{homeName}</span>
                  <Pill f={row.home} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate mr-2">{awayName}</span>
                  <Pill f={row.away} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/** @deprecated name kept for MatchPage tab */
export const CommonOpponents = MatchFormAndHistory
