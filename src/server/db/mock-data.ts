import type { MatchEvent, MatchPlayer, MatchSet, MatchWithDetails, PlayerRating, Session, User } from "./types"

const now = new Date().toISOString()

export type MockStore = {
  users: User[]
  ratings: PlayerRating[]
  sessions: Session[]
  matches: MatchWithDetails[]
  matchPlayers: MatchPlayer[]
  matchSets: MatchSet[]
  matchEvents: MatchEvent[]
}

export const seededUsers: User[] = [
  {
    id: "u-domenico",
    email: "domenico@agilelab.it",
    firstName: "Domenico",
    lastName: "Bulfamante",
    nickname: "Dome",
    avatarUrl: "",
    officeLocation: "Torino",
    isAdmin: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  },
  {
    id: "u-luca",
    email: "luca@agilelab.it",
    firstName: "Luca",
    lastName: "Rossi",
    nickname: "Luk",
    avatarUrl: "",
    officeLocation: "Milano",
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  },
  {
    id: "u-giulia",
    email: "giulia@agilelab.it",
    firstName: "Giulia",
    lastName: "Bianchi",
    nickname: "Giu",
    avatarUrl: "",
    officeLocation: "Remote",
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  },
  {
    id: "u-marco",
    email: "marco@agilelab.it",
    firstName: "Marco",
    lastName: "Verdi",
    nickname: "Maverick",
    avatarUrl: "",
    officeLocation: "Torino",
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  }
]

