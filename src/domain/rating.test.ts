import { describe, expect, it } from "vitest"
import { deriveWinner, expectedScore, formatMultiplier, kFactor, pointMultiplier, setMultiplier } from "./rating"
import { validateMatchSets } from "./scores"
import type { MatchSet } from "@/server/db/types"

const sets = (...scores: Array<[number, number]>): MatchSet[] => scores.map(([sideAPoints, sideBPoints], index) => ({ matchId: "test", setNumber: index + 1, sideAPoints, sideBPoints }))

describe("rating vectors", () => {
  it("uses the documented Elo expectation", () => {
    expect(expectedScore(1000, 1000)).toBe(.5)
    expect(expectedScore(1200, 1000)).toBeCloseTo(.7597, 4)
  })

  it("uses provisional, experienced, and veteran K factors", () => {
    expect(kFactor(0)).toBe(56)
    expect(kFactor(7)).toBe(56)
    expect(kFactor(8)).toBe(40)
    expect(kFactor(40)).toBe(32)
  })

  it("derives winners and set multipliers", () => {
    expect(deriveWinner(sets([11, 5], [11, 8]))).toBe("A")
    expect(setMultiplier(sets([11, 5], [11, 8]))).toBe(1.12)
    expect(setMultiplier(sets([11, 5], [11, 8], [11, 9]))).toBe(1.18)
    expect(setMultiplier(sets([11, 5], [8, 11], [11, 8], [11, 9]))).toBe(1.08)
  })

  it("normalizes point and format effects", () => {
    expect(pointMultiplier(sets([11, 9], [11, 9]))).toBeCloseTo(1.07, 2)
    expect(formatMultiplier(11)).toBe(1)
    expect(formatMultiplier(21)).toBe(1.08)
  })
})

describe("score validation", () => {
  it("accepts a completed best-of-three", () => {
    expect(() => validateMatchSets({ mode: "ranked", pointsToWin: 11, bestOf: 3 }, sets([11, 7], [9, 11], [12, 10]))).not.toThrow()
  })

  it("rejects short, incomplete, and trailing ranked sets", () => {
    expect(() => validateMatchSets({ mode: "ranked", pointsToWin: 11, bestOf: 3 }, sets([10, 8], [11, 5]))).toThrow("invalid_ranked_set")
    expect(() => validateMatchSets({ mode: "ranked", pointsToWin: 11, bestOf: 3 }, sets([11, 8]))).toThrow("insufficient_winning_sets")
    expect(() => validateMatchSets({ mode: "ranked", pointsToWin: 11, bestOf: 3 }, sets([11, 8], [11, 7], [11, 9]))).toThrow("sets_after_match_winner")
  })
})
