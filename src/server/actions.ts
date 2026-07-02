"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Buffer } from "node:buffer"
import { z } from "zod"
import { parseSetScores, validateMatchSets } from "@/domain/scores"
import { createClient } from "@/lib/supabase/server"
import { clearMockSessionCookie, isMockAuthEnabled, requireUser, setMockSessionCookie, validateEmail, validateMockCode } from "./auth"
import { db } from "./db"
import type { MatchPlayer } from "./db/types"

export const requestLoginCode = async (formData: FormData) => {
  const rawEmail = String(formData.get("email") ?? "")
  const email = validateEmail(rawEmail)
  if (!email) {
    console.warn("Rejected login code request: email outside allowed domain", { rawEmail })
    redirect("/login?error=domain")
  }

  if (isMockAuthEnabled) {
    redirect(`/login?email=${encodeURIComponent(email)}&sent=1&t=${Date.now()}`)
  }

  const supabase = await createClient()
  const requestedAt = Date.now()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  })

  if (error) {
    const reason = error.status === 429 ? "rate-limit" : "send"
    console.error("Unable to send login OTP", {
      email,
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
      msElapsed: Date.now() - requestedAt
    })
    redirect(`/login?email=${encodeURIComponent(email)}&error=${reason}`)
  }

  const sentAt = Date.now()
  console.info("Login OTP requested", {
    email,
    sentAt,
    msElapsed: sentAt - requestedAt
  })
  // Requesting a new code invalidates any previously sent code, so the UI must
  // always point users at the timestamp of the most recent send.
  redirect(`/login?email=${encodeURIComponent(email)}&sent=1&t=${sentAt}`)
}

export const verifyLoginCode = async (formData: FormData) => {
  const email = validateEmail(String(formData.get("email") ?? ""))
  const code = String(formData.get("code") ?? "")
  const sentAt = String(formData.get("t") ?? "")
  const sentAtMs = /^\d{13}$/.test(sentAt) ? Number(sentAt) : null
  // Preserve the original send timestamp across failed attempts so the resend
  // cooldown stays accurate and the error message keeps pointing at the latest code.
  const sentParam = sentAtMs ? `&t=${sentAtMs}` : ""

  if (isMockAuthEnabled) {
    if (!email || !validateMockCode(code)) {
      redirect(`/login?email=${encodeURIComponent(email ?? "")}&sent=1&error=code${sentParam}`)
    }

    const existingUser = await db.getUserByEmail(email)
    const user = await db.upsertUserByEmail(email)
    const session = await db.createSession(user.id)
    await setMockSessionCookie(session.token)
    redirect(existingUser || user.officeLocation ? "/" : "/onboarding")
  }

  if (!email || !/^\d{6,10}$/.test(code.trim())) {
    console.warn("Rejected login code before calling Supabase", {
      email,
      hasEmail: Boolean(email),
      codeLength: code.trim().length,
      sentAt: sentAtMs,
      msSinceSent: sentAtMs ? Date.now() - sentAtMs : null
    })
    redirect(`/login?email=${encodeURIComponent(email ?? "")}&sent=1&error=code${sentParam}`)
  }

  const supabase = await createClient()
  const verifyCalledAt = Date.now()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: "email"
  })

  if (error || !data.user) {
    console.error("Unable to verify login OTP", {
      email,
      name: error?.name,
      code: error?.code,
      message: error?.message,
      status: error?.status,
      hasUser: Boolean(data?.user),
      codeLength: code.trim().length,
      sentAt: sentAtMs,
      msSinceSent: sentAtMs ? verifyCalledAt - sentAtMs : null,
      msSinceVerifyCall: Date.now() - verifyCalledAt
    })
    redirect(`/login?email=${encodeURIComponent(email)}&sent=1&error=code${sentParam}`)
  }

  console.info("Verified login OTP", {
    email,
    sentAt: sentAtMs,
    msSinceSent: sentAtMs ? verifyCalledAt - sentAtMs : null,
    msSinceVerifyCall: Date.now() - verifyCalledAt
  })

  const { data: profile } = await supabase
    .from("profiles")
    .select("office_location")
    .eq("id", data.user.id)
    .single()

  redirect(profile?.office_location ? "/" : "/onboarding")
}

