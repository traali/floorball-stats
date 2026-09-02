import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { PeriodScoreCard } from './components/PeriodScoreCard'
import { TimelineEventsList } from './components/TimelineEventsList'
import { LeaderboardTable } from './components/LeaderboardTable'
import { GoalkeeperBattleCard } from './components/GoalkeeperBattleCard'
import { SpecialTeamsCard } from './components/SpecialTeamsCard'
import { MatchPreviewExport } from './components/MatchPreviewExport'
import { TeamScheduleView } from './components/TeamScheduleView'
import { TeamRosterView } from './components/TeamRosterView'
import { CommonOpponents } from './components/CommonOpponents'
import {
  fetchSalibandyMatch,
  fetchSalibandyTeamRoster,
  fetchSalibandyTeamFixtures,
  computePlayerLeaders,
} from './services/salibandyApi'
import type {
  SalibandyMatchDetail,
  SalibandyPlayerLeader,
  SalibandyRosterPlayer,
  SalibandyTeamFixture,
} from './types/salibandy'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2, Calendar, Award, Shield, Users, Share2, Swords, Zap } from 'lucide-react'

type TabType = 'match' | 'points' | 'goalies' | 'special_teams' | 'schedule' | 'roster' | 'opponents' | 'export'

export function App() {
  const [match, setMatch] = useState<SalibandyMatchDetail | null>(null)
  const [leaders, setLeaders] = useState<SalibandyPlayerLeader[]>([])
  const [roster, setRoster] = useState<SalibandyRosterPlayer[]>([])
  const [fixtures, setFixtures] = useState<SalibandyTeamFixture[]>([])
  const [currentMatchId, setCurrentMatchId] = useState('913481')
  const [currentTeamId, setCurrentTeamId] = useState('25301')
  const [activeTab, setActiveTab] = useState<TabType>('match')
  const [loading, setLoading] = useState(true)

  const searchParams = new URLSearchParams(window.location.search)
  const query = parseIncomingCrossRepoQuery(searchParams)
  const isEmbed = Boolean(query.embed)

  useEffect(() => {
    if (query.targetId) {
      setCurrentMatchId(query.targetId)
    }
  }, [query.targetId])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [matchData, rosterData, fixturesData] = await Promise.all([
        fetchSalibandyMatch(currentMatchId),
        fetchSalibandyTeamRoster(currentTeamId),
        fetchSalibandyTeamFixtures(currentTeamId),
      ])

      if (matchData) {
        setMatch(matchData)
        setLeaders(computePlayerLeaders(matchData))
        if (matchData.awayTeamId && matchData.awayTeamId !== currentTeamId) {
          setCurrentTeamId(matchData.awayTeamId)
        }
      }

      setRoster(rosterData)
      setFixtures(fixturesData)
      setLoading(false)
    }

    loadData()
  }, [currentMatchId, currentTeamId])

  const handleSelectMatch = (matchId: string) => {
    setCurrentMatchId(matchId)
    setActiveTab('match')
  }

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 ${isEmbed ? 'p-2 sm:p-4' : 'pb-16'}`}>
      {!isEmbed && <Header isEmbed={isEmbed} />}

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Ottelukeskus
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'points'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Pistetilasto (G+A)
          </button>
          <button
            onClick={() => setActiveTab('goalies')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'goalies'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#5BC0BE]" />
            Maalivahdit
          </button>
          <button
            onClick={() => setActiveTab('special_teams')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'special_teams'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            Erikoistilanteet (YV/AV)
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Otteluohjelma ({fixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Kokoonpano ({roster.length})
          </button>
          <button
            onClick={() => setActiveTab('opponents')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'opponents'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Vastustajavertailu
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-[#3A506B] text-[#6FFFE9] shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Jaa
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
            <p className="text-sm">Ladataan Salibandy Torneopal -tilastoja...</p>
          </div>
        ) : match ? (
          <>
            {/* Main Score Card is always visible at the top */}
            <PeriodScoreCard match={match} />

            {/* Tab Views */}
            {activeTab === 'match' && (
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

            {activeTab === 'schedule' && (
              <TeamScheduleView
                fixtures={fixtures}
                onSelectMatch={handleSelectMatch}
                currentMatchId={currentMatchId}
              />
            )}

            {activeTab === 'roster' && (
              <TeamRosterView roster={roster} teamName={match.awayTeamName} />
            )}

            {activeTab === 'opponents' && (
              <CommonOpponents homeTeam={match.homeTeamName} awayTeam={match.awayTeamName} />
            )}

            {activeTab === 'export' && (
              <MatchPreviewExport match={match} leaders={leaders} />
            )}
          </>
        ) : (
          <div className="p-8 text-center bg-[#1C2541] rounded-2xl border border-slate-700">
            <p className="text-slate-400">Ottelutietoja ei löytynyt.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
