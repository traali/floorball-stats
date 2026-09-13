import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Award,
  Shield,
  Zap,
  Trophy,
  Swords,
  Share2,
  Loader2,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { PeriodScoreCard } from '../components/PeriodScoreCard'
import { TimelineEventsList } from '../components/TimelineEventsList'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { GoalkeeperBattleCard } from '../components/GoalkeeperBattleCard'
import { SpecialTeamsCard } from '../components/SpecialTeamsCard'
import { FloorballStandingsTable } from '../components/FloorballStandingsTable'
import { CommonOpponents } from '../components/CommonOpponents'
import { MatchPreviewExport } from '../components/MatchPreviewExport'
import { EnnakkoRosters } from '../components/EnnakkoRosters'
import {
  fetchSalibandyMatch,
  fetchSalibandyGroup,
  fetchSalibandyTeamRoster,
  mapGroupTeamsToStandings,
  computePlayerLeaders,
} from '../services/salibandyApi'
import type {
  SalibandyMatchDetail,
  SalibandyPlayerLeader,
  SalibandyStandingRow,
  SalibandyRosterPlayer,
} from '../types/salibandy'

type MatchTab = 'match' | 'roster' | 'points' | 'goalies' | 'special_teams' | 'standings' | 'opponents' | 'export'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState<SalibandyMatchDetail | null>(null)
  const [leaders, setLeaders] = useState<SalibandyPlayerLeader[]>([])
  const [standings, setStandings] = useState<SalibandyStandingRow[]>([])
  const [homeRoster, setHomeRoster] = useState<SalibandyRosterPlayer[]>([])
  const [awayRoster, setAwayRoster] = useState<SalibandyRosterPlayer[]>([])
  const [activeTab, setActiveTab] = useState<MatchTab>('match')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMatch() {
      setLoading(true)
      const m = await fetchSalibandyMatch(matchId)

      if (m) {
        setMatch(m)
        setLeaders(computePlayerLeaders(m))
        setHomeRoster(m.homeRoster || [])
        setAwayRoster(m.awayRoster || [])
        const [group, home, away] = await Promise.all([
          m.competitionId && m.categoryId && m.groupId
            ? fetchSalibandyGroup(m.competitionId, m.categoryId, m.groupId)
            : Promise.resolve(null),
          m.homeTeamId ? fetchSalibandyTeamRoster(m.homeTeamId) : Promise.resolve([]),
          m.awayTeamId ? fetchSalibandyTeamRoster(m.awayTeamId) : Promise.resolve([]),
        ])
        if (group) setStandings(mapGroupTeamsToStandings(group.teams, group.matches))
        if (home.length) setHomeRoster(home)
        if (away.length) setAwayRoster(away)
        const startTime = m.date ? `${m.date}T${(m.time || '00:00').padEnd(5, '0')}:00` : ''
        try {
          window.parent?.postMessage(
            {
              type: 'matchday-context',
              payload: {
                eventId: m.matchId,
                sport: 'floorball',
                startTime,
                homeTeam: m.homeTeamName,
                awayTeam: m.awayTeamName,
                venueName: m.venueName,
                association: 'salibandy',
                externalId: m.matchId,
              },
            },
            '*',
          )
        } catch {
          /* embed parent optional */
        }
      }
      setLoading(false)
    }

    loadMatch()
  }, [matchId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
        <p className="text-sm">Ladataan salibandyottelun tilastoja...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-400 text-sm">Ottelua ei löytynyt tunnuksella #{matchId}.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-[#3A506B] text-[#6FFFE9] text-xs font-bold"
        >
          Palaa etusivulle
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Navigation Bar with Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C2541] hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors border border-slate-700/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Takaisin
        </button>
        <div className="flex items-center gap-3">
          {match.homeTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.homeTeamId}`)}
              className="text-xs text-[#6FFFE9] hover:underline font-semibold"
            >
              {match.homeTeamName} →
            </button>
          ) : null}
          {match.awayTeamId ? (
            <button
              type="button"
              onClick={() => navigate(`/team/${match.awayTeamId}`)}
              className="text-xs text-[#6FFFE9] hover:underline font-semibold"
            >
              {match.awayTeamName} →
            </button>
          ) : null}
        </div>
      </div>

      {/* Main 3-Period Score Card */}
      <PeriodScoreCard match={match} />

      {/* Detail Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('match')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'match'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Ottelukeskus
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'roster'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Users className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Kokoonpano
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'points'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Pistetilasto (G+A)
        </button>
        <button
          onClick={() => setActiveTab('goalies')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'goalies'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Shield className="w-3.5 h-3.5 text-[#5BC0BE]" />
          Maalivahdit
        </button>
        <button
          onClick={() => setActiveTab('special_teams')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'special_teams'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
          Erikoistilanteet
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'standings'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Sarjataulukko
        </button>
        <button
          onClick={() => setActiveTab('opponents')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'opponents'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Swords className="w-3.5 h-3.5" />
          Vastustajat
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap',
            activeTab === 'export'
              ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Share2 className="w-3.5 h-3.5" />
          Jaa
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === 'match' && (
        <div className="space-y-6">
          <EnnakkoRosters
            homeName={match.homeTeamName}
            awayName={match.awayTeamName}
            homeRoster={homeRoster}
            awayRoster={awayRoster}
            upcoming={match.phase === 'upcoming'}
          />
          {match.phase !== 'upcoming' && !(match.date && match.date > new Date().toISOString().slice(0, 10)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TimelineEventsList goals={match.goals} penalties={match.penalties} />
              <div className="space-y-6">
                <GoalkeeperBattleCard
                  goalkeepers={match.goalkeepers}
                  homeTeamName={match.homeTeamName}
                  awayTeamName={match.awayTeamName}
                />
                <LeaderboardTable leaders={leaders} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <EnnakkoRosters
          homeName={match.homeTeamName}
          awayName={match.awayTeamName}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          upcoming={match.phase === 'upcoming'}
        />
      )}

      {activeTab === 'points' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardTable leaders={leaders} />
          <TimelineEventsList goals={match.goals} penalties={match.penalties} />
        </div>
      )}

      {activeTab === 'goalies' && (
        <div className="space-y-6">
          <GoalkeeperBattleCard
            goalkeepers={match.goalkeepers}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
          />
        </div>
      )}

      {activeTab === 'special_teams' && (
        <div className="space-y-6">
          <SpecialTeamsCard
            goals={match.goals}
            penalties={match.penalties}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
          />
        </div>
      )}

      {activeTab === 'standings' && (
        <FloorballStandingsTable
          standings={standings}
          highlightTeamId={match.homeTeamId}
        />
      )}

      {activeTab === 'opponents' && (
        <CommonOpponents homeTeam={match.homeTeamName} awayTeam={match.awayTeamName} />
      )}

      {activeTab === 'export' && (
        <MatchPreviewExport
          match={match}
          leaders={leaders}
          standings={standings}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
        />
      )}
    </div>
  )
}
