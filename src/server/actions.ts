"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { applyRating } from "@/domain/rating"
import { parseSetScores } from "@/domain/scores"
import { clearSessionCookie, requireUser, setSessionCookie, validateCode, validateEmail } from "./auth"
import { db } from "./db"
import type { MatchPlayer, MatchWithDetails } from "./db/types"

export const requestLoginCode = async (formData: FormData) => {
  const email = validateEmail(String(formData.get("email") ?? ""))
  if (!email) {
    redirect("/login?error=domain")
  }

  redirect(`/login?email=${encodeURIComponent(email)}&sent=1`)
}

export const verifyLoginCode = async (formData: FormData) => {
  const email = validateEmail(String(formData.get("email") ?? ""))
  const code = String(formData.get("code") ?? "")

  if (!email || !validateCode(code)) {
    redirect(`/login?email=${encodeURIComponent(email ?? "")}&error=code`)
  }

  const existingUser = await db.getUserByEmail(email)
  const user = await db.upsertUserByEmail(email)
  const session = await db.createSession(user.id)
  await setSessionCookie(session.token)
  redirect(existingUser || user.officeLocation ? "/" : "/onboarding")
}

export const logout = async () => {
  await clearSessionCookie()
  redirect("/login")
}

export const saveProfile = async (formData: FormData) => {
  const user = await requireUser()
  await db.updateProfile(user.id, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    officeLocation: String(formData.get("officeLocation") ?? "")
  })

  revalidatePath("/")
  redirect("/")
}

const player = (matchId: string, userId: string, side: "A" | "B", position: 1 | 2, ratingKind: MatchPlayer["ratingKind"]): MatchPlayer => ({
  matchId,
  userId,
  side,
  position,
  ratingKind,
  ratingBefore: null,
  ratingAfter: null,
  ratingDelta: null
})

export const createMatch = async (formData: FormData) => {
  const user = await requireUser()
  const type = String(formData.get("type")) === "doubles" ? "doubles" : "singles"
  const mode = String(formData.get("mode")) === "unranked" ? "unranked" : "ranked"
  const pointsToWin = mode === "ranked" ? Number(formData.get("pointsToWin")) : Number(formData.get("pointsToWin") || 0) || null
  const bestOf = mode === "ranked" ? Number(formData.get("bestOf")) : Number(formData.get("bestOf") || 0) || null
  const ratingKind = mode === "ranked" ? (type === "singles" ? "singles" : "doubles") : "none"
  const placeholder = "pending"
  const players =
    type === "singles"
      ? [
          player(placeholder, user.id, "A", 1, ratingKind),
          player(placeholder, String(formData.get("sideB1")), "B", 1, ratingKind)
        ]
      : [
          player(placeholder, user.id, "A", 1, ratingKind),
          player(placeholder, String(formData.get("sideA2")), "A", 2, ratingKind),
          player(placeholder, String(formData.get("sideB1")), "B", 1, ratingKind),
          player(placeholder, String(formData.get("sideB2")), "B", 2, ratingKind)
        ]

  if (new Set(players.map((item) => item.userId)).size !== players.length) {
    redirect("/matches/new?error=duplicate")
  }

  const match = await db.createMatch({
    mode,
    type,
    pointsToWin,
    bestOf,
    createdByUserId: user.id,
    players
  })

  revalidatePath("/")
  revalidatePath("/matches")
  redirect(`/matches?prematch=${match.id}`)
}

export const submitResult = async (formData: FormData) => {
  const user = await requireUser()
  const match = await getMutableMatch(String(formData.get("matchId")))
  const sets = parseSetScores(match.id, String(formData.get("sets") ?? ""))

  match.status = "submitted"
  match.submittedByUserId = user.id
  match.playedAt = new Date().toISOString()
  await db.updateMatch(match)
  await db.replaceMatchSets(match.id, sets)
  await db.addEvent({ matchId: match.id, userId: user.id, type: "submitted" })
  revalidatePath("/matches")
}

export const confirmResult = async (formData: FormData) => {
  const user = await requireUser()
  const match = await getMutableMatch(String(formData.get("matchId")))

  if (match.mode === "ranked" && !match.ratingApplied) {
    const ratings = await db.getRatings()
    const recentSameMatchupCount = await countRecentSameMatchups(match)
    const application = applyRating(match, ratings, recentSameMatchupCount)

    for (const rating of application.ratings) {
      await db.updateRating(rating)
    }

    await db.updateMatchPlayers(match.id, application.matchPlayers)
    match.winnerSide = application.winnerSide
    match.antiFarmingFactor = application.antiFarmingFactor
    match.ratingApplied = true
  }

  if (match.mode === "unranked") {
    match.winnerSide = match.sets.filter((set) => set.sideAPoints > set.sideBPoints).length > match.sets.length / 2 ? "A" : "B"
  }

  match.status = "confirmed"
  match.confirmedByUserId = user.id
  await db.updateMatch(match)
  await db.addEvent({ matchId: match.id, userId: user.id, type: "confirmed" })
  revalidatePath("/")
  revalidatePath("/matches")
  revalidatePath("/leaderboard")
}

const getMutableMatch = async (id: string): Promise<MatchWithDetails> => {
  const match = await db.getMatch(id)
  if (!match) {
    throw new Error("Match not found")
  }

  return match
}

const countRecentSameMatchups = async (match: MatchWithDetails) => {
  const matches = await db.getMatches()
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7
  const key = matchupKey(match)

  return matches.filter((candidate) => candidate.id !== match.id && candidate.mode === "ranked" && candidate.status === "confirmed" && new Date(candidate.createdAt).getTime() > cutoff && matchupKey(candidate) === key).length + 1
}

const matchupKey = (match: MatchWithDetails) => {
  const sideA = match.players
    .filter((candidate) => candidate.side === "A")
    .map((candidate) => candidate.userId)
    .sort()
    .join("+")
  const sideB = match.players
    .filter((candidate) => candidate.side === "B")
    .map((candidate) => candidate.userId)
    .sort()
    .join("+")

  return [sideA, sideB].sort().join("::")
}
