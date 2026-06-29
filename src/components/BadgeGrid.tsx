import type { CSSProperties } from "react"
import type { BadgeProgress } from "@/domain/badges"

export function BadgeGrid({ badges }: { badges: BadgeProgress[] }) {
  return (
    <section className="badge-board">
      {badges.map((badge) => {
        const progress = Math.min(100, Math.round((badge.current / badge.target) * 100))

        return (
          <article className={badge.earned ? "badge-card earned" : "badge-card locked"} key={badge.id} style={{ "--badge-color": badge.color, "--badge-progress": `${progress}%` } as CSSProperties}>
            <div className="badge-emblem" aria-label={`${badge.name} progress ${progress}%`}>
              <div className="badge-medal">
                <span>{badge.earned ? badgeMark(badge.id) : `${progress}%`}</span>
              </div>
              <span className="badge-ribbon">{badge.earned ? "Unlocked" : "Chase"}</span>
            </div>
            <div>
              <div className="status-line">
                <span className={badge.earned ? "pill green" : "pill"}>{badge.earned ? "Earned" : "Locked"}</span>
              </div>
              <h2>{badge.name}</h2>
              <p>{badge.description}</p>
              <small>{badge.requirement}</small>
              <div className="badge-progress">
                <span />
              </div>
              <small>
                {Math.min(badge.current, badge.target)} / {badge.target}
              </small>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function badgeMark(id: string) {
  switch (id) {
    case "first-serve":
      return "1"
    case "ranked-regular":
      return "5"
    case "top-spin":
      return "ELO"
    case "doubles-chemistry":
      return "2V2"
    case "clean-sheet":
      return "W"
    case "long-form":
      return "BO5"
    default:
      return "AP"
  }
}
