import { randomUUID } from "crypto"
import { applyRating, deriveWinner } from "@/domain/rating"
import { createInitialStore, ensureSeededMatches, type MockStore } from "./mock-data"
import type { CreateMatchInput, Repository } from "./repository"
import type { Match, MatchEvent, MatchPlayer, MatchSet, MatchWithDetails, PlayerRating, Session, User } from "./types"

declare global {
  var agilePongStore: MockStore | undefined
}

const store = () => {
  if (!globalThis.agilePongStore) {
    globalThis.agilePongStore = createInitialStore()
  }

  ensureSeededMatches(globalThis.agilePongStore)
  return globalThis.agilePongStore
}

const now = () => new Date().toISOString()

const displayPartsFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "player"
  const words = localPart.split(/[._-]/).filter(Boolean)
  const firstName = words[0] ? words[0][0].toUpperCase() + words[0].slice(1) : "New"
  const lastName = words[1] ? words[1][0].toUpperCase() + words[1].slice(1) : "Player"

  return { firstName, lastName, nickname: firstName }
}

export const mockRepository: Repository = {
  async getUsers() {
    return [...store().users]
  },

  async getUserById(id) {
    return store().users.find((user) => user.id === id) ?? null
  },

  async getUserByEmail(email) {
    return store().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
  },

  async upsertUserByEmail(email) {
    const existing = await this.getUserByEmail(email)

    if (existing) {
      existing.lastLoginAt = now()
      existing.updatedAt = now()
      return existing
    }

    const profile = displayPartsFromEmail(email)
    const user: User = {
      id: randomUUID(),
      email,
      ...profile,
      avatarUrl: "",
      officeLocation: "",
      isAdmin: ["domenico@agilelab.it", "domenicobulfamante@agilelab.it"].includes(email.toLowerCase()),
      createdAt: now(),
      updatedAt: now(),
      lastLoginAt: now()
    }

    store().users.push(user)
    store().ratings.push({
      userId: user.id,
      singlesRating: 1000,
      doublesRating: 1000,
      singlesRankedMatches: 0,
      doublesRankedMatches: 0,
      createdAt: now(),
      updatedAt: now()
    })

    return user
  },

  async updateProfile(userId, profile) {
    const user = store().users.find((candidate) => candidate.id === userId)

    if (!user) {
      throw new Error("User not found")
    }

    if (profile.nickname) {
      const normalizedNickname = profile.nickname.trim().toLowerCase()
      const duplicate = store().users.some((candidate) =>
        candidate.id !== userId && candidate.nickname.trim().toLowerCase() === normalizedNickname
      )
      if (duplicate) throw new Error("nickname_taken")
    }

    Object.assign(user, profile, { updatedAt: now() })
    return user
  },

  async getRatings() {
    return [...store().ratings]
  },

  async getRating(userId) {
    let rating = store().ratings.find((candidate) => candidate.userId === userId)

    if (!rating) {
      rating = {
        userId,
        singlesRating: 1000,
        doublesRating: 1000,
        singlesRankedMatches: 0,
        doublesRankedMatches: 0,
        createdAt: now(),
        updatedAt: now()
      }
      store().ratings.push(rating)
    }

    return { ...rating }
  },

  async updateRating(rating: PlayerRating) {
    const index = store().ratings.findIndex((candidate) => candidate.userId === rating.userId)
    const next = { ...rating, updatedAt: now() }

    if (index >= 0) {
      store().ratings[index] = next
    } else {
      store().ratings.push(next)
    }
  },

  async createSession(userId) {
    const session: Session = {
      id: randomUUID(),
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      lastSeenAt: now(),
      createdAt: now(),
      revokedAt: null
    }

    store().sessions.push(session)
    return session
  },

  async getSessionByToken(token) {
    const session = store().sessions.find((candidate) => candidate.token === token && !candidate.revokedAt)
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      return null
    }

    session.lastSeenAt = now()
    return session
  },

  async revokeSession(token) {
    const session = store().sessions.find((candidate) => candidate.token === token)
    if (session) {
      session.revokedAt = now()
    }
  },

  async createMatch(input: CreateMatchInput) {
    const id = randomUUID()
    const match: MatchWithDetails = {
      id,
      mode: input.mode,
      type: input.type,
      status: "ready",
      pointsToWin: input.pointsToWin,
      bestOf: input.bestOf,
      winnerSide: null,
      playedAt: null,
      createdByUserId: input.createdByUserId,
      ratingApplied: false,
      antiFarmingFactor: 1,
      submittedByUserId: null,
      confirmedByUserId: null,
      createdAt: now(),
      players: input.players.map((player) => ({ ...player, matchId: id, ratingBefore: null, ratingAfter: null, ratingDelta: null })),
      sets: [],
      events: []
    }

    store().matches.unshift(match)
    await this.addEvent({ matchId: id, userId: input.createdByUserId, type: "created" })

    return match
  },

  async submitMatchResult(matchId, userId, sets) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) throw new Error("match_not_found")
    if (match.status !== "ready") throw new Error("match_not_ready")
    if (!match.players.some((player) => player.userId === userId)) throw new Error("not_a_participant")
    match.sets = sets
    match.status = "submitted"
    match.submittedByUserId = userId
    match.playedAt = now()
    await this.addEvent({ matchId, userId, type: "submitted" })
  },

  async confirmMatchResult(matchId, userId) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) throw new Error("match_not_found")
    if (match.status === "confirmed" && match.confirmedByUserId === userId) return
    if (match.status !== "submitted") throw new Error("match_not_submitted")
    const submitter = match.players.find((player) => player.userId === match.submittedByUserId)
    const confirmer = match.players.find((player) => player.userId === userId)
    if (!confirmer) throw new Error("not_a_participant")
    if (!submitter || submitter.side === confirmer.side) throw new Error("confirmation_requires_opposite_side")

    match.winnerSide = deriveWinner(match.sets)
    if (match.mode === "ranked") {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      const key = matchupKey(match)
      const count = store().matches.filter((candidate) => candidate.id !== match.id && candidate.mode === "ranked" && candidate.status === "confirmed" && new Date(candidate.playedAt ?? candidate.createdAt).getTime() >= cutoff && matchupKey(candidate) === key).length + 1
      const application = applyRating(match, store().ratings, count)
      const day = (match.playedAt ?? now()).slice(0, 10)
      for (const side of ["A", "B"] as const) {
        const players = application.matchPlayers.filter((player) => player.side === side)
        const desired = players[0]?.ratingDelta ?? 0
        const room = Math.min(...players.map((player) => {
          const used = store().matches.flatMap((candidate) => candidate.status === "confirmed" && (candidate.playedAt ?? "").slice(0, 10) === day ? candidate.players : []).filter((old) => old.userId === player.userId).reduce((sum, old) => sum + (old.ratingDelta ?? 0), 0)
          return desired >= 0 ? 80 - used : 80 + used
        }))
        const common = Math.sign(desired) * Math.max(0, Math.min(Math.abs(desired), room))
        for (const player of players) {
          player.ratingDelta = common
          player.ratingAfter = (player.ratingBefore ?? 1000) + common
        }
      }
      match.players = application.matchPlayers
      match.antiFarmingFactor = application.antiFarmingFactor
      for (const player of match.players) {
        const rating = store().ratings.find((candidate) => candidate.userId === player.userId)
        if (!rating) continue
        if (match.type === "singles") {
          rating.singlesRating = player.ratingAfter ?? rating.singlesRating
          rating.singlesRankedMatches += 1
        } else {
          rating.doublesRating = player.ratingAfter ?? rating.doublesRating
          rating.doublesRankedMatches += 1
        }
      }
      match.ratingApplied = true
    }
    match.status = "confirmed"
    match.confirmedByUserId = userId
    await this.addEvent({ matchId, userId, type: "confirmed" })
  },

  async editLastMatchResult(matchId, userId, sets) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) throw new Error("match_not_found")
    if (match.status !== "confirmed") throw new Error("match_not_confirmed")
    if (!match.players.some((player) => player.userId === userId)) throw new Error("not_a_participant")
    const confirmedAt = match.events.find((event) => event.type === "confirmed")?.createdAt
    if (!confirmedAt || Date.now() > new Date(confirmedAt).getTime() + 60 * 60 * 1000) throw new Error("edit_window_expired")
    const participantIds = new Set(match.players.map((player) => player.userId))
    const matchTime = match.playedAt ?? match.createdAt
    const hasLaterMatch = store().matches.some((candidate) =>
      candidate.id !== match.id && (candidate.status === "submitted" || candidate.status === "confirmed") &&
      (candidate.playedAt ?? candidate.createdAt) > matchTime &&
      candidate.players.some((player) => participantIds.has(player.userId)))
    if (hasLaterMatch) throw new Error("not_latest_match")
    if (match.mode === "ranked" && match.ratingApplied) {
      for (const player of match.players) {
        const rating = store().ratings.find((candidate) => candidate.userId === player.userId)
        if (!rating) continue
        if (match.type === "singles") {
          rating.singlesRating -= player.ratingDelta ?? 0
          rating.singlesRankedMatches -= 1
        } else {
          rating.doublesRating -= player.ratingDelta ?? 0
          rating.doublesRankedMatches -= 1
        }
      }
    }
    match.sets = sets
    match.players = match.players.map((player) => ({ ...player, ratingBefore: null, ratingAfter: null, ratingDelta: null }))
    const editorSide = match.players.find((player) => player.userId === userId)?.side
    match.status = "submitted"
    match.winnerSide = null
    match.ratingApplied = false
    match.antiFarmingFactor = 1
    match.submittedByUserId = match.players.find((player) => player.side !== editorSide)?.userId ?? null
    match.confirmedByUserId = null
    await this.addEvent({ matchId, userId, type: "admin_edited" })
    await this.confirmMatchResult(matchId, userId)
  },

  async cancelMatch(matchId, userId) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) throw new Error("match_not_found")
    if (!match.players.some((player) => player.userId === userId)) throw new Error("not_a_participant")
    if (match.status === "cancelled") return
    if (match.status !== "ready" && match.status !== "submitted") throw new Error("match_not_cancellable")
    match.status = "cancelled"
    await this.addEvent({ matchId, userId, type: "cancelled" })
  },

  async disputeMatch(matchId, userId) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) throw new Error("match_not_found")
    if (!match.players.some((player) => player.userId === userId)) throw new Error("not_a_participant")
    if (match.status === "disputed") return
    if (match.status !== "submitted") throw new Error("match_not_submitted")
    match.status = "disputed"
    await this.addEvent({ matchId, userId, type: "disputed" })
  },

  async getMatches() {
    return store().matches.map((match) => ({ ...match, players: [...match.players], sets: [...match.sets], events: [...match.events] }))
  },

  async getMatch(id) {
    const match = store().matches.find((candidate) => candidate.id === id)
    return match ? { ...match, players: [...match.players], sets: [...match.sets], events: [...match.events] } : null
  },

  async updateMatch(match: Match) {
    const index = store().matches.findIndex((candidate) => candidate.id === match.id)
    if (index < 0) {
      throw new Error("Match not found")
    }

    const { players, sets, events, ...scalars } = match as MatchWithDetails
    store().matches[index] = { ...store().matches[index], ...scalars }
  },

  async replaceMatchSets(matchId, sets: MatchSet[]) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) {
      throw new Error("Match not found")
    }

    match.sets = sets
  },

  async updateMatchPlayers(matchId, players: MatchPlayer[]) {
    const match = store().matches.find((candidate) => candidate.id === matchId)
    if (!match) {
      throw new Error("Match not found")
    }

    match.players = players
  },

  async addEvent(event: Omit<MatchEvent, "id" | "createdAt">) {
    const match = store().matches.find((candidate) => candidate.id === event.matchId)
    if (!match) {
      return
    }

    match.events.push({ ...event, id: randomUUID(), createdAt: now() })
  }
}

const matchupKey = (match: MatchWithDetails) => ["A", "B"].map((side) => match.players.filter((player) => player.side === side).map((player) => player.userId).sort().join("+")).sort().join("::")
