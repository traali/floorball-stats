import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star } from 'lucide-react'
import type { SalibandyRosterPlayer } from '../types/salibandy'

function Card({ p }: { p: SalibandyRosterPlayer }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/player/${p.playerId}`)}
      className="w-full text-left rounded-xl border border-slate-800 bg-[#0B132B]/80 px-3 py-2.5 hover:border-[#5BC0BE]/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-100 truncate">
          {p.shirtNumber ? <span className="text-[#6FFFE9] font-mono mr-1">#{p.shirtNumber}</span> : null}
          {p.fullName || 'Pelaaja'}
          {p.isCaptain ? <Star className="inline w-3 h-3 ml-1 text-amber-400" /> : null}
        </span>
        <span className="text-[11px] text-slate-500 shrink-0">{p.birthYear || ''}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">G</div>
          <div className="text-sm font-black text-[#6FFFE9]">{p.goals}</div>
        </div>
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">A</div>
          <div className="text-sm font-black text-[#6FFFE9]">{p.assists}</div>
        </div>
        <div className="rounded-lg bg-[#1C2541] py-1">
          <div className="text-[9px] uppercase text-slate-500">P</div>
          <div className="text-sm font-black text-white">{p.points}</div>
        </div>
      </div>
    </button>
  )
}

function Column({
  teamName,
  roster,
}: {
  teamName: string
  roster: SalibandyRosterPlayer[]
}) {
  const rows = [...roster].sort((a, b) => b.points - a.points || b.goals - a.goals)
  return (
    <div className="bg-[#1C2541] rounded-2xl p-4 border border-slate-700/60">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#5BC0BE]" />
          {teamName}
        </h3>
        <span className="text-[11px] text-slate-400">{rows.length} pelaajakorttia</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">Kokoonpanoa ei saatu SSBL:stä.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {rows.map((p) => (
            <Card key={p.playerId} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}

export function EnnakkoRosters({
  homeName,
  awayName,
  homeRoster,
  awayRoster,
}: {
  homeName: string
  awayName: string
  homeRoster: SalibandyRosterPlayer[]
  awayRoster: SalibandyRosterPlayer[]
}) {
  return (
    <section className="space-y-3">
      <p className="text-xs text-slate-400">
        Ennakko — pelaajakortit kauden maaleilla ja syötöillä. Avaa kortti nähdäksesi ottelut (uusin ensin, harmaa = ei pelannut).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Column teamName={homeName} roster={homeRoster} />
        <Column teamName={awayName} roster={awayRoster} />
      </div>
    </section>
  )
}
