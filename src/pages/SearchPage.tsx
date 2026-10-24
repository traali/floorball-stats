import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Heart, History, Layers, Search, Shield, Trophy, User, Users } from 'lucide-react'
import { enrichPlayerShirts, getTasoFailure, searchSalibandy, type SearchResult } from '../services/salibandyApi'
import { withShirt } from '../utils/shirt'
import type { DiscoveryHit } from '../types/salibandy'
import { favoriteClubIds, useFavorites, type FavKind } from '../hooks/useFavorites'
import { readRecentSearches, rememberSearch } from '../utils/recentSearches'

export const SEARCH_TIMEOUT_MS = 25_000
const EMPTY_RESULT: SearchResult = { hits: [], playerClubs: [] }

export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
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
    setResult(EMPTY_RESULT)
    setFailed(false)
    setTimedOut(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { if (!cancelled) setTimedOut(true); reject(new Error('timeout')) }, SEARCH_TIMEOUT_MS)
    })
    Promise.race([searchSalibandy(q, {
      favoriteClubIds: favClubKey ? favClubKey.split(',') : [],
      onPartial: (r) => { if (!cancelled && r.hits.length > 0) setResult(r) },
    }), timeout])
      .then((res) => {
        if (cancelled) return
        setResult(res)
        if (res.hits.length > 0) setRecent(rememberSearch(q))
        void enrichPlayerShirts(res.hits).then((hits) => {
          if (!cancelled && hits !== res.hits) setResult({ ...res, hits })
        })
      })
      .catch(() => {
        if (!cancelled) {
          setResult(EMPTY_RESULT)
          setFailed(true)
        }
      })
      .finally(() => {
        if (timer) clearTimeout(timer)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
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
      onToggle: () => toggle({ kind, id: h.id, name: h.title, subtitle: h.subtitle, clubId: h.clubId, shirtNumber: h.shirtNumber }),
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
        <section aria-label="Viimeisimmät haut" data-testid="recent-searches" className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-dashed border-slate-800">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-slate-500 mr-1">
            <History className="w-3 h-3" /> Viimeisimmät haut
          </span>
          {recent.map((chip) => (
            <button
              key={chip}
              type="button"
              data-testid="recent-search"
              aria-label={`Hae uudelleen: ${chip}`}
              onClick={() => submit(chip)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-slate-700 bg-transparent text-[11px] text-slate-400 hover:text-slate-200 hover:border-[#5BC0BE]/50"
            >
              <Search className="w-3 h-3" />
              {chip}
            </button>
          ))}
        </section>
      ) : null}
      {q && (hits.length > 0 || !loading) ? (
        <h2 className="text-[11px] uppercase tracking-wide font-bold text-slate-400" data-testid="results-heading">Tulokset haulle «{q}»</h2>
      ) : null}
      {loading && hits.length > 0 ? (
        <p className="text-xs text-slate-400" data-testid="search-streaming">Haetaan lisää tämän päivän otteluiden kokoonpanoista…</p>
      ) : null}
      {loading && hits.length === 0 ? (
        <p className="text-sm text-slate-400">Haetaan tulospalvelusta…</p>
      ) : !q ? (
        <p className="text-sm text-slate-500">Aloita hakemalla joukkuetta, seuraa tai pelaajaa.</p>
      ) : failed && timedOut ? (
        <p className="text-sm text-rose-300" data-testid="search-timeout">
          Haku kesti liian kauan ({SEARCH_TIMEOUT_MS / 1000} s), tulospalvelu ei vastannut ajoissa. Yritä uudelleen tai tarkenna hakua (esim. «seura sukunimi»).
        </p>
      ) : failed ? (
        <p className="text-sm text-rose-300" data-testid="search-error">
          Tulospalvelu ei vastannut{getTasoFailure()?.body ? ` («${getTasoFailure()?.body.slice(0, 40)}»)` : ''}. Haku ei siis ole tyhjä vaan epäonnistui — yritä hetken päästä uudelleen.
        </p>
      ) : (
        <div className="space-y-5">
          {hits.length === 0 ? (
            <p className="text-sm text-slate-500" data-testid="no-hits">
              {isIdQuery ? `Tulospalvelu ei tunne tunnusta «${q}».` : `Ei osumia haulle «${q}».`}
            </p>
          ) : null}
          <HitGroup icon={Users} title="Seurat" items={grouped.club} fav={favToggle} to={(id) => `/club/${id}`} />
          <HitGroup icon={Shield} title="Joukkueet" items={grouped.team} fav={favToggle} to={(id) => `/team/${id}`} />
          <HitGroup icon={User} title="Pelaajat" items={grouped.player} fav={favToggle} to={(id) => `/player/${id}`} />
          {!isIdQuery && grouped.player.length === 0 ? (
            <p className="text-xs text-slate-400 rounded-xl border border-slate-800 bg-[#1C2541]/50 px-3 py-2" data-testid="player-hint">
              {result.playerClubs.length > 0
                ? `Pelaajaa ei löytynyt seuroista ${result.playerClubs.map((c) => c.name).join(', ')}. `
                : ''}
              Löydät pelaajan lisäämällä seuran nimen, esim. «seura sukunimi».
            </p>
          ) : null}
          <HitGroup icon={Trophy} title="Kilpailut" items={grouped.competition} to={(id) => `/competition/${id}`} />
          <HitGroup
            icon={Layers}
            title="Sarjat"
            items={grouped.category}
            to={(id) => {
              const [comp, cat] = id.split('::')
              return `/competition/${comp}/category/${cat}`
            }}
          />
          <HitGroup icon={Calendar} title="Ottelut" items={grouped.match} to={(id) => `/match/${id}`} />
        </div>
      )}
    </div>
  )
}

function HitGroup({
  title,
  icon: Icon,
  items,
  to,
  fav,
}: {
  title: string
  icon: typeof Shield
  items: DiscoveryHit[]
  to: (id: string) => string
  fav?: (h: DiscoveryHit) => { active: boolean; onToggle: () => void } | undefined
}) {
  const navigate = useNavigate()
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
            <a href={`#${to(h.id)}`} data-testid="search-hit" onClick={(e) => { e.preventDefault(); navigate(to(h.id)) }} className="block grow min-w-0 text-left px-3 py-3">
              <p className="text-sm font-semibold text-white truncate">{h.kind === 'player' ? withShirt(h.title, h.shirtNumber) : h.title}</p>
              <p className="text-[11px] text-slate-400 truncate">{h.subtitle}</p>
            </a>
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
