/**
 * Salibandy / SSBL Torneopal Floorball Data Types
 */

export interface SalibandyGoalEvent {
  eventId: string
  code: 'maali'
  time: string // '4:04'
  period: string // '1', '2', '3'
  scorerName: string
  scorerShirtNumber: string
  assistName?: string
  team: 'home' | 'away'
  scoreHome: number
  scoreAway: number
  description?: string
  isPowerplayGoal?: boolean
  isShorthandedGoal?: boolean
  isEmptyNetGoal?: boolean
}

export interface SalibandyPenaltyEvent {
  eventId: string
  code: '2min' | '5min' | '2+2min' | '20min'
  time: string
  period: string
  playerName: string
  shirtNumber: string
  team: 'home' | 'away'
  reasonCode: string // e.g. 'ETA', 'KOR', 'EST', 'VAP', 'TYO'
  reasonText: string // e.g. 'Väärä etäisyys', 'Korkea maila'
}

export interface SalibandySaveEvent {
  eventId: string
  code: 'torjunta' | 'paastetty'
  time: string
  period: string
  goalieName: string
  team: 'home' | 'away'
}

export interface SalibandyPeriodScore {
  period: number
  scoreHome: number
  scoreAway: number
  shotsHome?: number
  shotsAway?: number
}

export interface SalibandyGoalkeeperStats {
  home: {
    goalieName: string
    saves: number
    goalsConceded: number
    savePercentage: string
  }
  away: {
    goalieName: string
    saves: number
    goalsConceded: number
    savePercentage: string
  }
}

export interface SalibandyMatchDetail {
  matchId: string
  matchNumber?: string
  competitionName: string
  categoryName: string
  date: string
  time: string
  venueName: string
  venueLat?: number
  venueLon?: number
  homeTeamName: string
  awayTeamName: string
  homeTeamId?: string
  awayTeamId?: string
  scoreHome: number
  scoreAway: number
  isLive: boolean
  referee1?: string
  referee2?: string
  spectators?: number
  playingTimeMin?: number
  periods: SalibandyPeriodScore[]
  goals: SalibandyGoalEvent[]
  penalties: SalibandyPenaltyEvent[]
  saves: SalibandySaveEvent[]
  goalkeepers: SalibandyGoalkeeperStats
  totalEvents: number
}

export interface SalibandyPlayerLeader {
  playerName: string
  shirtNumber: string
  teamName: string
  goals: number
  assists: number
  points: number
  penaltiesMin: number
}

export interface SalibandyRosterPlayer {
  playerId: string
  firstName: string
  lastName: string
  fullName: string
  shirtNumber: string
  birthYear: string
  isCaptain: boolean
  imageUrl?: string
  goals: number
  assists: number
  points: number
  penaltiesMin: number
}

export interface SalibandyTeamFixture {
  matchId: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  score?: string
  isHome: boolean
  isWin?: boolean
  isDraw?: boolean
  isLoss?: boolean
  venueName: string
  categoryName: string
}
