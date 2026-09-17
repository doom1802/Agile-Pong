"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { parseSetScores, validateMatchSets } from "@/domain/scores"
import { getCurrentUser } from "./auth"
import {
  checkQuickInsertAccess,
  createQuickInsertMatch,
  loadQuickInsertPlayers
} from "./quick-insert"

const quickInsertSchema = z.object({
  token: z.string().min(1).max(512),
  type: z.enum(["singles", "doubles"]),
  pointsToWin: z.union([z.literal(11), z.literal(21)]),
  bestOf: z.union([z.literal(3), z.literal(5)]),
  playerIds: z.array(z.string().min(1)).min(2).max(4),
  sets: z.string().min(1)
}).superRefine((value, context) => {
  const expectedPlayers = value.type === "singles" ? 2 : 4
  if (value.playerIds.length !== expectedPlayers) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid player count" })
  }
  if (new Set(value.playerIds).size !== value.playerIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Players must be unique" })
  }
})

export const quickInsertMatch = async (formData: FormData) => {
  const token = String(formData.get("token") ?? "")
  const type = String(formData.get("type")) === "doubles" ? "doubles" : "singles"
  const playerIds = type === "singles"
    ? [String(formData.get("sideA1") ?? ""), String(formData.get("sideB1") ?? "")]
    : [
        String(formData.get("sideA1") ?? ""),
        String(formData.get("sideA2") ?? ""),
        String(formData.get("sideB1") ?? ""),
        String(formData.get("sideB2") ?? "")
      ]
  const parsed = quickInsertSchema.safeParse({
    token,
    type,
    pointsToWin: Number(formData.get("pointsToWin")),
    bestOf: Number(formData.get("bestOf")),
    playerIds,
    sets: String(formData.get("sets") ?? "")
  })

  if (!parsed.success) redirect(quickPath(token, "invalid"))

  const access = await checkQuickInsertAccess(token)
  if (access !== "allowed") redirect(quickPath(token, access))

  const currentUser = await getCurrentUser()
  if (currentUser && parsed.data.playerIds[0] !== currentUser.id) {
    redirect(quickPath(token, "current-player"))
  }

  try {
    const availablePlayers = await loadQuickInsertPlayers()
    const availableIds = new Set(availablePlayers.map((player) => player.id))
    if (parsed.data.playerIds.some((id) => !availableIds.has(id))) throw new Error("player_not_found")

    const sets = parseSetScores("pending", parsed.data.sets)
    validateMatchSets({ mode: "ranked", pointsToWin: parsed.data.pointsToWin, bestOf: parsed.data.bestOf }, sets)
    await createQuickInsertMatch({
      type: parsed.data.type,
      pointsToWin: parsed.data.pointsToWin,
      bestOf: parsed.data.bestOf,
      playerIds: parsed.data.playerIds,
      sets
    })
  } catch (error) {
    redirect(quickPath(token, quickInsertError(error)))
  }

  revalidatePath("/")
  revalidatePath("/matches")
  redirect(`${quickPath(token)}?submitted=1`)
}

const quickPath = (token: string, error?: string) => {
  const path = `/quick/${encodeURIComponent(token)}`
  return error ? `${path}?error=${encodeURIComponent(error)}` : path
}

const quickInsertError = (error: unknown) => {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("sets_after_match_winner")) return "sets-after-winner"
  if (message.includes("insufficient_winning_sets")) return "incomplete-match"
  if (message.includes("sets_do_not_produce_winner")) return "no-winner"
  if (message.includes("invalid_ranked_set") || message.includes("Invalid set score")) return "invalid-set-score"
  if (message.includes("player_not_found") || message.includes("invalid_players")) return "invalid-players"
  if (message.includes("active_season_not_found")) return "no-season"
  return "command-failed"
}
