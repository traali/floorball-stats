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
  scorerPlayerId?: string
  assistName?: string
  assistPlayerId?: string
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
  playerId?: string
  shirtNumber: string
  team: 'home' | 'away'
  reasonCode: string
  reasonText: string
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
  competitionId?: string
  categoryId?: string
  groupId?: string
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
  phase: 'live' | 'upcoming' | 'played'
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
  matchNumber?: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string
  awayTeamId?: string
  score?: string
  scoreHome?: number
  scoreAway?: number
  isHome: boolean
  isWin?: boolean
  isDraw?: boolean
  isLoss?: boolean
  venueName: string
  categoryName: string
  competitionId?: string
  categoryId?: string
  status?: string
  seasonYear?: string
  seasonHalf?: 'syksy' | 'kevat' | 'all'
}

export interface SalibandySeasonGroup {
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  groupId: string
  groupName: string
  seasonId?: string
  isCurrent?: boolean
  competitionStatus?: string
}

export interface SalibandyTeamProfile {
  teamId: string
  teamName: string
  clubName?: string
  clubId?: string
  clubCrest?: string
  categoryName?: string
  players: SalibandyRosterPlayer[]
  fixtures: SalibandyTeamFixture[]
  groups: SalibandySeasonGroup[]
}

export interface SalibandyStandingRow {
  rank: number
  teamId: string
  teamName: string
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  diff: number
  totalPoints: number
  form: ('V' | 'T' | 'H')[]
}

export interface CustomFloorballTeam {
  id: string
  name: string
  category: string
  addedAt: string
}

export interface SalibandyClubSummary {
  clubId: string
  name: string
  abbreviation: string
  cityName: string
  crest?: string
  region?: string
}

export interface SalibandyClubTeam {
  teamId: string
  teamName: string
  status: string
  categoryName: string
  competitionName: string
  competitionId?: string
  categoryId?: string
  groupId?: string
  season?: string
  venueName?: string
}

export interface SalibandyClubDetail {
  clubId: string
  name: string
  abbreviation: string
  cityName: string
  crest?: string
  www?: string
  districtName?: string
  venueName?: string
  teams: SalibandyClubTeam[]
}

export interface SalibandyCompetition {
  competitionId: string
  competitionName: string
  seasonId: string
  status: string
  startDate?: string
  endDate?: string
  organiser?: string
  locationName?: string
}

export interface SalibandyCategory {
  categoryId: string
  categoryName: string
  competitionId: string
  competitionName: string
  groupCount?: number
  teamCount?: number
  ageGroup?: string
  gender?: string
}

export interface SalibandyGroupSummary {
  groupId: string
  groupName: string
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  teamCount: number
}

export interface SalibandyGroupTeam {
  teamId: string
  teamName: string
  clubId?: string
  crest?: string
  rank: number
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  diff: number
}

export interface SalibandyGroupMatch {
  matchId: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string
  awayTeamId?: string
  scoreHome?: number
  scoreAway?: number
  status: string
  venueName?: string
}

export interface SalibandyGroupDetail {
  groupId: string
  groupName: string
  competitionId: string
  competitionName: string
  categoryId: string
  categoryName: string
  teams: SalibandyGroupTeam[]
  matches: SalibandyGroupMatch[]
}

export interface SalibandyPlayerTeam {
  teamId: string
  teamName: string
  clubName?: string
  categoryName?: string
  competitionName?: string
  shirtNumber?: string
}

export interface SalibandyPlayerMatch {
  matchId: string
  date: string
  time: string
  status: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string
  awayTeamId?: string
  scoreHome?: number
  scoreAway?: number
  categoryName: string
  competitionName: string
  seasonId?: string
  goals: number
  assists: number
  points: number
  pim: number
  plusMinus?: number
  shots?: number
  saves?: number
  venueName?: string
}

export interface SalibandyPlayerProfile {
  playerId: string
  firstName: string
  lastName: string
  fullName: string
  birthYear?: string
  age?: number
  clubId?: string
  clubName?: string
  imageUrl?: string
  ageGroup?: string
  teams: SalibandyPlayerTeam[]
  matches: SalibandyPlayerMatch[]
  upcoming: SalibandyPlayerMatch[]
}

export interface DiscoveryHit {
  kind: 'club' | 'team' | 'match' | 'player' | 'competition' | 'category'
  id: string
  title: string
  subtitle: string
  crest?: string
}

export interface FavoriteTeam {
  id: string
  name: string
  category?: string
  clubName?: string
}

export interface FavoritePlayer {
  id: string
  name: string
  teamName?: string
  imgUrl?: string
}
