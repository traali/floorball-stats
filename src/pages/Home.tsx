import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronRight,
  MapPin,
  Search,
  Shield,
  Activity,
} from 'lucide-react'
import {
  fetchSalibandyTeamFixtures,
  fetchSalibandyTeamProfile,
  pickHeroMatch,
} from '../services/salibandyApi'
import type { SalibandyTeamFixture, SalibandyTeamProfile } from '../types/salibandy'

const FEATURED_TEAM_ID = '25301'

const POPULAR_TEAMS = [
  { id: '25301', name: 'Westend Indians Yellow', category: 'U14 Pojat VALK B ES' },
  { id: '25748', name: 'SB-Pro Valkoinen', category: 'P13 Valkoinen B ES' },
  { id: '6546', name: 'ToBK Blue', category: 'U14 Pojat VALK B ES' },
  { id: '45210', name: 'EräViikingit', category: 'P14 Kilpasarja' },
]

export function Home() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<SalibandyTeamProfile | null>(null)
  const [fixtures, setFixtures] = useState<SalibandyTeamFixture[]>([])
  const [heroMatch, setHeroMatch] = useState<SalibandyTeamFixture | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, f] = await Promise.all([
        fetchSalibandyTeamProfile(FEATURED_TEAM_ID),
        fetchSalibandyTeamFixtures(FEATURED_TEAM_ID),
      ])

      if (p) setProfile(p)
      if (f.length > 0) {
        setFixtures(f)
        const todayIso = new Date().toISOString().slice(0, 10)
        setHeroMatch(pickHeroMatch(f, todayIso))
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const val = searchInput.trim()
    if (!val) return
    navigate(`/search?q=${encodeURIComponent(val)}`)
  }

  const isUpcoming = Boolean(heroMatch && !heroMatch.score)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Welcome Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏑</span>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Salibandytilastot
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5BC0BE]/20 text-[#5BC0BE] border border-[#5BC0BE]/30 uppercase">
              SSBL Live
            </span>
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Hae joukkue, seura, sarja tai pelaaja — sama polku kuin jalkapallossa.
        </p>
      </div>

      {/* Hero Match Card (Next or Latest Match) */}
      <section>
        {loading ? (
          <div className="animate-pulse bg-[#1C2541] rounded-2xl h-36 border border-slate-800" />
        ) : heroMatch ? (
          <div
            onClick={() => navigate(`/match/${heroMatch.matchId}`)}
            className="w-full text-left bg-gradient-to-br from-[#1C2541] to-[#0B132B] border border-slate-700/80 rounded-2xl p-5 hover:border-[#5BC0BE]/70 transition-all cursor-pointer shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                isUpcoming
                  ? 'bg-[#5BC0BE]/20 text-[#6FFFE9] border border-[#5BC0BE]/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isUpcoming ? 'Seuraava ottelu' : 'Viimeisin ottelu'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {heroMatch.date} klo {heroMatch.time}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="min-w-0 flex-1">
                <div className="text-base sm:text-lg font-black text-white group-hover:text-[#6FFFE9] transition-colors truncate">
                  {heroMatch.homeTeam}
                  <span className="text-slate-500 font-normal mx-2">vs</span>
                  {heroMatch.awayTeam}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="truncate max-w-[200px] text-slate-300">{heroMatch.categoryName}</span>
                  {heroMatch.venueName && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-400 truncate max-w-[180px]">
                        <MapPin className="w-3 h-3 text-[#5BC0BE]" />
                        {heroMatch.venueName}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {heroMatch.score ? (
                <div className="ml-4 px-4 py-2 rounded-xl bg-[#0B132B] border border-slate-700 font-mono font-black text-xl sm:text-2xl text-[#6FFFE9]">
                  {heroMatch.score}
                </div>
              ) : (
                <div className="ml-4 px-3 py-1.5 rounded-xl bg-[#3A506B]/50 border border-[#5BC0BE]/40 text-xs font-bold text-[#6FFFE9]">
                  Avaa ottelu →
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* Featured Team Banner */}
      <section>
        <div
          onClick={() => navigate(`/team/${profile?.teamId || FEATURED_TEAM_ID}`)}
          className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition-all cursor-pointer shadow-md"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              🟡
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {profile?.teamName || 'Westend Indians Yellow'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Joukkueen koko kausiohjelma • Syksy 2026 / Kevät 2026 • Kokoonpano
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
        </div>
      </section>

      {/* Search Input */}
      <section>
        <form onSubmit={handleSearch} className="flex items-center bg-[#1C2541] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-[#5BC0BE] transition-colors">
          <div className="pl-4 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Hae joukkuetta, seuraa, sarjaa, pelaajaa tai ottelua…"
            className="grow bg-transparent border-none text-white text-xs px-3.5 py-3 focus:outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 mr-1.5 rounded-xl bg-[#3A506B] hover:bg-[#486382] text-[#6FFFE9] text-xs font-bold transition-colors"
          >
            Hae
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Westend', 'EräViikingit', 'SB-Pro', 'U14', 'P13'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
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
      </section>

      {/* Quick Team Switcher */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Suositut joukkueet & sarjat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR_TEAMS.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/team/${t.id}`)}
              className="bg-[#1C2541]/70 border border-slate-800 hover:border-[#5BC0BE]/50 rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between min-h-[64px]"
            >
              <div className="font-bold text-xs text-slate-200 truncate">{t.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-1">{t.category}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming & Recent Matches List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#5BC0BE]" />
            Kauden ottelut ({fixtures.length})
          </h3>
          <button
            onClick={() => navigate(`/team/${profile?.teamId || FEATURED_TEAM_ID}`)}
            className="text-xs text-[#6FFFE9] hover:underline flex items-center gap-1"
          >
            Koko otteluohjelma <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {fixtures.slice(0, 6).map((f) => (
            <div
              key={f.matchId}
              onClick={() => navigate(`/match/${f.matchId}`)}
              className="bg-[#1C2541]/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{f.date}</span>
                  <span>•</span>
                  <span className="truncate max-w-[130px]">{f.categoryName}</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-slate-200 truncate mt-0.5">
                  {f.homeTeam} <span className="text-slate-500">vs</span> {f.awayTeam}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {f.score ? (
                  <span className="font-mono font-bold text-xs sm:text-sm text-white bg-[#0B132B] px-2.5 py-1 rounded-lg border border-slate-700">
                    {f.score}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[#6FFFE9] bg-[#3A506B]/30 px-2.5 py-1 rounded-lg border border-[#5BC0BE]/20">
                    klo {f.time.slice(0, 5)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
