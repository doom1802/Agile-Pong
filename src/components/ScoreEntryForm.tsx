"use client"

import { useMemo, useState } from "react"
import type { submitResult } from "@/server/actions"

type ScoreEntryFormProps = {
  action: typeof submitResult
  matchId: string
  bestOf: number | null
  sideAName: string
  sideBName: string
}

type ScoreRow = {
  a: string
  b: string
}

export function ScoreEntryForm({ action, matchId, bestOf, sideAName, sideBName }: ScoreEntryFormProps) {
  const maxSets = bestOf ?? 3
  const [scores, setScores] = useState<ScoreRow[]>(Array.from({ length: maxSets }, () => ({ a: "", b: "" })))
  const setsValue = useMemo(
    () =>
      scores
        .filter((score) => score.a.trim() && score.b.trim())
        .map((score) => `${score.a.trim()}-${score.b.trim()}`)
        .join(", "),
    [scores]
  )

  const updateScore = (index: number, side: keyof ScoreRow, value: string) => {
    setScores((current) => current.map((score, scoreIndex) => (scoreIndex === index ? { ...score, [side]: value } : score)))
  }

  return (
    <form action={action} className="score-sheet">
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
        <span className="subtle">{setsValue || "Fill completed sets, then submit."}</span>
        <button className="button" type="submit">
          Confirm sets
        </button>
      </div>
    </form>
  )
}
