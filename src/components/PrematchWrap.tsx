"use client"

import type { PointerEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { expectedScore } from "@/domain/rating"
import { displayName, signed } from "@/lib/format"
import type { MatchWithDetails, PlayerRating, User } from "@/server/db/types"
import { useUiPreferences } from "./UserPreferences"

type PrematchWrapProps = {
  match: MatchWithDetails | null
  users: User[]
  ratings: PlayerRating[]
}

const copy = {
  en: {
    close: "Close",
    tap: "Tap left/right to move",
    startMusic: "Start music",
    stopMusic: "Stop music",
    live: "Prematch on this device",
    matchReady: "Match ready",
    probability: "Win probability",
    badges: "Badges loaded",
    final: "Table is live",
    underdog: "Underdog",
    format: "Format",
    ratingGap: "Rating gap",
    projected: "Projected upset delta",
    ready: "Rules are locked. Play the match, then submit the set-by-set score."
  },
  it: {
    close: "Chiudi",
    tap: "Tap a sinistra/destra per andare avanti",
    startMusic: "Avvia musica",
    stopMusic: "Ferma musica",
    live: "Prematch su questo dispositivo",
    matchReady: "Match pronto",
    probability: "Probabilità vittoria",
    badges: "Badge caricati",
    final: "Il tavolo è live",
    underdog: "Sfavorito",
    format: "Formato",
    ratingGap: "Gap rating",
    projected: "Delta upset stimato",
    ready: "Regole bloccate. Giocate il match, poi inserite il punteggio set per set."
  }
}

export function PrematchWrap({ match, users, ratings }: PrematchWrapProps) {
  const router = useRouter()
  const [open, setOpen] = useState(Boolean(match))
  const [slideIndex, setSlideIndex] = useState(0)
  const [musicOn, setMusicOn] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const { preferences } = useUiPreferences()
  const t = copy[preferences.language]
  const stats = useMemo(() => (match ? buildStats(match, users, ratings) : null), [match, ratings, users])

  useEffect(() => {
    return () => stopMusic()
  }, [])

  if (!match || !stats || !open) {
    return null
  }

  const slides = [
    {
      eyebrow: t.matchReady,
      title: `${stats.sideAName} vs ${stats.sideBName}`,
      body: t.live,
      kind: "hero"
    },
    {
      eyebrow: t.probability,
      title: `${stats.favoriteName} ${Math.round(stats.favoriteProbability * 100)}%`,
      body: `${t.underdog}: ${stats.underdogName}`,
      kind: "probability"
    },
    {
      eyebrow: t.badges,
      title: stats.sideAName,
      body: stats.sideABadges.join(" · "),
      secondaryTitle: stats.sideBName,
      secondaryBody: stats.sideBBadges.join(" · "),
      kind: "badges"
    },
    {
      eyebrow: t.final,
      title: t.ready,
      body: `${t.projected}: ${signed(stats.underdogDelta)} · ${t.format}: ${match.pointsToWin ?? "-"} / BO${match.bestOf ?? "-"}`,
      kind: "final"
    }
  ]

  const activeSlide = slides[slideIndex]

  const close = () => {
    stopMusic()
    setOpen(false)
    window.history.replaceState(null, "", "/matches")
    router.replace("/matches")
  }

  const next = () => {
    if (slideIndex >= slides.length - 1) {
      close()
      return
    }

    setSlideIndex((current) => Math.min(slides.length - 1, current + 1))
  }
  const previous = () => setSlideIndex((current) => Math.max(0, current - 1))

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return
    if (!musicOn) startMusic()
    const half = event.currentTarget.getBoundingClientRect().width / 2
    if (event.clientX < half) previous()
    else next()
  }

  function startMusic() {
    if (musicOn) return
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) return

    const context = new AudioContextConstructor()
    audioRef.current = context
    setMusicOn(true)
    const notes = [196, 247, 294, 392, 330, 294]
    let step = 0

    const playNote = () => {
      if (!audioRef.current) return
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = "square"
      oscillator.frequency.value = notes[step % notes.length]
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
      step += 1
    }

    playNote()
    timerRef.current = window.setInterval(playNote, 220)
  }

  function stopMusic() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    audioRef.current?.close().catch(() => undefined)
    audioRef.current = null
    setMusicOn(false)
  }

  return (
    <div className="wrap-backdrop" onPointerDown={onPointer}>
      <section className={`wrap-screen wrap-slide-${activeSlide.kind}`} aria-modal="true" role="dialog">
        <button aria-label={t.close} className="wrap-close" type="button" onClick={close}>
          x
        </button>

        <div className="wrap-controls">
          <button className="button secondary" type="button" onClick={musicOn ? stopMusic : startMusic}>
            {musicOn ? t.stopMusic : t.startMusic}
          </button>
          <span className="pill gold">{t.tap}</span>
        </div>

        <div className="wrap-progress" aria-hidden>
          {slides.map((_, index) => (
            <span className={index <= slideIndex ? "active" : ""} key={index} />
          ))}
        </div>

        <div className="wrap-stage" key={slideIndex}>
          <p className="eyebrow">{activeSlide.eyebrow}</p>
          <h1>{activeSlide.title}</h1>
          <p className="wrap-subtitle">{activeSlide.body}</p>

          {activeSlide.kind === "probability" ? (
            <div className="wrap-probability">
              <span style={{ width: `${Math.round(stats.expectedA * 100)}%` }} />
            </div>
          ) : null}

          {activeSlide.kind === "badges" ? (
            <div className="wrap-badge-board">
              <BadgeColumn badges={stats.sideABadges} title={stats.sideAName} />
              <BadgeColumn badges={stats.sideBBadges} title={stats.sideBName} />
            </div>
          ) : null}

          {activeSlide.kind === "final" ? (
            <div className="wrap-stat-grid">
              <div className="wrap-stat">
                <span>{t.ratingGap}</span>
                <strong>{Math.abs(stats.ratingA - stats.ratingB)}</strong>
              </div>
              <div className="wrap-stat">
                <span>{t.projected}</span>
                <strong>{signed(stats.underdogDelta)}</strong>
              </div>
              <div className="wrap-stat">
                <span>{t.format}</span>
                <strong>{match.pointsToWin ?? "-"} / BO{match.bestOf ?? "-"}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function BadgeColumn({ title, badges }: { title: string; badges: string[] }) {
  return (
    <div className="wrap-badge-column">
      <h2>{title}</h2>
      <div>
        {badges.map((badge) => (
          <span className="wrap-badge" key={badge}>
            {badge}
          </span>
        ))}
      </div>
    </div>
  )
}

function buildStats(match: MatchWithDetails, users: User[], ratings: PlayerRating[]) {
  const kind = match.type === "singles" ? "singlesRating" : "doublesRating"
  const ratingFor = (userId: string) => ratings.find((rating) => rating.userId === userId)?.[kind] ?? 1000
  const namesForSide = (side: "A" | "B") =>
    match.players
      .filter((player) => player.side === side)
      .sort((a, b) => a.position - b.position)
      .map((player) => displayName(users.find((user) => user.id === player.userId)))
      .join(" + ")
  const playersForSide = (side: "A" | "B") => match.players.filter((player) => player.side === side)
  const ratingForSide = (side: "A" | "B") => {
    const players = playersForSide(side)
    return Math.round(players.reduce((sum, player) => sum + ratingFor(player.userId), 0) / Math.max(1, players.length))
  }
  const ratingA = ratingForSide("A")
  const ratingB = ratingForSide("B")
  const expectedA = expectedScore(ratingA, ratingB)
  const sideAName = namesForSide("A")
  const sideBName = namesForSide("B")
  const favoriteName = expectedA >= 0.5 ? sideAName : sideBName
  const underdogName = expectedA < 0.5 ? sideAName : sideBName
  const favoriteProbability = Math.max(expectedA, 1 - expectedA)
  const underdogDelta = expectedA < 0.5 ? 40 * (1 - expectedA) : 40 * expectedA

  return {
    sideAName,
    sideBName,
    ratingA,
    ratingB,
    expectedA,
    favoriteName,
    underdogName,
    favoriteProbability,
    underdogDelta,
    sideABadges: badgesForSide(playersForSide("A"), ratings),
    sideBBadges: badgesForSide(playersForSide("B"), ratings)
  }
}

function badgesForSide(players: MatchWithDetails["players"], ratings: PlayerRating[]) {
  const badges = new Set<string>()

  players.forEach((player) => {
    const rating = ratings.find((candidate) => candidate.userId === player.userId)
    const singles = rating?.singlesRating ?? 1000
    const doubles = rating?.doublesRating ?? 1000
    const matches = (rating?.singlesRankedMatches ?? 0) + (rating?.doublesRankedMatches ?? 0)

    if (singles >= 1020 || doubles >= 1020) badges.add("Top Spin")
    if (matches >= 8) badges.add("Veteran")
    if (matches < 5) badges.add("Wildcard")
    if (singles < 1000) badges.add("Underdog Energy")
  })

  if (!badges.size) badges.add("Fresh Paddle")
  if (players.length === 2) badges.add("Doubles Chemistry")

  return [...badges].slice(0, 4)
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
