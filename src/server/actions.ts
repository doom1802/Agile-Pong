"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { applyRating } from "@/domain/rating"
import { parseSetScores } from "@/domain/scores"
import { createClient } from "@/lib/supabase/server"
import { requireUser, validateEmail } from "./auth"
import { db } from "./db"
import type { MatchPlayer, MatchWithDetails } from "./db/types"

export const requestLoginCode = async (formData: FormData) => {
  const email = validateEmail(String(formData.get("email") ?? ""))
  if (!email) {
    redirect("/login?error=domain")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  })

  if (error) {
    const reason = error.status === 429 ? "rate-limit" : "send"
    console.error("Unable to send login OTP", {
      code: error.code,
      message: error.message,
      status: error.status
    })
    redirect(`/login?email=${encodeURIComponent(email)}&error=${reason}`)
  }

  redirect(`/login?email=${encodeURIComponent(email)}&sent=1`)
}

export const verifyLoginCode = async (formData: FormData) => {
  const email = validateEmail(String(formData.get("email") ?? ""))
  const code = String(formData.get("code") ?? "")

  if (!email || !/^\d{6,10}$/.test(code.trim())) {
    redirect(`/login?email=${encodeURIComponent(email ?? "")}&sent=1&error=code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: "email"
  })

  if (error || !data.user) {
    redirect(`/login?email=${encodeURIComponent(email)}&sent=1&error=code`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("office_location")
    .eq("id", data.user.id)
    .single()

  redirect(profile?.office_location ? "/" : "/onboarding")
}

export const logout = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  nickname: z.string().trim().min(1).max(40),
  avatarUrl: z.string().trim().max(2048),
  officeLocation: z.string().trim().min(1).max(120)
})

export const saveProfile = async (formData: FormData) => {
  const user = await requireUser()
  const parsed = profileSchema.safeParse({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    officeLocation: String(formData.get("officeLocation") ?? "")
  })

  if (!parsed.success) {
    redirect("/profile?error=invalid")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      nickname: parsed.data.nickname,
      avatar_url: parsed.data.avatarUrl,
      office_location: parsed.data.officeLocation
    })
    .eq("id", user.id)

  if (error) {
    throw new Error("Unable to save profile")
  }

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
