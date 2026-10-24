import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { fetchSalibandyPlayer, fetchSalibandyTeamFixtures } from '../services/salibandyApi'
import type { SalibandyPlayerProfile, SalibandyTeamFixture } from '../types/salibandy'
import { useFavorites } from '../hooks/useFavorites'
import { FloorballPlayerCard } from '../components/FloorballPlayerCard'
import { historyRowsFromPlayer } from '../services/salibandyApi'
import { seasonIdFor, seriesThisSeason } from '../utils/playerLevels'
import { helsinkiDateISO } from '../utils/matchContext'

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
      const teamIds = [...new Set((p?.teams || []).map((t) => t.teamId).filter(Boolean))]
      if (teamIds.length) {
        const lists = await Promise.all(teamIds.map((id) => fetchSalibandyTeamFixtures(id)))
        if (!cancelled) setFixtures(lists.flat())
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400 text-sm">Ladataan pelaajaa…</div>
  if (!player) return <div className="max-w-4xl mx-auto px-4 py-16 text-rose-400 text-sm">Pelaajaa ei löytynyt.</div>

  const fav = isFavorite('player', player.playerId)
  const season = seasonIdFor(helsinkiDateISO())
  const series = seriesThisSeason(historyRowsFromPlayer(player), season)

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
            {player.teams[0]?.shirtNumber ? ` · #${player.teams[0].shirtNumber}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle({ kind: 'player', id: player.playerId, name: player.fullName, subtitle: player.teams[0]?.teamName, clubId: player.clubId, shirtNumber: player.teams.find((t) => t.shirtNumber)?.shirtNumber })}
          className={`p-2 rounded-full border ${fav ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {series.length > 0 && (
        <section data-testid="season-series" className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Tämä kausi sarjoittain · {season}</h2>
          <ul className="space-y-1.5">
            {series.map((r) => (
              <li key={`${r.category}|${r.teamName}`} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-slate-100 truncate">
                  {r.category}
                  {r.teamName ? <span className="text-slate-400"> · {r.teamName}</span> : null}
                </span>
                <span className="font-mono text-slate-300 shrink-0">
                  {r.games} o. · {r.goals == null ? 'maaleja ei kirjattu' : `${r.goals} m`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FloorballPlayerCard player={player} fixtures={fixtures} />
    </div>
  )
}