export const logout = async () => {
  if (isMockAuthEnabled) {
    await clearMockSessionCookie()
    redirect("/login")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error("Unable to sign out")
  redirect("/login")
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  nickname: z.string().trim().min(1).max(40),
  avatarUrl: z.string().trim().max(700_000).refine(
    (value) => value === "" || value.startsWith("https://") || /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value),
    "Invalid avatar"
  ),
  officeLocation: z.string().trim().min(1).max(120)
})

export const saveProfile = async (formData: FormData) => {
  const user = await requireUser()
  const profilePath = user.officeLocation ? "/profile" : "/onboarding"
  const parsed = profileSchema.safeParse({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    officeLocation: String(formData.get("officeLocation") ?? "")
  })

  if (!parsed.success) {
    redirect(`${profilePath}?error=invalid`)
  }

  if (parsed.data.avatarUrl.startsWith("https://") && parsed.data.avatarUrl !== user.avatarUrl) {
    redirect(`${profilePath}?error=invalid`)
  }

  if (isMockAuthEnabled) {
    try {
      await db.updateProfile(user.id, parsed.data)
    } catch (error) {
      if (error instanceof Error && error.message === "nickname_taken") redirect(`${profilePath}?error=nickname-taken`)
      throw error
    }
    revalidatePath("/")
    redirect("/")
  }

  const supabase = await createClient()
  let avatarUrl = parsed.data.avatarUrl

  if (avatarUrl.startsWith("data:image/jpeg;base64,")) {
    const encoded = avatarUrl.slice("data:image/jpeg;base64,".length)
    const image = Buffer.from(encoded, "base64")
    const isJpeg = image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
    if (!isJpeg || image.length > 512 * 1024) redirect(`${profilePath}?error=invalid`)

    const objectPath = `${user.id}/avatar.jpg`
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(objectPath, image, { cacheControl: "3600", contentType: "image/jpeg", upsert: true })
    if (uploadError) redirect(`${profilePath}?error=avatar`)

    const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath)
    avatarUrl = `${data.publicUrl}?v=${Date.now()}`
  } else if (!avatarUrl && user.avatarUrl.includes("/storage/v1/object/public/avatars/")) {
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`])
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      nickname: parsed.data.nickname,
      avatar_url: avatarUrl,
      office_location: parsed.data.officeLocation
    })
    .eq("id", user.id)

  if (error) {
    if (error.code === "23505") redirect(`${profilePath}?error=nickname-taken`)
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

const createMatchSchema = z.object({
  mode: z.enum(["ranked", "unranked"]),
  type: z.enum(["singles", "doubles"]),
  pointsToWin: z.number().int().nullable(),
  bestOf: z.number().int().nullable(),
  playerIds: z.array(z.string().min(1)).min(2).max(4)
}).superRefine((value, context) => {
  const expected = value.type === "singles" ? 2 : 4
  if (value.playerIds.length !== expected) context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid player count" })
  if (new Set(value.playerIds).size !== value.playerIds.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Players must be unique" })
  if (value.mode === "ranked" && (![11, 21].includes(value.pointsToWin ?? 0) || ![3, 5].includes(value.bestOf ?? 0))) context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid ranked format" })
})

const matchCommandSchema = z.object({ matchId: z.string().trim().min(1).max(100) })

export const createMatch = async (formData: FormData) => {
  const user = await requireUser()
  const type = String(formData.get("type")) === "doubles" ? "doubles" : "singles"
  const mode = String(formData.get("mode")) === "unranked" ? "unranked" : "ranked"
  const pointsToWin = mode === "ranked" ? Number(formData.get("pointsToWin")) : Number(formData.get("pointsToWin") || 0) || null
  const bestOf = mode === "ranked" ? Number(formData.get("bestOf")) : Number(formData.get("bestOf") || 0) || null
  const rawPlayerIds = type === "singles"
    ? [user.id, String(formData.get("sideB1") ?? "")]
    : [user.id, String(formData.get("sideA2") ?? ""), String(formData.get("sideB1") ?? ""), String(formData.get("sideB2") ?? "")]
  const parsed = createMatchSchema.safeParse({ mode, type, pointsToWin, bestOf, playerIds: rawPlayerIds })
  if (!parsed.success) redirect(`/matches/new?error=${new Set(rawPlayerIds).size !== rawPlayerIds.length ? "duplicate" : "invalid"}`)
  const ratingKind = mode === "ranked" ? (type === "singles" ? "singles" : "doubles") : "none"
  const placeholder = "pending"
  const players =
    type === "singles"
      ? [
          player(placeholder, user.id, "A", 1, ratingKind),
          player(placeholder, rawPlayerIds[1], "B", 1, ratingKind)
        ]
      : [
          player(placeholder, user.id, "A", 1, ratingKind),
          player(placeholder, rawPlayerIds[1], "A", 2, ratingKind),
          player(placeholder, rawPlayerIds[2], "B", 1, ratingKind),
          player(placeholder, rawPlayerIds[3], "B", 2, ratingKind)
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
  const parsed = matchCommandSchema.safeParse({ matchId: formData.get("matchId") })
  if (!parsed.success) redirect("/matches?error=invalid-request")
  let sets
  try {
    sets = parseSetScores(parsed.data.matchId, String(formData.get("sets") ?? ""))
    const match = await db.getMatch(parsed.data.matchId)
    if (!match) throw new Error("match_not_found")
    validateMatchSets(match, sets)
  } catch (error) { redirect(`/matches?error=${commandError(error)}`) }
  try { await db.submitMatchResult(parsed.data.matchId, user.id, sets) } catch (error) { redirect(`/matches?error=${commandError(error)}`) }
  revalidateMatchViews()
}

export const confirmResult = async (formData: FormData) => {
  const user = await requireUser()
  await runMatchCommand(formData, (matchId) => db.confirmMatchResult(matchId, user.id))
}

export const editLastMatchResult = async (formData: FormData) => {
  const user = await requireUser()
  const parsed = matchCommandSchema.safeParse({ matchId: formData.get("matchId") })
  if (!parsed.success) redirect("/matches?error=invalid-request")
  try {
    const sets = parseSetScores(parsed.data.matchId, String(formData.get("sets") ?? ""))
    const match = await db.getMatch(parsed.data.matchId)
    if (!match) throw new Error("match_not_found")
    validateMatchSets(match, sets)
    await db.editLastMatchResult(parsed.data.matchId, user.id, sets)
  } catch (error) {
    redirect(`/matches?error=${commandError(error)}`)
  }
  revalidateMatchViews()
  redirect("/matches?updated=result")
}

export const cancelMatch = async (formData: FormData) => {
  const user = await requireUser()
  await runMatchCommand(formData, (matchId) => db.cancelMatch(matchId, user.id))
}

export const disputeMatch = async (formData: FormData) => {
  const user = await requireUser()
  await runMatchCommand(formData, (matchId) => db.disputeMatch(matchId, user.id))
}

const runMatchCommand = async (formData: FormData, command: (matchId: string) => Promise<void>) => {
  const parsed = matchCommandSchema.safeParse({ matchId: formData.get("matchId") })
  if (!parsed.success) redirect("/matches?error=invalid-request")
  try { await command(parsed.data.matchId) } catch (error) { redirect(`/matches?error=${commandError(error)}`) }
  revalidateMatchViews()
}

const revalidateMatchViews = () => {
  revalidatePath("/")
  revalidatePath("/matches")
  revalidatePath("/leaderboard")
  revalidatePath("/players", "layout")
}

const commandError = (error: unknown) => {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("authentication_required") || message.includes("session")) return "session-expired"
  if (message.includes("opposite_side")) return "opposite-side-required"
  if (message.includes("edit_window_expired")) return "edit-window-expired"
  if (message.includes("not_latest_match")) return "not-latest-match"
  if (message.includes("not_a_participant") || message.includes("permission")) return "not-authorized"
  if (message.includes("sets_after_match_winner")) return "sets-after-winner"
  if (message.includes("insufficient_winning_sets")) return "incomplete-match"
  if (message.includes("sets_do_not_produce_winner") || message.includes("produce a winner")) return "no-winner"
  if (message.includes("invalid_ranked_set") || message.includes("Invalid set score")) return "invalid-set-score"
  if (message.includes("invalid_ranked_format")) return "invalid-format"
  if (message.includes("Add at least one set")) return "missing-score"
  if (message.includes("rating_not_found") || message.includes("Missing rating")) return "rating-not-found"
  if (message.includes("score") || message.includes("sets_") || message.includes("winning_sets")) return "invalid-score"
  if (message.includes("not_ready") || message.includes("not_submitted") || message.includes("not_confirmed") || message.includes("not_cancellable")) return "invalid-state"
  if (message.includes("not_found")) return "not-found"
  return "command-failed"
}
