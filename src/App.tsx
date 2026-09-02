import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { PeriodScoreCard } from './components/PeriodScoreCard'
import { TimelineEventsList } from './components/TimelineEventsList'
import { LeaderboardTable } from './components/LeaderboardTable'
import { fetchSalibandyMatch, computePlayerLeaders } from './services/salibandyApi'
import type { SalibandyMatchDetail, SalibandyPlayerLeader } from './types/salibandy'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { Loader2 } from 'lucide-react'

export function App() {
  const [match, setMatch] = useState<SalibandyMatchDetail | null>(null)
  const [leaders, setLeaders] = useState<SalibandyPlayerLeader[]>([])
  const [loading, setLoading] = useState(true)

  const searchParams = new URLSearchParams(window.location.search)
  const query = parseIncomingCrossRepoQuery(searchParams)
  const isEmbed = Boolean(query.embed)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const targetId = query.targetId || '913481'
      const data = await fetchSalibandyMatch(targetId)

      if (data) {
        setMatch(data)
        setLeaders(computePlayerLeaders(data))
      } else {
        // Fallback default fixture for offline/demo reliability
        const fallback: SalibandyMatchDetail = {
          matchId: targetId,
          matchNumber: '227',
          competitionName: 'Etelä-Suomi 2025-26',
          categoryName: 'P13 VALKOINEN B ES (KEVÄT)',
          date: '2026-04-12',
          time: '15:00:00',
          venueName: 'Otahalli Espoo',
          venueLat: 60.185,
          venueLon: 24.832,
          homeTeamName: 'SB-Pro Valkoinen',
          awayTeamName: 'Westend Indians Yellow',
          scoreHome: 3,
          scoreAway: 15,
          isLive: false,
          periods: [
            { period: 1, scoreHome: 1, scoreAway: 4 },
            { period: 2, scoreHome: 1, scoreAway: 5 },
            { period: 3, scoreHome: 1, scoreAway: 6 },
          ],
          goals: [
            {
              eventId: '1',
              code: 'maali',
              time: '4:04',
              period: '1',
              scorerName: 'Hyrkkö Artturi',
              scorerShirtNumber: '28',
              team: 'away',
              scoreHome: 0,
              scoreAway: 1,
            },
            {
              eventId: '2',
              code: 'maali',
              time: '12:30',
              period: '1',
              scorerName: 'Lepola Tuomas',
              scorerShirtNumber: '2',
              team: 'away',
              scoreHome: 1,
              scoreAway: 4,
            },
          ],
          penalties: [
            {
              eventId: 'p1',
              code: '2min',
              time: '37:52',
              period: '3',
              playerName: 'Särkkä Leo',
              shirtNumber: '25',
              team: 'away',
              reasonCode: 'ETA',
              reasonText: 'Väärä etäisyys',
            },
          ],
          totalEvents: 227,
        }
        setMatch(fallback)
        setLeaders(computePlayerLeaders(fallback))
      }
      setLoading(false)
    }

    load()
  }, [query.targetId])

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 ${isEmbed ? 'p-2 sm:p-4' : 'pb-12'}`}>
      {!isEmbed && <Header isEmbed={isEmbed} />}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BC0BE]" />
            <p className="text-sm">Ladataan Salibandy Torneopal -tilastoja...</p>
          </div>
        ) : match ? (
          <>
            <PeriodScoreCard match={match} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TimelineEventsList goals={match.goals} penalties={match.penalties} />
              <LeaderboardTable leaders={leaders} />
            </div>
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
