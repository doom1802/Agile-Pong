import "server-only"

import { timingSafeEqual } from "node:crypto"
import { headers } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSupabaseConfig } from "@/lib/supabase/config"
import type { Database, Json } from "@/lib/supabase/database.types"
import { db, isMockDataEnabled } from "./db"
import type { MatchPlayer, MatchSet, MatchType } from "./db/types"

export type QuickInsertPlayer = {
  id: string
  firstName: string
  lastName: string
  nickname: string
}

export type QuickInsertAccess = "allowed" | "invalid-token" | "network-denied"

export type QuickInsertInput = {
  type: MatchType
  pointsToWin: 11 | 21
  bestOf: 3 | 5
  playerIds: string[]
  sets: MatchSet[]
}

const configuredToken = () => process.env.QUICK_INSERT_TOKEN ?? (process.env.NODE_ENV === "production" ? "" : "quick-demo")

export const isQuickInsertTokenValid = (candidate: string) => {
  const expected = configuredToken()
  if (!candidate || !expected) return false

  const candidateBytes = Buffer.from(candidate)
  const expectedBytes = Buffer.from(expected)
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes)
}

export const checkQuickInsertAccess = async (token: string): Promise<QuickInsertAccess> => {
  if (!isQuickInsertTokenValid(token)) return "invalid-token"

  const allowedIps = (process.env.QUICK_INSERT_ALLOWED_IPS ?? "")
    .split(",")
    .map((value) => normalizeIp(value))
    .filter(Boolean)

  if (!allowedIps.length) return "allowed"

  const requestHeaders = await headers()
  const forwardedFor = requestHeaders.get("x-vercel-forwarded-for")
    ?? requestHeaders.get("x-forwarded-for")
    ?? requestHeaders.get("x-real-ip")
    ?? ""
  const requestIp = normalizeIp(forwardedFor.split(",")[0] ?? "")
  return requestIp && allowedIps.includes(requestIp) ? "allowed" : "network-denied"
}

export const loadQuickInsertPlayers = async (): Promise<QuickInsertPlayer[]> => {
  if (isMockDataEnabled) {
    const users = await db.getUsers()
    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname
    }))
  }

  const supabase = createAdminClient()
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, nickname")
    .order("nickname")
  if (error) throw new Error("Unable to load quick insert players")

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    nickname: profile.nickname
  }))
}

export const createQuickInsertMatch = async (input: QuickInsertInput) => {
  if (isMockDataEnabled) {
    const ratingKind = input.type === "singles" ? "singles" : "doubles"
    const players: MatchPlayer[] = input.playerIds.map((userId, index) => ({
      matchId: "pending",
      userId,
      side: input.type === "singles" ? (index === 0 ? "A" : "B") : (index < 2 ? "A" : "B"),
      position: input.type === "singles" || index % 2 === 0 ? 1 : 2,
      ratingKind,
      ratingBefore: null,
      ratingAfter: null,
      ratingDelta: null
    }))
    const match = await db.createMatch({
      mode: "ranked",
      type: input.type,
      pointsToWin: input.pointsToWin,
      bestOf: input.bestOf,
      createdByUserId: input.playerIds[0],
      players
    })
    await db.submitMatchResult(match.id, input.playerIds[0], input.sets.map((set) => ({ ...set, matchId: match.id })))
    const submittedMatch = await db.getMatch(match.id)
    if (!submittedMatch) throw new Error("Created match not found")
    submittedMatch.quickInsert = true
    await db.updateMatch(submittedMatch)
    return submittedMatch.id
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("quick_insert_match_command", {
    p_type: input.type,
    p_points_to_win: input.pointsToWin,
    p_best_of: input.bestOf,
    p_player_ids: input.playerIds,
    p_sets: input.sets.map((set) => ({
      sideAPoints: set.sideAPoints,
      sideBPoints: set.sideBPoints
    })) as Json
  })
  if (error || !data) throw new Error(error?.message ?? "Unable to create quick insert match")
  return data
}

const createAdminClient = () => {
  const { url } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Quick Insert")

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const normalizeIp = (value: string) => value.trim().replace(/^::ffff:/, "")
