import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { fetchSalibandyPlayer } from '../services/salibandyApi'
import type { SalibandyPlayerProfile } from '../types/salibandy'
import { useFavorites } from '../hooks/useFavorites'

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const { isFavorite, toggle } = useFavorites()
  const [player, setPlayer] = useState<SalibandyPlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalibandyPlayer(playerId)
      .then(setPlayer)
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan pelaajaa…</div>
  if (!player) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Pelaajaa ei löytynyt.</div>

  const fav = isFavorite('player', player.playerId)
  const matches = [...player.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 24)

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
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ottelut</h2>
        {matches.map((m) => (
          <button
            key={m.matchId}
            type="button"
            onClick={() => navigate(`/match/${m.matchId}`)}
            className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] px-3 py-3 flex items-center justify-between hover:border-[#5BC0BE]/50"
          >
            <div>
              <p className="text-sm font-semibold">{m.homeTeam} – {m.awayTeam}</p>
              <p className="text-[11px] text-slate-400">{m.date} · {m.categoryName}</p>
            </div>
            <div className="text-right">
              {m.scoreHome != null ? (
                <p className="font-mono text-sm font-bold text-[#6FFFE9]">{m.scoreHome}–{m.scoreAway}</p>
              ) : null}
              <p className="text-[11px] text-slate-400">{m.goals}+{m.assists}</p>
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}
