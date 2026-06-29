export type MatchMode = "ranked" | "unranked"
export type MatchType = "singles" | "doubles"
export type Side = "A" | "B"
export type RatingKind = "singles" | "doubles" | "none"

export type MatchStatus =
  | "ready"
  | "submitted"
  | "confirmed"
  | "disputed"
  | "cancelled"

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  nickname: string
  avatarUrl: string
  officeLocation: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
}

export type PlayerRating = {
  userId: string
  singlesRating: number
  doublesRating: number
  singlesRankedMatches: number
  doublesRankedMatches: number
  createdAt: string
  updatedAt: string
}

export type Match = {
  id: string
  mode: MatchMode
  type: MatchType
  status: MatchStatus
  pointsToWin: number | null
  bestOf: number | null
  winnerSide: Side | null
  playedAt: string | null
  createdByUserId: string
  ratingApplied: boolean
  antiFarmingFactor: number
  submittedByUserId: string | null
  confirmedByUserId: string | null
  createdAt: string
}

export type MatchPlayer = {
  matchId: string
  userId: string
  side: Side
  position: 1 | 2
  ratingKind: RatingKind
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
}

export type MatchSet = {
  matchId: string
  setNumber: number
  sideAPoints: number
  sideBPoints: number
}

export type MatchEvent = {
  id: string
  matchId: string
  userId: string
  type:
    | "created"
    | "submitted"
    | "confirmed"
    | "disputed"
    | "cancelled"
    | "admin_edited"
    | "admin_deleted"
  createdAt: string
}

export type MatchWithDetails = Match & {
  players: MatchPlayer[]
  sets: MatchSet[]
  events: MatchEvent[]
}

export type Session = {
  id: string
  userId: string
  token: string
  expiresAt: string
  lastSeenAt: string
  createdAt: string
  revokedAt: string | null
}
