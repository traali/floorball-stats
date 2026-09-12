import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield } from 'lucide-react'

const QUICK = ['Westend', 'EräViikingit', 'SB-Pro', 'U14', 'P13', 'Etelä-Suomi']

const POPULAR = [
  { id: '25301', name: 'Westend Indians Yellow', hint: 'U14 Pojat' },
  { id: '25748', name: 'SB-Pro Valkoinen', hint: 'P13 Valkoinen' },
  { id: '6546', name: 'ToBK Blue', hint: 'U14 Pojat' },
  { id: '45210', name: 'EräViikingit', hint: 'P14' },
]

export function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function goSearch(value: string) {
    const v = value.trim()
    if (!v) {
      navigate('/search')
      return
    }
    navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>🏑</span>
          Salibandytilastot
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5BC0BE]/20 text-[#5BC0BE] border border-[#5BC0BE]/30 uppercase">
            SSBL Live
          </span>
        </h1>
        <p className="text-sm text-slate-400">
          Hae joukkue, seura, sarja tai pelaaja. Ei kovakoodattua ottelua.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          goSearch(q)
        }}
        className="flex items-center bg-[#1C2541] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-[#5BC0BE]"
      >
        <div className="pl-4 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hae Westend, U14, pelaaja tai liitä salibandy.fi-linkki"
          className="grow bg-transparent border-none text-white text-sm px-3.5 py-3.5 focus:outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="px-4 py-2.5 mr-1.5 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-bold">
          Hae
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => goSearch(chip)}
            className="px-3 py-1.5 rounded-full border border-slate-800 bg-[#1C2541] text-[11px] font-semibold text-slate-300 hover:border-[#5BC0BE]/50"
          >
            {chip}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="px-3 py-1.5 rounded-full border border-[#5BC0BE]/30 text-[11px] font-semibold text-[#6FFFE9]"
        >
          Selaa sarjoja →
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Pikavalinnat (haku, ei kovakoodattu ottelu)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/team/${t.id}`)}
              className="text-left bg-[#1C2541]/70 border border-slate-800 hover:border-[#5BC0BE]/50 rounded-xl p-3 min-h-[64px]"
            >
              <div className="font-bold text-xs text-slate-200 truncate">{t.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-1">{t.hint}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
