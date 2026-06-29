import { randomUUID } from "crypto"
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
