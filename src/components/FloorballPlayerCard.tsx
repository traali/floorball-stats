import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import type { SalibandyPlayerProfile, SalibandyTeamFixture } from '../types/salibandy'
import { determineSeasonHalf, getSeasonYear } from '../services/salibandyApi'
import { previousGamesForPlayer } from '../utils/playerForm'
import { GameBoxes } from './GameBoxes'

type Scope = 'syksy' | 'kevat' | 'all'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#0B132B] border border-slate-800 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-black text-[#6FFFE9] tabular-nums">{value}</div>
    </div>
  )
}

export function FloorballPlayerCard({
  player,
  fixtures,
}: {
  player: SalibandyPlayerProfile
  fixtures: SalibandyTeamFixture[]
}) {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const defaultHalf: Scope = today.slice(5, 7) >= '08' ? 'syksy' : 'kevat'
  const [half, setHalf] = useState<Scope>(defaultHalf)
  const year = today.slice(0, 4)

  const inScope = (date: string, category?: string) => {
    if (half === 'all') return date.startsWith(year) || getSeasonYear(date) === year
    return getSeasonYear(date) === year && determineSeasonHalf(date, category) === half
  }

  const playedIds = new Set(player.matches.map((m) => m.matchId))

  const scopedMatches = useMemo(
    () => player.matches.filter((m) => inScope(m.date, m.categoryName)).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.matches, half, year],
  )

  const boxes = useMemo(
    () =>
      previousGamesForPlayer({
        playerMatches: player.matches,
        teamFixtures: fixtures,
        year,
        half,
      }),
    [player.matches, fixtures, half, year],
  )

  const rows = useMemo(() => {
    const fromTeam = [...fixtures]
      .filter((f) => inScope(f.date, f.categoryName))
      .map((f) => {
        const pm = player.matches.find((m) => m.matchId === f.matchId)
        const upcoming = !f.score
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
          pim: pm?.pim ?? 0,
          dnp: Boolean(f.score) && !playedIds.has(f.matchId),
          upcoming,
        }
      })
    return fromTeam.sort((a, b) => (b.date).localeCompare(a.date)).slice(0, 40)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtures, player.matches, half, year])

  const gp = scopedMatches.length
  const g = scopedMatches.reduce((s, m) => s + m.goals, 0)
  const a = scopedMatches.reduce((s, m) => s + m.assists, 0)
  const pim = scopedMatches.reduce((s, m) => s + (m.pim || 0), 0)
  const plus = scopedMatches.reduce((s, m) => s + (m.plusMinus || 0), 0)
  const saves = scopedMatches.reduce((s, m) => s + (m.saves || 0), 0)
  const isGoalie = saves > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {(['syksy', 'kevat', 'all'] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHalf(s)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-xl font-bold',
              half === s ? 'bg-[#3A506B] text-[#6FFFE9] border border-[#5BC0BE]/40' : 'bg-[#1C2541] text-slate-400',
            )}
          >
            {s === 'syksy' ? `Syksy ${year}` : s === 'kevat' ? `Kevät ${year}` : 'Koko vuosi'}
          </button>
        ))}
      </div>

      <div className={clsx('grid gap-2', isGoalie ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5')}>
        <Stat label="Ottelut" value={gp} />
        <Stat label="Maalit" value={g} />
        <Stat label="Syötöt" value={a} />
        <Stat label="Pisteet" value={g + a} />
        <Stat label="RM" value={pim} />
        {isGoalie ? <Stat label="Torj." value={saves} /> : null}
      </div>
      {plus !== 0 && (
        <p className="text-[11px] text-slate-400">+/- {plus > 0 ? '+' : ''}{plus}</p>
      )}

      <p className="text-[11px] text-slate-400">Ottelut uusin ensin · harmaa = ei pelannut</p>
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
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">Ei otteluita tällä kaudella vielä.</p>
        ) : (
          rows.map((m) => (
            <button
              key={m.matchId}
              type="button"
              onClick={() => navigate(`/match/${m.matchId}`)}
              className={clsx(
                'w-full text-left rounded-xl border px-3 py-3 flex items-center justify-between',
                m.dnp ? 'border-slate-800 bg-slate-900/40 text-slate-500' : 'border-slate-800 bg-[#1C2541] hover:border-[#5BC0BE]/50',
              )}
            >
              <div>
                <p className="text-sm font-semibold">{m.homeTeam} – {m.awayTeam}</p>
                <p className="text-[11px] text-slate-400">{m.date} · {m.categoryName}</p>
              </div>
              <div className="text-right">
                {m.upcoming ? (
                  <p className="text-[11px] font-bold text-amber-300">Ennakko</p>
                ) : m.dnp ? (
                  <p className="text-[11px] font-bold text-slate-500">Ei pelannut</p>
                ) : (
                  <>
                    {m.scoreHome != null ? (
                      <p className="font-mono text-sm font-bold text-[#6FFFE9]">{m.scoreHome}–{m.scoreAway}</p>
                    ) : null}
                    <p className="text-[11px] text-slate-400">
                      {m.goals}+{m.assists}={m.goals + m.assists}p
                      {m.pim ? ` · ${m.pim} RM` : ''}
                    </p>
                  </>
                )}
              </div>
            </button>
          ))
        )}
      </section>
    </div>
  )
}
