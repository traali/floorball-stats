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
}

export interface SalibandyPenaltyEvent {
  eventId: string
  code: '2min' | '5min' | '2+2min' | '20min'
  time: string
  period: string
  playerName: string
  shirtNumber: string
  team: 'home' | 'away'
  reasonCode: string // e.g. 'ETA', 'KOR', 'EST', 'VAP'
  reasonText: string // e.g. 'Väärä etäisyys', 'Korkea maila'
}

export interface SalibandyPeriodScore {
  period: number
  scoreHome: number
  scoreAway: number
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
  scoreHome: number
  scoreAway: number
  isLive: boolean
  periods: SalibandyPeriodScore[]
  goals: SalibandyGoalEvent[]
  penalties: SalibandyPenaltyEvent[]
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