export const seededMatches: MatchWithDetails[] = [
  {
    id: "m-demo-marco-luca",
    mode: "ranked",
    type: "singles",
    status: "confirmed",
    pointsToWin: 11,
    bestOf: 3,
    winnerSide: "B",
    playedAt: now,
    createdByUserId: "u-marco",
    ratingApplied: true,
    antiFarmingFactor: 1,
    submittedByUserId: "u-marco",
    confirmedByUserId: "u-luca",
    createdAt: now,
    players: [
      { matchId: "m-demo-marco-luca", userId: "u-marco", side: "A", position: 1, ratingKind: "singles", ratingBefore: 978, ratingAfter: 963, ratingDelta: -15 },
      { matchId: "m-demo-marco-luca", userId: "u-luca", side: "B", position: 1, ratingKind: "singles", ratingBefore: 1001, ratingAfter: 1016, ratingDelta: 15 }
    ],
    sets: [
      { matchId: "m-demo-marco-luca", setNumber: 1, sideAPoints: 11, sideBPoints: 8 },
      { matchId: "m-demo-marco-luca", setNumber: 2, sideAPoints: 9, sideBPoints: 11 },
      { matchId: "m-demo-marco-luca", setNumber: 3, sideAPoints: 7, sideBPoints: 11 }
    ],
    events: [
      { id: "e-demo-marco-luca-1", matchId: "m-demo-marco-luca", userId: "u-marco", type: "created", createdAt: now },
      { id: "e-demo-marco-luca-3", matchId: "m-demo-marco-luca", userId: "u-marco", type: "submitted", createdAt: now },
      { id: "e-demo-marco-luca-4", matchId: "m-demo-marco-luca", userId: "u-luca", type: "confirmed", createdAt: now }
    ]
  },
  {
    id: "m-demo-dome-giulia",
    mode: "ranked",
    type: "singles",
    status: "confirmed",
    pointsToWin: 21,
    bestOf: 3,
    winnerSide: "A",
    playedAt: now,
    createdByUserId: "u-domenico",
    ratingApplied: true,
    antiFarmingFactor: 1,
    submittedByUserId: "u-domenico",
    confirmedByUserId: "u-giulia",
    createdAt: now,
    players: [
      { matchId: "m-demo-dome-giulia", userId: "u-domenico", side: "A", position: 1, ratingKind: "singles", ratingBefore: 1030, ratingAfter: 1048, ratingDelta: 18 },
      { matchId: "m-demo-dome-giulia", userId: "u-giulia", side: "B", position: 1, ratingKind: "singles", ratingBefore: 1003, ratingAfter: 985, ratingDelta: -18 }
    ],
    sets: [
      { matchId: "m-demo-dome-giulia", setNumber: 1, sideAPoints: 21, sideBPoints: 17 },
      { matchId: "m-demo-dome-giulia", setNumber: 2, sideAPoints: 22, sideBPoints: 20 }
    ],
    events: [
      { id: "e-demo-dome-giulia-1", matchId: "m-demo-dome-giulia", userId: "u-domenico", type: "created", createdAt: now },
      { id: "e-demo-dome-giulia-3", matchId: "m-demo-dome-giulia", userId: "u-domenico", type: "submitted", createdAt: now },
      { id: "e-demo-dome-giulia-4", matchId: "m-demo-dome-giulia", userId: "u-giulia", type: "confirmed", createdAt: now }
    ]
  },
  {
    id: "m-demo-doubles",
    mode: "ranked",
    type: "doubles",
    status: "confirmed",
    pointsToWin: 11,
    bestOf: 5,
    winnerSide: "A",
    playedAt: now,
    createdByUserId: "u-domenico",
    ratingApplied: true,
    antiFarmingFactor: 1,
    submittedByUserId: "u-domenico",
    confirmedByUserId: "u-marco",
    createdAt: now,
    players: [
      { matchId: "m-demo-doubles", userId: "u-domenico", side: "A", position: 1, ratingKind: "doubles", ratingBefore: 996, ratingAfter: 1012, ratingDelta: 16 },
      { matchId: "m-demo-doubles", userId: "u-luca", side: "A", position: 2, ratingKind: "doubles", ratingBefore: 990, ratingAfter: 1006, ratingDelta: 16 },
      { matchId: "m-demo-doubles", userId: "u-giulia", side: "B", position: 1, ratingKind: "doubles", ratingBefore: 1018, ratingAfter: 1002, ratingDelta: -16 },
      { matchId: "m-demo-doubles", userId: "u-marco", side: "B", position: 2, ratingKind: "doubles", ratingBefore: 996, ratingAfter: 980, ratingDelta: -16 }
    ],
    sets: [
      { matchId: "m-demo-doubles", setNumber: 1, sideAPoints: 11, sideBPoints: 9 },
      { matchId: "m-demo-doubles", setNumber: 2, sideAPoints: 8, sideBPoints: 11 },
      { matchId: "m-demo-doubles", setNumber: 3, sideAPoints: 11, sideBPoints: 6 },
      { matchId: "m-demo-doubles", setNumber: 4, sideAPoints: 11, sideBPoints: 7 }
    ],
    events: [
      { id: "e-demo-doubles-1", matchId: "m-demo-doubles", userId: "u-domenico", type: "created", createdAt: now },
      { id: "e-demo-doubles-3", matchId: "m-demo-doubles", userId: "u-domenico", type: "submitted", createdAt: now },
      { id: "e-demo-doubles-4", matchId: "m-demo-doubles", userId: "u-marco", type: "confirmed", createdAt: now }
    ]
  }
]

export const ensureSeededMatches = (store: MockStore) => {
  seededMatches.forEach((match) => {
    if (!store.matches.some((candidate) => candidate.id === match.id)) {
      store.matches.push(match)
    }
  })
}

export const createInitialStore = (): MockStore => ({
  users: seededUsers,
  ratings: seededUsers.map((user, index) => ({
    userId: user.id,
    singlesRating: [1048, 1016, 985, 963][index] ?? 1000,
    doublesRating: [1012, 1006, 1002, 980][index] ?? 1000,
    singlesRankedMatches: [7, 6, 5, 3][index] ?? 0,
    doublesRankedMatches: [3, 4, 2, 2][index] ?? 0,
    createdAt: now,
    updatedAt: now
  })),
  sessions: [],
  matches: seededMatches.map((match) => ({ ...match, players: [...match.players], sets: [...match.sets], events: [...match.events] })),
  matchPlayers: [],
  matchSets: [],
  matchEvents: []
})
