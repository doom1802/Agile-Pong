import { createClient } from "@/lib/supabase/server"
import type { Repository } from "./repository"
import type { MatchEvent, MatchPlayer, MatchSet, MatchWithDetails, PlayerRating, User } from "./types"

type ProfileRow = Awaited<ReturnType<typeof profileRows>>[number]

const profileRows = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").select("*").order("created_at")
  if (error) throw new Error("Unable to load players")
  return data
}

const toUser = (profile: ProfileRow): User => ({
  id: profile.id,
  email: profile.email,
  firstName: profile.first_name,
  lastName: profile.last_name,
  nickname: profile.nickname,
  avatarUrl: profile.avatar_url,
  officeLocation: profile.office_location,
  isAdmin: false,
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  lastLoginAt: profile.last_login_at
})

const toRating = (row: {
  user_id: string
  singles_rating: number
  doubles_rating: number
  singles_ranked_matches: number
  doubles_ranked_matches: number
  created_at: string
  updated_at: string
}): PlayerRating => ({
  userId: row.user_id,
  singlesRating: row.singles_rating,
  doublesRating: row.doubles_rating,
  singlesRankedMatches: row.singles_ranked_matches,
  doublesRankedMatches: row.doubles_ranked_matches,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const toPlayer = (row: {
  match_id: string
  user_id: string
  side: "A" | "B"
  position: number
  rating_kind: "singles" | "doubles" | "none"
  rating_before: number | null
  rating_after: number | null
  rating_delta: number | null
}): MatchPlayer => ({
  matchId: row.match_id,
  userId: row.user_id,
  side: row.side,
  position: row.position as 1 | 2,
  ratingKind: row.rating_kind,
  ratingBefore: row.rating_before,
  ratingAfter: row.rating_after,
  ratingDelta: row.rating_delta
})

const toSet = (row: {
  match_id: string
  set_number: number
  side_a_points: number
  side_b_points: number
}): MatchSet => ({
  matchId: row.match_id,
  setNumber: row.set_number,
  sideAPoints: row.side_a_points,
  sideBPoints: row.side_b_points
})

const toEvent = (row: {
  id: string
  match_id: string
  user_id: string
  type: MatchEvent["type"]
  created_at: string
}): MatchEvent => ({
  id: row.id,
  matchId: row.match_id,
  userId: row.user_id,
  type: row.type,
  createdAt: row.created_at
})

const toMatch = (row: any): MatchWithDetails => ({
  id: row.id,
  mode: row.mode,
  type: row.type,
  status: row.status,
  pointsToWin: row.points_to_win,
  bestOf: row.best_of,
  winnerSide: row.winner_side,
  playedAt: row.played_at,
  createdByUserId: row.created_by_user_id,
  ratingApplied: row.rating_applied,
  antiFarmingFactor: Number(row.anti_farming_factor),
  submittedByUserId: row.submitted_by_user_id,
  confirmedByUserId: row.confirmed_by_user_id,
  createdAt: row.created_at,
  players: (row.match_players ?? []).map(toPlayer),
  sets: (row.match_sets ?? []).sort((a: any, b: any) => a.set_number - b.set_number).map(toSet),
  events: (row.match_events ?? []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map(toEvent)
})

const unsupportedWrite = (): never => {
  throw new Error("This write must be performed by a transactional Supabase command")
}

export const supabaseRepository: Repository = {
  async getUsers() {
    return (await profileRows()).map(toUser)
  },
  async getUserById(id) {
    return (await this.getUsers()).find((user) => user.id === id) ?? null
  },
  async getUserByEmail(email) {
    return (await this.getUsers()).find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
  },
  async getRatings() {
    const supabase = await createClient()
    const { data, error } = await supabase.from("player_ratings").select("*").order("updated_at", { ascending: false })
    if (error) throw new Error("Unable to load ratings")
    return data.map(toRating)
  },
  async getRating(userId) {
    const rating = (await this.getRatings()).find((candidate) => candidate.userId === userId)
    if (!rating) throw new Error("Rating not found")
    return rating
  },
  async getMatches() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("matches")
      .select("*, match_players(*), match_sets(*), match_events(*)")
      .order("created_at", { ascending: false })
    if (error) throw new Error("Unable to load matches")
    return data.map(toMatch)
  },
  async getMatch(id) {
    return (await this.getMatches()).find((match) => match.id === id) ?? null
  },
  async upsertUserByEmail() { return unsupportedWrite() },
  async updateProfile() { return unsupportedWrite() },
  async updateRating() { return unsupportedWrite() },
  async createSession() { return unsupportedWrite() },
  async getSessionByToken() { return null },
  async revokeSession() { return unsupportedWrite() },
  async createMatch(input) {
    const supabase = await createClient()
    const orderedPlayers = [...input.players].sort((a, b) => {
      if (a.side !== b.side) return a.side === "A" ? -1 : 1
      return a.position - b.position
    })
    const { data: id, error } = await supabase.rpc("create_match_command", {
      p_mode: input.mode,
      p_type: input.type,
      p_points_to_win: input.pointsToWin ?? 0,
      p_best_of: input.bestOf ?? 0,
      p_player_ids: orderedPlayers.map((player) => player.userId)
    })
    if (error || !id) throw new Error(error?.message ?? "Unable to create match")
    const match = await this.getMatch(id)
    if (!match) throw new Error("Created match not found")
    return match
  },
  async submitMatchResult(matchId, _userId, sets) {
    const supabase = await createClient()
    const { error } = await supabase.rpc("submit_match_result_command", {
      p_match_id: matchId,
      p_sets: sets.map((set) => ({ sideAPoints: set.sideAPoints, sideBPoints: set.sideBPoints }))
    })
    if (error) throw new Error(error.message)
  },
  async confirmMatchResult(matchId) {
    const supabase = await createClient()
    const { error } = await supabase.rpc("confirm_match_result_command", { p_match_id: matchId })
    if (error) throw new Error(error.message)
  },
  async editLastMatchResult(matchId, _userId, sets) {
    const supabase = await createClient()
    const { error } = await supabase.rpc("edit_last_match_result_command", {
      p_match_id: matchId,
      p_sets: sets.map((set) => ({ sideAPoints: set.sideAPoints, sideBPoints: set.sideBPoints }))
    })
    if (error) throw new Error(error.message)
  },
  async cancelMatch(matchId) {
    const supabase = await createClient()
    const { error } = await supabase.rpc("cancel_match_command", { p_match_id: matchId })
    if (error) throw new Error(error.message)
  },
  async disputeMatch(matchId) {
    const supabase = await createClient()
    const { error } = await supabase.rpc("dispute_match_command", { p_match_id: matchId })
    if (error) throw new Error(error.message)
  },
  async updateMatch() { return unsupportedWrite() },
  async replaceMatchSets() { return unsupportedWrite() },
  async updateMatchPlayers() { return unsupportedWrite() },
  async addEvent() { return unsupportedWrite() }
}
