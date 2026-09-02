import React from 'react'
import { Activity, ShieldCheck, ArrowLeft } from 'lucide-react'

interface HeaderProps {
  isEmbed: boolean
  onBack?: () => void
}

export const Header: React.FC<HeaderProps> = ({ isEmbed, onBack }) => {
  return (
    <header className="bg-[#1C2541]/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-700/60 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEmbed && onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Takaisin"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏑</span>
            <div>
              <h1 className="font-bold text-base tracking-wide text-[#6FFFE9] flex items-center gap-2">
                Floorball Stats
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#5BC0BE]/20 text-[#5BC0BE] border border-[#5BC0BE]/30">
                  SSBL Torneopal
                </span>
              </h1>
              <p className="text-xs text-slate-400">Salibandyliiga & Sarjatilastot</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Monastic Contract v1.0</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3A506B]/40 text-slate-300 border border-slate-700">
            <Activity className="w-3.5 h-3.5 text-[#5BC0BE]" />
            <span>Live Data</span>
          </div>
        </div>
      </div>
    </header>
  )
}
