"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { validateMatchSets } from "@/domain/scores"
import type { Match, MatchSet } from "@/server/db/types"
import { FormSubmitButton } from "./FormSubmitButton"

type ScoreEntryFormProps = {
  action: (formData: FormData) => void | Promise<void>
  matchId: string
  mode: Match["mode"]
  pointsToWin: number | null
  bestOf: number | null
  initialSets?: MatchSet[]
  submitLabel?: string
  sideAName: string
  sideBName: string
}

type ScoreRow = {
  a: string
  b: string
}

export function ScoreEntryForm({ action, matchId, mode, pointsToWin, bestOf, initialSets = [], submitLabel = "Confirm sets", sideAName, sideBName }: ScoreEntryFormProps) {
  const maxSets = bestOf ?? 3
  const [scores, setScores] = useState<ScoreRow[]>(() => Array.from({ length: maxSets }, (_, index) => {
    const set = initialSets.find((candidate) => candidate.setNumber === index + 1)
    return set ? { a: String(set.sideAPoints), b: String(set.sideBPoints) } : { a: "", b: "" }
  }))
  const [error, setError] = useState("")
  const setsValue = useMemo(
    () =>
      scores
        .filter((score) => score.a.trim() && score.b.trim())
        .map((score) => `${score.a.trim()}-${score.b.trim()}`)
        .join(", "),
    [scores]
  )
  const resultSummary = useMemo(() => summarizeResult(scores, bestOf, sideAName, sideBName), [bestOf, scores, sideAName, sideBName])

  const updateScore = (index: number, side: keyof ScoreRow, value: string) => {
    setError("")
    setScores((current) => current.map((score, scoreIndex) => (scoreIndex === index ? { ...score, [side]: value } : score)))
  }

  const validateBeforeSubmit = (event: FormEvent<HTMLFormElement>) => {
    const sets = scores
      .filter((score) => score.a.trim() || score.b.trim())
      .map((score, index) => ({ matchId, setNumber: index + 1, sideAPoints: Number(score.a), sideBPoints: Number(score.b) }))
    try {
      if (scores.some((score) => Boolean(score.a.trim()) !== Boolean(score.b.trim()))) throw new Error("incomplete_set")
      validateMatchSets({ mode, pointsToWin, bestOf }, sets)
    } catch (validationError) {
      event.preventDefault()
      setError(scoreError(validationError, pointsToWin, bestOf))
    }
  }

  return (
    <form action={action} className="score-sheet" onSubmit={validateBeforeSubmit}>
      <input name="matchId" type="hidden" value={matchId} />
      <input name="sets" type="hidden" value={setsValue} />
      <div className="score-sheet-head">
        <span>Set</span>
        <span>{sideAName}</span>
        <span>{sideBName}</span>
      </div>
      {scores.map((score, index) => (
        <div className="score-row" key={index}>
          <strong>{index + 1}</strong>
          <input
            aria-label={`Set ${index + 1} ${sideAName} points`}
            inputMode="numeric"
            min="0"
            type="number"
            value={score.a}
            onChange={(event) => updateScore(index, "a", event.target.value)}
          />
          <input
            aria-label={`Set ${index + 1} ${sideBName} points`}
            inputMode="numeric"
            min="0"
            type="number"
            value={score.b}
            onChange={(event) => updateScore(index, "b", event.target.value)}
          />
        </div>
      ))}
      <div className="score-final">
        <span className={error ? "field-error" : "subtle"} role={error ? "alert" : undefined}>{error || resultSummary || setsValue || "Fill completed sets, then submit."}</span>
        <FormSubmitButton pendingLabel="Saving result...">{submitLabel}</FormSubmitButton>
      </div>
    </form>
  )
}

const scoreError = (error: unknown, pointsToWin: number | null, bestOf: number | null) => {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("incomplete_set")) return "Complete both scores for every set you started."
  if (message.includes("sets_after_match_winner")) return "Remove sets entered after one side had already won the match."
  if (message.includes("insufficient_winning_sets") || message.includes("sets_do_not_produce_winner")) return `One side must win ${Math.floor((bestOf ?? 3) / 2) + 1} sets.`
  if (message.includes("invalid_ranked_set")) return `Every set must reach ${pointsToWin ?? "the target"} points and be won by two.`
  if (message.includes("Add at least one set")) return "Enter at least one complete set."
  return "Check the set scores before saving."
}

const summarizeResult = (scores: ScoreRow[], bestOf: number | null, sideAName: string, sideBName: string) => {
  const completed = scores.filter((score) => score.a.trim() && score.b.trim() && Number(score.a) !== Number(score.b))
  if (!completed.length) return ""
  const sideAWins = completed.filter((score) => Number(score.a) > Number(score.b)).length
  const sideBWins = completed.length - sideAWins
  const requiredWins = Math.floor((bestOf ?? 3) / 2) + 1
  if (sideAWins >= requiredWins) return `${sideAName} wins ${sideAWins}-${sideBWins}`
  if (sideBWins >= requiredWins) return `${sideBName} wins ${sideBWins}-${sideAWins}`
  if (sideAWins === sideBWins) return `Match tied ${sideAWins}-${sideBWins}`
  return sideAWins > sideBWins ? `${sideAName} leads ${sideAWins}-${sideBWins}` : `${sideBName} leads ${sideBWins}-${sideAWins}`
}
