import type {
  Match,
  MatchEvent,
  MatchPlayer,
  MatchSet,
  MatchWithDetails,
  PlayerRating,
  Session,
  User
} from "./types"

export type CreateMatchInput = {
  mode: Match["mode"]
  type: Match["type"]
  pointsToWin: number | null
  bestOf: number | null
  createdByUserId: string
  players: Array<Pick<MatchPlayer, "userId" | "side" | "position" | "ratingKind">>
}

export type Repository = {
  getUsers(): Promise<User[]>
  getUserById(id: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  upsertUserByEmail(email: string): Promise<User>
  updateProfile(userId: string, profile: Partial<Pick<User, "firstName" | "lastName" | "nickname" | "avatarUrl" | "officeLocation">>): Promise<User>
  getRatings(): Promise<PlayerRating[]>
  getRating(userId: string): Promise<PlayerRating>
  updateRating(rating: PlayerRating): Promise<void>
  createSession(userId: string): Promise<Session>
  getSessionByToken(token: string): Promise<Session | null>
  revokeSession(token: string): Promise<void>
  createMatch(input: CreateMatchInput): Promise<MatchWithDetails>
  submitMatchResult(matchId: string, userId: string, sets: MatchSet[]): Promise<void>
  confirmMatchResult(matchId: string, userId: string): Promise<void>
  cancelMatch(matchId: string, userId: string): Promise<void>
  disputeMatch(matchId: string, userId: string): Promise<void>
  getMatches(): Promise<MatchWithDetails[]>
  getMatch(id: string): Promise<MatchWithDetails | null>
  updateMatch(match: Match): Promise<void>
  replaceMatchSets(matchId: string, sets: MatchSet[]): Promise<void>
  updateMatchPlayers(matchId: string, players: MatchPlayer[]): Promise<void>
  addEvent(event: Omit<MatchEvent, "id" | "createdAt">): Promise<void>
}
