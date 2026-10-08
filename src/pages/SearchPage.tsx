import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Heart, Layers, Search, Shield, Trophy, User, Users } from 'lucide-react'
import { searchSalibandy, type SearchResult } from '../services/salibandyApi'
import type { DiscoveryHit } from '../types/salibandy'
import { favoriteClubIds, useFavorites, type FavKind } from '../hooks/useFavorites'
import { readRecentSearches, rememberSearch } from '../utils/recentSearches'

const EMPTY_RESULT: SearchResult = { hits: [], playerClubs: [] }

export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches())
  const { favorites, isFavorite, toggle } = useFavorites()
  const favClubKey = favoriteClubIds(favorites).join(',')

  useEffect(() => {
    setInput(q)
    if (!q.trim()) {
      setResult(EMPTY_RESULT)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    searchSalibandy(q, { favoriteClubIds: favClubKey ? favClubKey.split(',') : [] })
      .then((res) => {
        if (cancelled) return
        setResult(res)
        if (res.hits.length > 0) setRecent(rememberSearch(q))
      })
      .catch(() => {
        if (!cancelled) {
          setResult(EMPTY_RESULT)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q, favClubKey])

  const submit = (value: string) => {
    const next = value.trim()
    if (!next) return
    navigate(`/search?q=${encodeURIComponent(next)}`)
  }

  const hits = result.hits
  const grouped = useMemo(
    () => ({
      club: hits.filter((h) => h.kind === 'club'),
      team: hits.filter((h) => h.kind === 'team'),
      player: hits.filter((h) => h.kind === 'player'),
      match: hits.filter((h) => h.kind === 'match'),
      competition: hits.filter((h) => h.kind === 'competition'),
      category: hits.filter((h) => h.kind === 'category'),
    }),
    [hits],
  )
  const isIdQuery = /^\d+$/.test(q.trim()) || /(?:ottelu|match|joukkue|team|pelaaja|player|seura|club)/i.test(q)

  const favToggle = (h: DiscoveryHit) => {
    if (h.kind !== 'team' && h.kind !== 'player' && h.kind !== 'club') return undefined
    const kind: FavKind = h.kind
    return {
      active: isFavorite(kind, h.id),
      onToggle: () => toggle({ kind, id: h.id, name: h.title, subtitle: h.subtitle, clubId: h.clubId }),
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      <div>
        <h1 className="text-2xl font-black">Haku</h1>
        <p className="text-xs text-slate-400 mt-1">
          Joukkue, seura tai pelaaja salibandyn tulospalvelusta. Pelaajan löydät seuran nimellä ja sukunimellä.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex items-center bg-[#1C2541] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-[#5BC0BE]"
      >
        <Search className="w-4 h-4 text-slate-400 ml-4" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus={!q}
          enterKeyHint="search"
          aria-label="Hae joukkuetta, seuraa tai pelaajaa"
          placeholder="Joukkue, seura tai seura + sukunimi"
          className="grow bg-transparent text-white text-sm px-3 py-3 focus:outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="px-4 py-2 mr-1.5 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-bold">
          Hae
        </button>
      </form>
      {recent.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1">Viimeisimmät:</span>
          {recent.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-[#1C2541] text-[11px] font-semibold text-slate-300 hover:border-[#5BC0BE]/50"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-400">Haetaan tulospalvelusta…</p>
      ) : !q ? (
        <p className="text-sm text-slate-500">Aloita hakemalla joukkuetta, seuraa tai pelaajaa.</p>
      ) : failed ? (
        <p className="text-sm text-rose-300">Tulospalvelu ei vastannut. Yritä hetken päästä uudelleen.</p>
      ) : (
        <div className="space-y-5">
          {hits.length === 0 ? (
            <p className="text-sm text-slate-500" data-testid="no-hits">
              {isIdQuery ? `Tulospalvelu ei tunne tunnusta «${q}».` : `Ei osumia haulle «${q}».`}
            </p>
          ) : null}
          <HitGroup icon={Users} title="Seurat" items={grouped.club} fav={favToggle} onOpen={(id) => navigate(`/club/${id}`)} />
          <HitGroup icon={Shield} title="Joukkueet" items={grouped.team} fav={favToggle} onOpen={(id) => navigate(`/team/${id}`)} />
          <HitGroup icon={User} title="Pelaajat" items={grouped.player} fav={favToggle} onOpen={(id) => navigate(`/player/${id}`)} />
          {!isIdQuery && grouped.player.length === 0 ? (
            <p className="text-xs text-slate-400 rounded-xl border border-slate-800 bg-[#1C2541]/50 px-3 py-2" data-testid="player-hint">
              {result.playerClubs.length > 0
                ? `Pelaajaa ei löytynyt seuroista ${result.playerClubs.map((c) => c.name).join(', ')}. `
                : ''}
              Löydät pelaajan lisäämällä seuran nimen, esim. «seura sukunimi».
            </p>
          ) : null}
          <HitGroup icon={Trophy} title="Kilpailut" items={grouped.competition} onOpen={(id) => navigate(`/competition/${id}`)} />
          <HitGroup
            icon={Layers}
            title="Sarjat"
            items={grouped.category}
            onOpen={(id) => {
              const [comp, cat] = id.split('::')
              if (comp && cat) navigate(`/competition/${comp}/category/${cat}`)
            }}
          />
          <HitGroup icon={Calendar} title="Ottelut" items={grouped.match} onOpen={(id) => navigate(`/match/${id}`)} />
        </div>
      )}
    </div>
  )
}

function HitGroup({
  title,
  icon: Icon,
  items,
  onOpen,
  fav,
}: {
  title: string
  icon: typeof Shield
  items: DiscoveryHit[]
  onOpen: (id: string) => void
  fav?: (h: DiscoveryHit) => { active: boolean; onToggle: () => void } | undefined
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[#5BC0BE]" /> {title}
      </h2>
      {items.map((h) => {
        const f = fav?.(h)
        return (
          <div
            key={`${h.kind}-${h.id}`}
            data-hit={`${h.kind}:${h.id}`}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#1C2541] hover:border-[#5BC0BE]/50"
          >
            <button type="button" onClick={() => onOpen(h.id)} className="grow min-w-0 text-left px-3 py-3">
              <p className="text-sm font-semibold text-white truncate">{h.title}</p>
              <p className="text-[11px] text-slate-400 truncate">{h.subtitle}</p>
            </button>
            {f ? (
              <button
                type="button"
                onClick={f.onToggle}
                aria-pressed={f.active}
                aria-label={f.active ? `Poista ${h.title} suosikeista` : `Lisää ${h.title} suosikkeihin`}
                className={`mr-2 p-2 rounded-full border shrink-0 ${f.active ? 'border-rose-400 text-rose-400' : 'border-slate-700 text-slate-400'}`}
              >
                <Heart className={`w-4 h-4 ${f.active ? 'fill-current' : ''}`} />
              </button>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
