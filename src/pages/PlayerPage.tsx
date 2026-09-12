import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { fetchSalibandyPlayer, fetchSalibandyTeamFixtures } from '../services/salibandyApi'
import type { SalibandyPlayerProfile, SalibandyTeamFixture } from '../types/salibandy'
import { useFavorites } from '../hooks/useFavorites'

type Box = { result: 'V' | 'T' | 'H' | 'DNP'; date: string; opponent: string; matchId: string }

function GameBoxes({ boxes }: { boxes: Box[] }) {
  if (!boxes.length) return null
  const shown = boxes.slice(0, 18)
  return (
    <div>
      <p className="text-[11px] text-slate-400 mb-1">Ottelut uusin ensin · harmaa = ei pelannut</p>
      <span className="inline-flex items-center flex-wrap gap-0.5">
        {shown.map((d, i) => {
          const cls =
            d.result === 'V' ? 'bg-emerald-400' :
            d.result === 'H' ? 'bg-rose-400' :
            d.result === 'T' ? 'bg-slate-500' :
            'bg-slate-700 border border-slate-500'
          return (
            <span
              key={`${d.matchId}-${i}`}
              title={`${d.date} · ${d.opponent} · ${d.result === 'DNP' ? 'ei pelannut' : d.result}`}
              className={`inline-block w-2.5 h-2.5 rounded-[3px] ${cls}`}
            />
          )
        })}
      </span>
    </div>
  )
}

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [player, setPlayer] = useState<SalibandyPlayerProfile | null>(null)
  const [fixtures, setFixtures] = useState<SalibandyTeamFixture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const p = await fetchSalibandyPlayer(playerId)
      if (cancelled) return
      setPlayer(p)
      const teamId = p?.teams[0]?.teamId
      if (teamId) {
        const fx = await fetchSalibandyTeamFixtures(teamId)
        if (!cancelled) setFixtures(fx)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  const boxes: Box[] = useMemo(() => {
    if (!player) return []
    const playedIds = new Set(player.matches.map((m) => m.matchId))
    return [...fixtures]
      .filter((f) => f.score)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .map((f) => {
        const opponent = f.isHome ? f.awayTeam : f.homeTeam
        const result: Box['result'] = !playedIds.has(f.matchId) ? 'DNP' : f.isWin ? 'V' : f.isDraw ? 'T' : 'H'
        return { result, date: f.date, opponent, matchId: f.matchId }
      })
  }, [player, fixtures])

  const rows = useMemo(() => {
    if (!player) return []
    const playedIds = new Set(player.matches.map((m) => m.matchId))
    const fromTeam = [...fixtures]
      .filter((f) => f.score)
      .map((f) => {
        const pm = player.matches.find((m) => m.matchId === f.matchId)
        return {
          matchId: f.matchId,
          date: f.date,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          scoreHome: f.scoreHome,
          scoreAway: f.scoreAway,
          categoryName: f.categoryName,
          goals: pm?.goals ?? 0,
          assists: pm?.assists ?? 0,
          dnp: !playedIds.has(f.matchId),
        }
      })
    return fromTeam.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)
  }, [player, fixtures])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan pelaajaa…</div>
  if (!player) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Pelaajaa ei löytynyt.</div>

  const fav = isFavorite('player', player.playerId)
  const seasonG = player.matches.reduce((s, m) => s + m.goals, 0)
  const seasonA = player.matches.reduce((s, m) => s + m.assists, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="text-xs text-slate-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Takaisin
          </button>
          <h1 className="text-2xl font-black">{player.fullName}</h1>
          <p className="text-xs text-slate-400">
            {player.clubName || player.teams[0]?.clubName || 'Pelaaja'}
            {player.birthYear ? ` · s. ${player.birthYear}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle({ kind: 'player', id: player.playerId, name: player.fullName, subtitle: player.teams[0]?.teamName })}
          className={`p-2 rounded-full border ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#1C2541] border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Maalit</div>
          <div className="text-xl font-black text-[#6FFFE9]">{seasonG}</div>
        </div>
        <div className="rounded-xl bg-[#1C2541] border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Syötöt</div>
          <div className="text-xl font-black text-[#6FFFE9]">{seasonA}</div>
        </div>
        <div className="rounded-xl bg-[#1C2541] border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Pisteet</div>
          <div className="text-xl font-black">{seasonG + seasonA}</div>
        </div>
      </div>

      <GameBoxes boxes={boxes} />

      {player.teams.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Joukkueet</h2>
          {player.teams.map((t) => (
            <button
              key={t.teamId}
              type="button"
              onClick={() => navigate(`/team/${t.teamId}`)}
              className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 hover:border-[#5BC0BE]/50"
            >
              <p className="text-sm font-semibold">{t.teamName}{t.shirtNumber ? ` · #${t.shirtNumber}` : ''}</p>
              <p className="text-[11px] text-slate-400">{t.categoryName}</p>
            </button>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ottelut · uusin ensin</h2>
        {rows.map((m) => (
          <button
            key={m.matchId}
            type="button"
            onClick={() => navigate(`/match/${m.matchId}`)}
            className={`w-full text-left rounded-xl border px-3 py-3 flex items-center justify-between ${
              m.dnp ? 'border-slate-800 bg-slate-900/40 text-slate-500' : 'border-slate-800 bg-[#1C2541] hover:border-[#5BC0BE]/50'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{m.homeTeam} – {m.awayTeam}</p>
              <p className="text-[11px] text-slate-400">{m.date} · {m.categoryName}</p>
            </div>
            <div className="text-right">
              {m.dnp ? (
                <p className="text-[11px] font-bold text-slate-500">Ei pelannut</p>
              ) : (
                <>
                  {m.scoreHome != null ? (
                    <p className="font-mono text-sm font-bold text-[#6FFFE9]">{m.scoreHome}–{m.scoreAway}</p>
                  ) : null}
                  <p className="text-[11px] text-slate-400">{m.goals}+{m.assists}</p>
                </>
              )}
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}
