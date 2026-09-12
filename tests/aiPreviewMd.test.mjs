import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildFloorballPreviewMd } from '../src/utils/buildFloorballPreviewMd.ts'

describe('Floorball AI preview markdown', () => {
  it('exports coach briefing without fabricated football metrics', () => {
    const md = buildFloorballPreviewMd({
      match: {
        matchId: '949661',
        competitionName: 'Etelä-Suomi 2026-27',
        categoryName: 'U14 Pojat VALK B ES',
        date: '2026-09-13',
        time: '16:00',
        venueName: 'Tuusulan Salibandyhalli kenttä 2',
        homeTeamName: 'SB Vantaa Orange',
        awayTeamName: 'Westend Indians Yellow',
        scoreHome: 0,
        scoreAway: 0,
        isLive: false,
        phase: 'upcoming',
        periods: [{ period: 1, scoreHome: 0, scoreAway: 0 }],
        goals: [],
        penalties: [],
        saves: [],
        goalkeepers: {
          home: { goalieName: '—', saves: 0, goalsConceded: 0, savePercentage: '—' },
          away: { goalieName: '—', saves: 0, goalsConceded: 0, savePercentage: '—' },
        },
        totalEvents: 0,
      },
      leaders: [],
      homeRoster: [
        {
          playerId: '119805',
          firstName: 'Simo',
          lastName: 'Oinonen',
          fullName: 'Simo Oinonen',
          shirtNumber: '55',
          birthYear: '2013',
          isCaptain: false,
          goals: 0,
          assists: 0,
          points: 0,
          penaltiesMin: 0,
        },
      ],
    })
    assert.match(md, /Simo Oinonen/)
    assert.match(md, /Prompt tekoälylle/)
    assert.match(md, /ennakko/)
    assert.match(md, /Älä keksi/)
    assert.match(md, /949661/)
  })
})
