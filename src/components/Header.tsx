import React from 'react'
import { Search, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { IceMark } from './IceMark'
import { WebMcpBadge } from './WebMcpBadge'

interface HeaderProps {
  isEmbed: boolean
  onBack?: () => void
}

export const Header: React.FC<HeaderProps> = ({ isEmbed, onBack }) => {
  const navigate = useNavigate()
  return (
    <header className="bg-[#1C2541]/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-700/60 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isEmbed && onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors min-h-11 min-w-11"
              aria-label="Takaisin"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 text-left min-h-11 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#0B132B] border border-slate-700 flex items-center justify-center text-[#6FFFE9]">
              <IceMark className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-bold text-base tracking-wide text-[#6FFFE9] leading-none">Floorball Stats</h1>
              <p className="text-[10px] text-[#5BC0BE] font-medium mt-0.5">SSBL · Salibandyliitto</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full bg-[#0B132B] border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            <Search className="w-3.5 h-3.5" />
            Hae
          </button>
          <WebMcpBadge />
        </div>
      </div>
    </header>
  )
}
